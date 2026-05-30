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

  // Verify scorer (must be in batting team and have is_scorer = true, OR be session owner)
  const isOwner = session.owner_id === sessionData.id;
  
  const { data: playerMe } = await supabase
    .from('players').select('*')
    .eq('session_id', session.id)
    .eq('user_id', sessionData.id)
    .single();

  const isBattingTeamScorer = playerMe?.is_scorer && playerMe?.team_id === innings.team_id;

  if (!isBattingTeamScorer && !isOwner) {
    return NextResponse.json({ error: 'Not authorised as batting team scorer' }, { status: 403 });
  }

  if (balls.length === 0) {
    return NextResponse.json({ error: 'No balls provided' }, { status: 400 });
  }

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
  }));
  const { error: ballError } = await supabase.from('balls').insert(ballInserts);
  if (ballError) throw new Error(ballError.message);

  // Process totals and partnership in a single pass (no per-ball DB calls)
  let partnershipRuns = currentPartnership?.runs ?? 0;
  let partnershipBalls = currentPartnership?.balls ?? 0;
  let lastWicketBall: (typeof balls)[0] | null = null;

  for (const b of balls) {
    const isExtraLegal = b.extra_type !== 'wide' && b.extra_type !== 'noball';
    currentRuns += b.runs_off_bat + b.extras;
    currentExtras += b.extras;
    if (isExtraLegal) currentBalls += 1;
    if (b.is_wicket) {
      currentWickets += 1;
      lastWicketBall = b;
    }
    partnershipRuns += b.runs_off_bat + b.extras;
    if (isExtraLegal) partnershipBalls += 1;
  }

  // Upsert partnership + update innings totals in parallel
  const partnershipOp = !currentPartnership
    ? supabase.from('partnerships').insert({
        innings_id: innings.id,
        batsman1_id: balls[0].batsman_id,
        batsman2_id: balls[0].non_striker_id === 'single' ? null : balls[0].non_striker_id,
        runs: partnershipRuns,
        balls: partnershipBalls,
        wicket_number: lastWicketBall ? currentWickets : null,
      })
    : supabase.from('partnerships').update({
        runs: partnershipRuns,
        balls: partnershipBalls,
        wicket_number: lastWicketBall ? currentWickets : null,
      }).eq('id', currentPartnership.id);

  const inningsUpdateOp = supabase.from('innings').update({
    total_runs: currentRuns,
    total_balls: currentBalls,
    total_extras: currentExtras,
    total_wickets: currentWickets,
  }).eq('id', innings.id);

  await Promise.all([partnershipOp, inningsUpdateOp]);

  const inningsOver = (currentBalls >= match.overs * 6) || (currentWickets >= 10);

  return NextResponse.json({
    success: true,
    inningsOver,
    totalRuns: currentRuns,
    totalBalls: currentBalls,
    totalWickets: currentWickets,
  });
}
