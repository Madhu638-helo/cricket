import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserSession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { balls = [], sessionId, matchId, inningsId, battingTeamId, catchDrops = [] } = body;

  const sessionData = await getUserSession();
  if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!sessionId || !matchId || !inningsId || !battingTeamId) {
    return NextResponse.json({ error: 'Missing required context IDs' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Perform all validation lookups in a single parallel batch
  const [
    { data: session },
    { data: match },
    { data: innings },
    { data: playerMe },
    { data: teamPlayers },
    { data: currentPartnership }
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('code', code).eq('id', sessionId).single(),
    supabase.from('matches').select('*').eq('id', matchId).single(),
    supabase.from('innings').select('*').eq('id', inningsId).eq('status', 'active').single(),
    supabase.from('players').select('*').eq('session_id', sessionId).eq('user_id', sessionData.id).maybeSingle(),
    // Non-joker batting team players only — jokers added separately to avoid double-count
    supabase.from('players').select('id').eq('team_id', battingTeamId).eq('is_joker', false),
    supabase.from('partnerships').select('id,runs,balls,batsman1_id,batsman2_id').eq('innings_id', inningsId).is('wicket_number', null).maybeSingle()
  ]);

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (!match) return NextResponse.json({ error: 'No active match' }, { status: 404 });
  if (!innings) return NextResponse.json({ error: 'No active innings' }, { status: 404 });

  // Verify scorer (must be in batting team and have is_scorer = true, OR be the owner with is_scorer)
  const isOwner = playerMe?.user_id === session.owner_id;
  const isBattingTeamScorer = playerMe?.is_scorer;
  const isOwnerScorer = playerMe?.is_scorer && isOwner;

  if (!isBattingTeamScorer && !isOwnerScorer) {
    return NextResponse.json({ error: 'Not authorised as batting team scorer' }, { status: 403 });
  }

  if (balls.length === 0) {
    return NextResponse.json({ error: 'No balls provided' }, { status: 400 });
  }

  const { data: jokerPlayers } = await supabase
    .from('players').select('id').eq('session_id', sessionId).eq('is_joker', true);
  const allOutLimit = ((teamPlayers?.length ?? 0) + (jokerPlayers?.length ?? 0)) || 10;

  let currentRuns = innings.total_runs;
  let currentExtras = innings.total_extras;
  let currentBalls = innings.total_balls;
  let currentWickets = innings.total_wickets;

  // Batch insert all balls
  const ballInserts = balls.map((b: any) => ({
    innings_id: innings.id,
    over_number: b.over_number,
    ball_number: b.ball_number,
    delivery_number: b.delivery_number,
    batsman_id: b.batsman_id,
    bowler_id: b.bowler_id,
    non_striker_id: b.non_striker_id === 'single' ? null : b.non_striker_id,
    runs_off_bat: b.runs_off_bat,
    extras: b.extras,
    extra_type: b.extra_type,
    is_wicket: b.is_wicket,
    wicket_type: b.wicket_type,
    fielder_id: b.fielder_id,
    is_free_hit: b.is_free_hit,
    // Ball speed from camera — nullable, set by camera operator
    ...(b.ball_speed_kmh != null ? { ball_speed_kmh: Number(b.ball_speed_kmh) } : {}),
  }));
  const { data: insertedBalls, error: ballError } = await supabase.from('balls').insert(ballInserts).select();
  if (ballError) throw new Error(ballError.message);

  // Process totals and partnership
  const partnershipOps: any[] = [];
  
  let pId = currentPartnership?.id;
  let pRuns = currentPartnership?.runs ?? 0;
  let pBalls = currentPartnership?.balls ?? 0;
  let pBatsman1 = currentPartnership?.batsman1_id;
  let pBatsman2 = currentPartnership?.batsman2_id;
  let pIsNew = !currentPartnership;
  let pClosed = false;

  for (const b of balls) {
    const isExtraLegal = b.extra_type !== 'wide' && b.extra_type !== 'noball';
    currentRuns += b.runs_off_bat + b.extras;
    currentExtras += b.extras;
    if (isExtraLegal) currentBalls += 1;

    // If previous ball was a wicket, commit the closed partnership and start a new one
    if (pClosed) {
      if (pIsNew) {
         partnershipOps.push(supabase.from('partnerships').insert({
            innings_id: innings.id,
            batsman1_id: pBatsman1,
            batsman2_id: pBatsman2,
            runs: pRuns,
            balls: pBalls,
            wicket_number: currentWickets,
         }));
      } else {
         partnershipOps.push(supabase.from('partnerships').update({
            runs: pRuns,
            balls: pBalls,
            wicket_number: currentWickets,
         }).eq('id', pId));
      }
      pIsNew = true;
      pClosed = false;
      pRuns = 0;
      pBalls = 0;
      pBatsman1 = b.batsman_id;
      pBatsman2 = b.non_striker_id === 'single' ? null : b.non_striker_id;
    }

    if (pIsNew && !pBatsman1) {
      pBatsman1 = b.batsman_id;
      pBatsman2 = b.non_striker_id === 'single' ? null : b.non_striker_id;
    }

    pRuns += b.runs_off_bat + b.extras;
    if (isExtraLegal) pBalls += 1;

    if (b.is_wicket) {
      currentWickets += 1;
      pClosed = true;
    }
  }

  // Final partnership state to save
  if (pIsNew) {
     partnershipOps.push(supabase.from('partnerships').insert({
        innings_id: innings.id,
        batsman1_id: pBatsman1,
        batsman2_id: pBatsman2,
        runs: pRuns,
        balls: pBalls,
        wicket_number: pClosed ? currentWickets : null,
     }));
  } else {
     partnershipOps.push(supabase.from('partnerships').update({
        runs: pRuns,
        balls: pBalls,
        wicket_number: pClosed ? currentWickets : null,
     }).eq('id', pId));
  }

  const inningsUpdateOp = supabase.from('innings').update({
    total_runs: currentRuns,
    total_balls: currentBalls,
    total_extras: currentExtras,
    total_wickets: currentWickets,
  }).eq('id', innings.id);

  // Use insertedBalls (with real DB-assigned IDs) so viewer dedup by .id works correctly
  const tickerOp = supabase.from('score_tickers').upsert({
    session_id: session.id,
    data: {
      new_balls: insertedBalls ?? ballInserts,
      innings_update: { id: innings.id, total_runs: currentRuns, total_balls: currentBalls, total_extras: currentExtras, total_wickets: currentWickets },
      match_update: { id: match.id, status: match.status }
    }
  }, { onConflict: 'session_id' });

  await Promise.all([...partnershipOps, inningsUpdateOp, tickerOp]);

  const targetChased = innings.innings_number === 2 && innings.target != null && currentRuns >= innings.target;
  const inningsOver = (currentBalls >= match.overs * 6) || (currentWickets >= allOutLimit) || targetChased;

  // Update dropped_catches in fielding_career_stats for each catch drop this over
  if (catchDrops.length > 0) {
    const dropPlayerIds = catchDrops.map((d: any) => d.fielderId).filter(Boolean);
    if (dropPlayerIds.length > 0) {
      const { data: dropPlayers } = await supabase
        .from('players').select('id, user_id').in('id', dropPlayerIds).not('user_id', 'is', null);
      if (dropPlayers && dropPlayers.length > 0) {
        const dropUserIds = dropPlayers.map((p: any) => p.user_id);
        const { data: existingStats } = await supabase
          .from('fielding_career_stats').select('user_id, dropped_catches').in('user_id', dropUserIds);
        const statsMap = new Map((existingStats ?? []).map((s: any) => [s.user_id, s]));
        await Promise.all(dropPlayers.map(async (p: any) => {
          const dropCount = catchDrops.filter((d: any) => d.fielderId === p.id).length;
          const existing = statsMap.get(p.user_id);
          if (existing) {
            await supabase.from('fielding_career_stats').update({
              dropped_catches: (existing.dropped_catches ?? 0) + dropCount,
            }).eq('user_id', p.user_id);
          } else {
            await supabase.from('fielding_career_stats').insert({ user_id: p.user_id, dropped_catches: dropCount });
          }
        }));
      }
    }
  }

  return NextResponse.json({
    success: true,
    inningsOver,
    totalRuns: currentRuns,
    totalBalls: currentBalls,
    totalWickets: currentWickets,
  });
}
