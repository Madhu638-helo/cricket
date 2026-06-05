import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateMatchCode } from '@/lib/cricket/engine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { action, data = {} } = body;

  const supabase = await createServiceClient();

  const { data: session } = await supabase
    .from('sessions').select('*').eq('code', code).single();
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  switch (action) {

    // Admin: set toss result + batting first
    case 'set_toss': {
      const { tossWinnerId, decision, matchId } = data;
      const { data: match } = await supabase.from('matches').select('team1_id,team2_id').eq('id', matchId).single();
      const battingFirst = decision === 'bat' ? tossWinnerId
        : (match?.team1_id === tossWinnerId ? match?.team2_id : match?.team1_id);

      await supabase.from('matches').update({
        toss_winner_id: tossWinnerId,
        toss_decision: decision,
        batting_first: battingFirst,
        status: 'innings_1',
      }).eq('id', matchId);

      // Create innings 1
      const { data: innings1 } = await supabase.from('innings').insert({
        match_id: matchId,
        team_id: battingFirst,
        innings_number: 1,
        status: 'active',
      }).select().single();

      // Create first partnership
      if (data.opener1Id && data.opener2Id && innings1) {
        await supabase.from('partnerships').insert({
          innings_id: innings1.id,
          batsman1_id: data.opener1Id,
          batsman2_id: data.opener2Id,
          runs: 0, balls: 0,
        });
      }

      return NextResponse.json({ success: true });
    }

    // Admin: start match directly in innings_1 without toss
    case 'admin_start_match': {
      const { overs, team1Id, team2Id, matchNumber, battingTeamId } = data;
      
      // Create the match
      const { data: newMatch } = await supabase.from('matches').insert({
        session_id: session.id,
        match_number: matchNumber,
        overs,
        team1_id: team1Id,
        team2_id: team2Id,
        status: 'innings_1',
        batting_first: battingTeamId,
      }).select().single();

      if (newMatch) {
        // Create first innings
        await supabase.from('innings').insert({
          match_id: newMatch.id,
          team_id: battingTeamId,
          innings_number: 1,
          status: 'active',
        });
      }

      await supabase.from('sessions').update({ status: 'active' }).eq('id', session.id);
      return NextResponse.json({ success: true, match: newMatch });
    }

    // Innings end → set target or match result
    case 'innings_end': {
      const { inningsId, matchId } = data;
      const { data: innings } = await supabase.from('innings').select('*').eq('id', inningsId).single();
      if (!innings) return NextResponse.json({ error: 'Innings not found' }, { status: 404 });

      await supabase.from('innings').update({ status: 'complete' }).eq('id', inningsId);

      const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

      if (innings.innings_number === 1) {
        // Set target for innings 2
        const target = innings.total_runs + 1;
        await supabase.from('matches').update({ status: 'innings_break' }).eq('id', matchId);
        return NextResponse.json({ success: true, target, inningsBreak: true });
      } else {
        // Match over — determine result
        const { data: innings1 } = await supabase
          .from('innings').select('*').eq('match_id', matchId).eq('innings_number', 1).single();
        const { data: innings2 } = await supabase
          .from('innings').select('*').eq('match_id', matchId).eq('innings_number', 2).single();

        const team1Runs = innings1?.total_runs ?? 0;
        const team2Runs = innings2?.total_runs ?? 0;
        const battingTeamId = innings2?.team_id;
        const bowlingTeamId = match.team1_id === battingTeamId ? match.team2_id : match.team1_id;

        // Prefetch team names + chasing team player count in parallel
        const [{ data: battingTeamData }, { data: bowlingTeamData }, { count: chasingPlayerCount }] = await Promise.all([
          supabase.from('teams').select('name').eq('id', battingTeamId).single(),
          supabase.from('teams').select('name').eq('id', bowlingTeamId).single(),
          supabase.from('players').select('id', { count: 'exact', head: true }).eq('team_id', battingTeamId).eq('session_id', session.id),
        ]);
        // In cricket, a team can only lose (teamSize - 1) wickets before being all-out
        const maxWickets = (chasingPlayerCount ?? 11) - 1;

        let result: string;
        let winnerId: string | null;

        if (team2Runs > team1Runs) {
          const wicketsLeft = maxWickets - (innings2?.total_wickets ?? 0);
          result = `${battingTeamData?.name ?? 'Batting team'} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
          winnerId = battingTeamId!;
        } else if (team1Runs > team2Runs) {
          const runMargin = team1Runs - team2Runs;
          result = `${bowlingTeamData?.name ?? 'Bowling team'} won by ${runMargin} runs`;
          winnerId = bowlingTeamId!;
        } else {
          result = 'Match tied';
          winnerId = null;
        }

        await supabase.from('matches').update({ status: 'result', result, winner_id: winnerId }).eq('id', matchId);

        // Update career stats — batch fetch existing stats before loop
        const { data: matchBalls } = await supabase.from('balls').select('*')
          .in('innings_id', [innings1?.id, innings2?.id].filter(Boolean));
        const { data: matchPlayers } = await supabase.from('players')
          .select('id,user_id,name').eq('session_id', session.id).not('user_id', 'is', null);

        if (matchBalls && matchPlayers) {
          const userIds = matchPlayers.map((p: any) => p.user_id);

          // Batch fetch all existing career stats in 3 queries total (not per-player)
          const [{ data: allBatting }, { data: allBowling }, { data: allFielding }] = await Promise.all([
            supabase.from('batting_career_stats').select('*').in('user_id', userIds),
            supabase.from('bowling_career_stats').select('*').in('user_id', userIds),
            supabase.from('fielding_career_stats').select('*').in('user_id', userIds),
          ]);

          const battingMap = new Map((allBatting ?? []).map((r: any) => [r.user_id, r]));
          const bowlingMap = new Map((allBowling ?? []).map((r: any) => [r.user_id, r]));
          const fieldingMap = new Map((allFielding ?? []).map((r: any) => [r.user_id, r]));

          // Run all player stat updates in parallel — each player is independent
          await Promise.all(matchPlayers.map(async (p: any) => {
            if (!p.user_id) return;
            const pBalls = matchBalls.filter((b: any) => b.batsman_id === p.id);
            const bowledBalls = matchBalls.filter((b: any) => b.bowler_id === p.id);
            const fielderWickets = matchBalls.filter((b: any) => b.is_wicket && b.fielder_id === p.id);

            const runs = pBalls.reduce((s: number, b: any) => s + (b.runs_off_bat || 0), 0);
            const ballsFaced = pBalls.filter((b: any) => b.extra_type !== 'wide').length;
            const fours = pBalls.filter((b: any) => b.runs_off_bat === 4).length;
            const sixes = pBalls.filter((b: any) => b.runs_off_bat === 6).length;
            const isOut = matchBalls.some((b: any) => b.is_wicket && b.batsman_id === p.id);

            const legalBowled = bowledBalls.filter((b: any) => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
            const runsGiven = bowledBalls.reduce((s: number, b: any) => s + (b.runs_off_bat || 0) + (b.extras || 0), 0);
            const wicketsTaken = bowledBalls.filter((b: any) => b.is_wicket && b.wicket_type !== 'runout').length;

            // 5-wkt haul counted per innings, not per match total
            const wktInn1 = bowledBalls.filter((b: any) => b.is_wicket && b.wicket_type !== 'runout' && b.innings_id === innings1?.id).length;
            const wktInn2 = bowledBalls.filter((b: any) => b.is_wicket && b.wicket_type !== 'runout' && b.innings_id === innings2?.id).length;
            const fiveWktHaulInMatch = (wktInn1 >= 5 ? 1 : 0) + (wktInn2 >= 5 ? 1 : 0);

            // Maiden detection per bowler
            const overGroups = new Map<number, any[]>();
            bowledBalls.forEach((b: any) => {
              const arr = overGroups.get(b.over_number) ?? [];
              arr.push(b);
              overGroups.set(b.over_number, arr);
            });
            let maidensThisMatch = 0;
            overGroups.forEach(overBalls => {
              const legalInOver = overBalls.filter((b: any) => b.extra_type !== 'wide' && b.extra_type !== 'noball');
              if (legalInOver.length === 6) {
                const r = overBalls.reduce((s: number, b: any) => s + b.runs_off_bat + b.extras, 0);
                if (r === 0) maidensThisMatch++;
              }
            });

            if (runs > 0 || ballsFaced > 0) {
              const existing = battingMap.get(p.user_id);
              if (existing) {
                const newRuns = existing.runs + runs;
                const newBalls = existing.balls_faced + ballsFaced;
                const newInnings = existing.innings + 1;
                const newNotOuts = existing.not_outs + (isOut ? 0 : 1);
                const outs = newInnings - newNotOuts;
                await supabase.from('batting_career_stats').update({
                  runs: newRuns, balls_faced: newBalls, innings: newInnings,
                  fours: existing.fours + fours, sixes: existing.sixes + sixes,
                  fifties: existing.fifties + (runs >= 50 && runs < 100 ? 1 : 0),
                  hundreds: existing.hundreds + (runs >= 100 ? 1 : 0),
                  highest_score: Math.max(existing.highest_score, runs),
                  not_outs: newNotOuts,
                  matches: existing.matches + 1,
                  average: outs > 0 ? Math.round((newRuns / outs) * 100) / 100 : newRuns,
                  strike_rate: newBalls > 0 ? Math.round((newRuns / newBalls) * 10000) / 100 : 0,
                  updated_at: new Date().toISOString(),
                }).eq('user_id', p.user_id);
              } else {
                await supabase.from('batting_career_stats').insert({
                  user_id: p.user_id, matches: 1, innings: 1, runs, balls_faced: ballsFaced,
                  fours, sixes,
                  fifties: runs >= 50 && runs < 100 ? 1 : 0,
                  hundreds: runs >= 100 ? 1 : 0,
                  highest_score: runs,
                  not_outs: isOut ? 0 : 1,
                  average: isOut ? runs : 0,
                  strike_rate: ballsFaced > 0 ? Math.round((runs / ballsFaced) * 10000) / 100 : 0,
                });
              }
            }

            if (legalBowled > 0) {
              const existing = bowlingMap.get(p.user_id);
              // Convert cricket overs format to total balls, add, convert back — avoids decimal math bug
              const existingBalls = existing
                ? Math.floor(Number(existing.overs_bowled)) * 6 + Math.round((Number(existing.overs_bowled) % 1) * 10)
                : 0;
              const totalBalls = existingBalls + legalBowled;
              const newOvers = parseFloat(`${Math.floor(totalBalls / 6)}.${totalBalls % 6}`);
              const newRuns = (existing?.runs_conceded ?? 0) + runsGiven;
              const newWkts = (existing?.wickets ?? 0) + wicketsTaken;
              const existingBestWkts = parseInt(existing?.best_figures?.split('/')[0] ?? '0', 10);
              const isBetterFigure = wicketsTaken > existingBestWkts ||
                (wicketsTaken === existingBestWkts && runsGiven < parseInt(existing?.best_figures?.split('/')[1] ?? '9999', 10));
              const bestFig = wicketsTaken > 0 && isBetterFigure ? `${wicketsTaken}/${runsGiven}` : (existing?.best_figures ?? '-');

              if (existing) {
                await supabase.from('bowling_career_stats').update({
                  matches: existing.matches + 1,
                  overs_bowled: newOvers,
                  runs_conceded: newRuns,
                  wickets: newWkts,
                  maidens: existing.maidens + maidensThisMatch,
                  economy: totalBalls > 0 ? Math.round((newRuns / (totalBalls / 6)) * 100) / 100 : 0,
                  five_wkt_hauls: existing.five_wkt_hauls + fiveWktHaulInMatch,
                  best_figures: bestFig,
                  strike_rate: newWkts > 0 ? Math.round((totalBalls / newWkts) * 10) / 10 : 0,
                  updated_at: new Date().toISOString(),
                }).eq('user_id', p.user_id);
              } else {
                await supabase.from('bowling_career_stats').insert({
                  user_id: p.user_id, matches: 1, overs_bowled: newOvers,
                  runs_conceded: runsGiven, wickets: wicketsTaken,
                  maidens: maidensThisMatch,
                  economy: legalBowled > 0 ? Math.round((runsGiven / (legalBowled / 6)) * 100) / 100 : 0,
                  five_wkt_hauls: fiveWktHaulInMatch,
                  best_figures: wicketsTaken > 0 ? `${wicketsTaken}/${runsGiven}` : '-',
                  strike_rate: wicketsTaken > 0 ? Math.round((legalBowled / wicketsTaken) * 10) / 10 : 0,
                });
              }
            }

            if (fielderWickets.length > 0) {
              const catches = fielderWickets.filter((b: any) => b.wicket_type === 'caught').length;
              const runOuts = fielderWickets.filter((b: any) => b.wicket_type === 'runout').length;
              const stumpings = fielderWickets.filter((b: any) => b.wicket_type === 'stumped').length;
              const existing = fieldingMap.get(p.user_id);
              if (existing) {
                await supabase.from('fielding_career_stats').update({
                  catches: existing.catches + catches,
                  run_outs: existing.run_outs + runOuts,
                  stumpings: existing.stumpings + stumpings,
                  updated_at: new Date().toISOString(),
                }).eq('user_id', p.user_id);
              } else {
                await supabase.from('fielding_career_stats').insert({ user_id: p.user_id, catches, run_outs: runOuts, stumpings });
              }
            }
          }));
        }

        return NextResponse.json({ success: true, result, matchOver: true });
      }
    }

    // Start innings 2
    case 'start_innings_2': {
      const { matchId, battingTeamId, opener1Id, opener2Id, bowlerId } = data;
      const target = data.target;

      await supabase.from('matches').update({ status: 'innings_2' }).eq('id', matchId);

      const { data: innings2 } = await supabase.from('innings').insert({
        match_id: matchId,
        team_id: battingTeamId,
        innings_number: 2,
        status: 'active',
        target,
      }).select().single();

      if (innings2 && opener1Id && opener2Id) {
        await supabase.from('partnerships').insert({
          innings_id: innings2.id,
          batsman1_id: opener1Id,
          batsman2_id: opener2Id,
          runs: 0, balls: 0,
        });
      }

      return NextResponse.json({ success: true, innings2Id: innings2?.id });
    }

    // New match in same session
    case 'new_match': {
      const { overs, team1Id, team2Id, matchNumber } = data;
      const { data: newMatch } = await supabase.from('matches').insert({
        session_id: session.id,
        match_number: matchNumber,
        overs,
        team1_id: team1Id,
        team2_id: team2Id,
        status: 'toss',
      }).select().single();

      await supabase.from('sessions').update({ status: 'active' }).eq('id', session.id);
      return NextResponse.json({ success: true, match: newMatch });
    }

    // End session
    case 'end_session': {
      await supabase.from('sessions').update({ status: 'finished' }).eq('id', session.id);
      return NextResponse.json({ success: true });
    }

    // Start innings 1 (from setup screen)
    case 'start_innings_1': {
      const { matchId, battingTeamId, opener1Id, opener2Id, bowlerId } = data;

      await supabase.from('matches').update({ status: 'innings_1', batting_first: battingTeamId }).eq('id', matchId);

      const { data: innings1 } = await supabase.from('innings').insert({
        match_id: matchId,
        team_id: battingTeamId,
        innings_number: 1,
        status: 'active',
      }).select().single();

      if (innings1 && opener1Id && opener2Id) {
        await supabase.from('partnerships').insert({
          innings_id: innings1.id,
          batsman1_id: opener1Id,
          batsman2_id: opener2Id,
          runs: 0, balls: 0,
        });
      }

      await supabase.from('sessions').update({ status: 'active' }).eq('id', session.id);
      return NextResponse.json({ success: true, innings1Id: innings1?.id });
    }

    // Pause match
    case 'pause_match': {
      const { matchId } = data;
      await supabase.from('matches').update({ is_paused: true }).eq('id', matchId);
      return NextResponse.json({ success: true });
    }

    // Resume match
    case 'resume_match': {
      const { matchId } = data;
      await supabase.from('matches').update({ is_paused: false }).eq('id', matchId);
      return NextResponse.json({ success: true });
    }

    // Cancel match
    case 'cancel_match': {
      const { matchId } = data;
      await supabase.from('matches').update({ status: 'result', result: 'Match Cancelled' }).eq('id', matchId);
      return NextResponse.json({ success: true });
    }

    // Approve/reject player join
    case 'approve_player': {
      const { playerId, approved } = data;
      await supabase.from('players').update({
        approval_status: approved ? 'approved' : 'rejected',
      }).eq('id', playerId);
      return NextResponse.json({ success: true });
    }

    // Mid-game team assignment
    case 'assign_player': {
      const { playerId, teamId } = data;
      // Only owner should do this, but we'll assume caller is verified or owner
      await supabase.from('players').update({
        team_id: teamId,
      }).eq('id', playerId);
      return NextResponse.json({ success: true });
    }

    // Transfer scorer role
    case 'transfer_scorer': {
      const { currentScorerId, newScorerId } = data;
      // Atomically remove from old, give to new
      await supabase.from('players').update({ is_scorer: false }).eq('id', currentScorerId);
      await supabase.from('players').update({ is_scorer: true }).eq('id', newScorerId);
      return NextResponse.json({ success: true });
    }

    // Reset all player team assignments for rearranging teams
    case 'reset_teams': {
      await supabase.from('players').update({
        team_id: null, is_captain: false, is_scorer: false, is_joker: false,
      }).eq('session_id', session.id);
      await supabase.from('sessions').update({ status: 'lobby' }).eq('id', session.id);
      return NextResponse.json({ success: true });
    }

    case 'auto_close': {
      const { matchId } = data;
      // Only close if still in an active state (not already result)
      const { data: m } = await supabase.from('matches').select('status').eq('id', matchId).single();
      if (m && m.status !== 'result' && m.status !== 'setup') {
        await supabase.from('matches').update({ status: 'result', result: 'Match ended (time expired)' }).eq('id', matchId);
        await supabase.from('sessions').update({ status: 'finished' }).eq('id', session.id);
        await supabase.from('innings').update({ status: 'complete' }).eq('match_id', matchId).neq('status', 'complete');
      }
      return NextResponse.json({ success: true });
    }

    case 'undo_last_over': {
      const { inningsId, matchId } = data;
      const { data: innings } = await supabase.from('innings').select('*').eq('id', inningsId).single();
      if (!innings || innings.status !== 'active') {
        return NextResponse.json({ error: 'Cannot undo in inactive innings' }, { status: 400 });
      }

      // Find the highest over number
      const { data: maxOverQuery } = await supabase.from('balls')
        .select('over_number')
        .eq('innings_id', inningsId)
        .order('over_number', { ascending: false })
        .limit(1)
        .single();
        
      if (!maxOverQuery) {
        return NextResponse.json({ error: 'No overs to undo' }, { status: 400 });
      }
      
      const lastOverNumber = maxOverQuery.over_number;
      
      // Delete the balls of the last over
      await supabase.from('balls').delete().eq('innings_id', inningsId).eq('over_number', lastOverNumber);
      
      // Fetch all remaining balls to rebuild innings stats and current partnership
      const { data: remainingBalls } = await supabase.from('balls')
        .select('*')
        .eq('innings_id', inningsId)
        .order('delivery_number', { ascending: true });
        
      let totalRuns = 0;
      let totalBalls = 0;
      let totalWickets = 0;
      let totalExtras = 0;
      
      let pRuns = 0;
      let pBalls = 0;
      let pBat1 = '';
      let pBat2: string | null = null;
      
      if (remainingBalls && remainingBalls.length > 0) {
        for (const b of remainingBalls) {
          totalRuns += b.runs_off_bat + b.extras;
          totalExtras += b.extras;
          if (b.extra_type !== 'wide' && b.extra_type !== 'noball') totalBalls++;
          if (b.is_wicket) totalWickets++;
        }
        
        // Walk backwards to find where the current partnership started
        // A new partnership begins on the ball AFTER a wicket falls
        let partnershipStartIdx = 0; // default: no wickets → whole innings is one partnership
        for (let i = remainingBalls.length - 1; i >= 0; i--) {
          if (remainingBalls[i].is_wicket) {
            // The wicket ball itself belongs to the PREVIOUS partnership.
            // Current partnership begins from the next ball.
            partnershipStartIdx = i + 1;
            break;
          }
        }
        
        // Walk FORWARD from the partnership start to accumulate correct stats
        for (let i = partnershipStartIdx; i < remainingBalls.length; i++) {
          const b = remainingBalls[i];
          pRuns += b.runs_off_bat + b.extras;
          if (b.extra_type !== 'wide' && b.extra_type !== 'noball') pBalls++;
        }
        
        // Identify the two batsmen from the last ball of the innings.
        // If the last remaining ball is a wicket, that batsman is dismissed.
        // The surviving batsman (non_striker) becomes pBat1; pBat2 unknown (selected in undone over).
        const lastBall = remainingBalls[remainingBalls.length - 1];
        if (lastBall.is_wicket) {
          pBat1 = lastBall.non_striker_id && lastBall.non_striker_id !== 'single'
            ? lastBall.non_striker_id
            : lastBall.batsman_id;
          pBat2 = null;
        } else {
          pBat1 = lastBall.batsman_id;
          pBat2 = lastBall.non_striker_id === 'single' ? null : (lastBall.non_striker_id ?? null);
        }
      }

      // Update Innings
      await supabase.from('innings').update({
        total_runs: totalRuns,
        total_balls: totalBalls,
        total_extras: totalExtras,
        total_wickets: totalWickets,
      }).eq('id', inningsId);
      
      // Delete all OPEN partnerships and recreate the correct one
      await supabase.from('partnerships').delete().eq('innings_id', inningsId).is('wicket_number', null);
      
      if (remainingBalls && remainingBalls.length > 0) {
        await supabase.from('partnerships').insert({
          innings_id: inningsId,
          batsman1_id: pBat1,
          batsman2_id: pBat2,
          runs: pRuns,
          balls: pBalls,
          wicket_number: null
        });
      }

      // Broadcast the state update via score_tickers
      const { data: match } = await supabase.from('matches').select('id,status').eq('id', matchId).single();
      if (match) {
        await supabase.from('score_tickers').upsert({
          session_id: session.id,
          data: {
            // Emitting empty new_balls forces the client to rely on its local state truncation if we had one
            // Wait, we need to tell the client to refetch balls or we can just send a flag
            reload_balls: true,
            innings_update: { id: inningsId, total_runs: totalRuns, total_balls: totalBalls, total_extras: totalExtras, total_wickets: totalWickets },
            match_update: { id: matchId, status: match.status }
          }
        }, { onConflict: 'session_id' });
      }

      return NextResponse.json({ success: true });
    }

    // Remove player entirely from session (hard delete)
    case 'remove_player': {
      const { playerId } = data;
      // Verify player belongs to this session before deleting
      const { data: player } = await supabase.from('players').select('id').eq('id', playerId).eq('session_id', session.id).single();
      if (!player) return NextResponse.json({ error: 'Player not found in this session' }, { status: 404 });
      await supabase.from('players').delete().eq('id', playerId).eq('session_id', session.id);
      return NextResponse.json({ success: true });
    }

    // Remove player from team (back to unassigned pool)
    case 'remove_player_from_team': {
      const { playerId } = data;
      await supabase.from('players').update({
        team_id: null, is_captain: false, is_joker: false,
      }).eq('id', playerId).eq('session_id', session.id);
      return NextResponse.json({ success: true });
    }

    // Change overs count (only allowed during innings_1 or innings_break)
    case 'update_overs': {
      const { matchId, overs } = data;
      if (!overs || overs < 1 || overs > 50) {
        return NextResponse.json({ error: 'Invalid overs value' }, { status: 400 });
      }
      const { data: m } = await supabase.from('matches').select('status').eq('id', matchId).single();
      if (!m || !['innings_1', 'innings_break'].includes(m.status)) {
        return NextResponse.json({ error: 'Can only change overs before 2nd innings starts' }, { status: 400 });
      }
      await supabase.from('matches').update({ overs }).eq('id', matchId);
      return NextResponse.json({ success: true });
    }

    // Update match details (name + overs) before innings start
    case 'update_match_details': {
      const { matchId, overs, sessionName } = data;
      if (sessionName !== undefined) {
        await supabase.from('sessions').update({ name: sessionName }).eq('id', session.id);
      }
      if (overs !== undefined && overs !== null && overs > 0) {
        // If we have a specific matchId, update it directly
        if (matchId) {
          const { data: m } = await supabase.from('matches').select('status').eq('id', matchId).single();
          // Allow overs update mid-game to extend the match. Only block if the match is already completely finished.
          const lockedStatuses = ['result'];
          if (m && !lockedStatuses.includes(m.status)) {
            await supabase.from('matches').update({ overs }).eq('id', matchId);
          }
        } else {
          // No specific matchId — update the most recent match for this session
          const { data: latestMatch } = await supabase
            .from('matches')
            .select('id, status')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestMatch) {
            const lockedStatuses = ['result'];
            if (!lockedStatuses.includes(latestMatch.status)) {
              await supabase.from('matches').update({ overs }).eq('id', latestMatch.id);
            }
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // Update match schedule (date/time)
    case 'update_match_schedule': {
      const { matchDate, matchTime } = data;
      await supabase.from('sessions').update({
        match_date: matchDate,
        match_time: matchTime,
      }).eq('id', session.id);
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
