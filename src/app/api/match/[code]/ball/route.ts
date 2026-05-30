import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { runsOffBat = 0, extraType, extraRuns = 0, scorerName } = body;

  const supabase = await createServiceClient();

  // Get session by code
  const { data: session } = await supabase
    .from('sessions').select('id').eq('code', code).single();
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

  // Verify scorer
  const { data: scorer } = await supabase
    .from('players').select('*').eq('session_id', session.id)
    .eq('team_id', innings.team_id).eq('name', scorerName).eq('is_scorer', true).single();
  if (!scorer) return NextResponse.json({ error: 'Not authorised as scorer' }, { status: 403 });

  // Get all balls for this innings to determine current state
  const { data: allBalls } = await supabase
    .from('balls').select('*').eq('innings_id', innings.id)
    .order('delivery_number', { ascending: true });
  const balls = allBalls ?? [];

  // Determine over/ball numbers
  const isExtra = extraType === 'wide' || extraType === 'noball';
  const legalBalls = balls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
  const overNumber = Math.floor(legalBalls / 6);
  const ballInOver = legalBalls % 6;
  const ballNumber = isExtra ? ballInOver : ballInOver + 1;
  const deliveryNumber = balls.length + 1;

  // Get last ball to determine batsmen/bowler
  const lastBall = balls[balls.length - 1];

  // Require at least batting state to exist
  const { data: batsmanRow } = await supabase
    .from('players').select('id').eq('session_id', session.id)
    .eq('team_id', innings.team_id).limit(1).single();

  // Get current batsmen from match state (stored in metadata or last ball)
  if (!lastBall && !body.strikerId) {
    return NextResponse.json({ error: 'Opening batsmen not set. Use action endpoint first.' }, { status: 400 });
  }

  const strikerId = body.strikerId ?? lastBall?.batsman_id;
  const nonStrikerId = body.nonStrikerId ?? lastBall?.non_striker_id;
  const bowlerId = body.bowlerId ?? lastBall?.bowler_id;

  if (!strikerId || !nonStrikerId || !bowlerId) {
    return NextResponse.json({ error: 'Missing batsman/bowler IDs' }, { status: 400 });
  }

  // Check free hit (previous ball was no-ball)
  const isFreehit = lastBall?.extra_type === 'noball';

  // Insert ball
  const { data: newBall, error: ballError } = await supabase.from('balls').insert({
    innings_id: innings.id,
    over_number: overNumber,
    ball_number: ballNumber,
    delivery_number: deliveryNumber,
    batsman_id: strikerId,
    bowler_id: bowlerId,
    non_striker_id: nonStrikerId,
    runs_off_bat: runsOffBat,
    extras: extraRuns,
    extra_type: extraType ?? null,
    is_wicket: false,
    is_free_hit: isFreehit,
  }).select().single();

  if (ballError) {
    return NextResponse.json({ error: ballError.message }, { status: 500 });
  }

  // Update innings totals
  const newLegal = isExtra ? legalBalls : legalBalls + 1;
  const newRuns = innings.total_runs + runsOffBat + extraRuns;
  const newExtras = innings.total_extras + extraRuns;

  await supabase.from('innings').update({
    total_runs: newRuns,
    total_balls: newLegal,
    total_extras: newExtras,
  }).eq('id', innings.id);

  // Update partnership
  const { data: currentPartnership } = await supabase
    .from('partnerships').select('*').eq('innings_id', innings.id)
    .is('wicket_number', null).single();
  if (currentPartnership) {
    await supabase.from('partnerships').update({
      runs: currentPartnership.runs + runsOffBat + extraRuns,
      balls: currentPartnership.balls + (isExtra ? 0 : 1),
    }).eq('id', currentPartnership.id);
  }

  // Check over end (after legal delivery, ballInOver becomes 5 → 6th legal ball)
  const newBallInOver = newLegal % 6;
  const overComplete = !isExtra && ballNumber === 6;

  // Strike rotation on odd runs (not wide/noball)
  let newStrikerId = strikerId;
  let newNonStrikerId = nonStrikerId;
  if (!isExtra && runsOffBat % 2 === 1) {
    newStrikerId = nonStrikerId;
    newNonStrikerId = strikerId;
  }
  if (overComplete) {
    // Auto-rotate strike at over end
    [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
  }

  // Check innings end (all overs bowled OR 10 wickets)
  const inningsOver = (newLegal >= match.overs * 6) || (innings.total_wickets >= 10);

  return NextResponse.json({
    success: true,
    ball: newBall,
    overComplete,
    inningsOver,
    newStrikerId,
    newNonStrikerId,
    bowlerId,
    totalRuns: newRuns,
    totalBalls: newLegal,
  });
}
