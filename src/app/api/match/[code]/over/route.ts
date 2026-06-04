import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserSession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { balls = [] } = body;

  const sessionData = await getUserSession();
  if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServiceClient();

  // Get session by code
  const { data: session } = await supabase
    .from('sessions').select('*').eq('code', code).single();
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Get active match
  const { data: match } = await supabase
    .from('matches').select('*').eq('session_id', session.id)
    .order('match_number', { ascending: false }).limit(1).single();
  if (!match) return NextResponse.json({ error: 'No active match' }, { status: 404 });

  // Get active innings
  const { data: innings } = await supabase
    .from('innings').select('*').eq('match_id', match.id).eq('status', 'active').single();
  if (!innings) return NextResponse.json({ error: 'No active innings' }, { status: 404 });

  // Verify scorer (must be in batting team and have is_scorer = true)
  const { data: playerMe } = await supabase
    .from('players').select('*')
    .eq('session_id', session.id)
    .eq('user_id', sessionData.id)
    .single();

  const isBattingTeamScorer = playerMe?.is_scorer && playerMe?.team_id === innings.team_id;

  if (!isBattingTeamScorer) {
    return NextResponse.json({ error: 'Not authorised as batting team scorer' }, { status: 403 });
  }

  if (balls.length === 0) {
    return NextResponse.json({ error: 'No balls provided' }, { status: 400 });
  }

  // Get all players for this team to determine all-out limit
  const { data: teamPlayers } = await supabase
    .from('players').select('id')
    .eq('team_id', innings.team_id).eq('is_joker', false);
  const allOutLimit = (teamPlayers && teamPlayers.length > 0) ? teamPlayers.length - 1 : 10;

  let currentRuns = innings.total_runs;
  let currentExtras = innings.total_extras;
  let currentBalls = innings.total_balls;
  let currentWickets = innings.total_wickets;

  // Fetch current open partnership once before loop
  let { data: currentPartnership } = await supabase
    .from('partnerships').select('id,runs,balls,batsman1_id,batsman2_id')
    .eq('innings_id', innings.id).is('wicket_number', null).single();

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
  const { error: ballError } = await supabase.from('balls').insert(ballInserts);
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

  const tickerOp = supabase.from('score_tickers').upsert({
    session_id: session.id,
    data: {
      new_balls: ballInserts,
      innings_update: { id: innings.id, total_runs: currentRuns, total_balls: currentBalls, total_extras: currentExtras, total_wickets: currentWickets },
      match_update: { id: match.id, status: match.status }
    }
  }, { onConflict: 'session_id' });

  await Promise.all([...partnershipOps, inningsUpdateOp, tickerOp]);

  const targetChased = innings.innings_number === 2 && innings.target != null && currentRuns >= innings.target;
  const inningsOver = (currentBalls >= match.overs * 6) || (currentWickets >= allOutLimit) || targetChased;

  return NextResponse.json({
    success: true,
    inningsOver,
    totalRuns: currentRuns,
    totalBalls: currentBalls,
    totalWickets: currentWickets,
  });
}
