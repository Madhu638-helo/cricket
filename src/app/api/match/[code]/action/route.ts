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
      const batsFirst = decision === 'bat' ? tossWinnerId
        : (await supabase.from('matches').select('team1_id,team2_id').eq('id', matchId).single())
            .data?.[tossWinnerId === (await supabase.from('matches').select('team1_id').eq('id', matchId).single()).data?.team1_id ? 'team2_id' : 'team1_id'];

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

        let result: string;
        let winnerId: string | null;

        if (team2Runs > team1Runs) {
          const wicketsLeft = 10 - (innings2?.total_wickets ?? 0);
          result = `${(await supabase.from('teams').select('name').eq('id', battingTeamId).single()).data?.name} won by ${wicketsLeft} wickets`;
          winnerId = battingTeamId!;
        } else if (team1Runs > team2Runs) {
          const runMargin = team1Runs - team2Runs;
          result = `${(await supabase.from('teams').select('name').eq('id', bowlingTeamId).single()).data?.name} won by ${runMargin} runs`;
          winnerId = bowlingTeamId!;
        } else {
          result = 'Match tied';
          winnerId = null;
        }

        await supabase.from('matches').update({ status: 'result', result, winner_id: winnerId }).eq('id', matchId);
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

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
