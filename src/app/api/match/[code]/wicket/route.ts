import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { wicketType, fielderId, scorerName, runsOffBat = 0,
          strikerId, nonStrikerId, bowlerId } = body;

  const supabase = await createServiceClient();

  const { data: session } = await supabase
    .from('sessions').select('id').eq('code', code).single();
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: match } = await supabase
    .from('matches').select('*').eq('session_id', session.id)
    .order('match_number', { ascending: false }).limit(1).single();
  if (!match) return NextResponse.json({ error: 'No match' }, { status: 404 });

  const { data: innings } = await supabase
    .from('innings').select('*').eq('match_id', match.id).eq('status', 'active').single();
  if (!innings) return NextResponse.json({ error: 'No innings' }, { status: 404 });

  // Verify scorer
  const { data: scorer } = await supabase.from('players').select('id')
    .eq('session_id', session.id).eq('team_id', innings.team_id)
    .eq('name', scorerName).eq('is_scorer', true).single();
  if (!scorer) return NextResponse.json({ error: 'Not scorer' }, { status: 403 });

  // Get delivery numbers
  const { data: allBalls } = await supabase.from('balls').select('*').eq('innings_id', innings.id);
  const balls = allBalls ?? [];
  const legalBalls = balls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
  const overNumber = Math.floor(legalBalls / 6);
  const ballInOver = legalBalls % 6;
  const deliveryNumber = balls.length + 1;

  // Insert wicket ball
  const { data: newBall, error } = await supabase.from('balls').insert({
    innings_id: innings.id,
    over_number: overNumber,
    ball_number: ballInOver + 1,
    delivery_number: deliveryNumber,
    batsman_id: strikerId,
    bowler_id: bowlerId,
    non_striker_id: nonStrikerId,
    runs_off_bat: runsOffBat,
    extras: 0,
    extra_type: null,
    is_wicket: true,
    wicket_type: wicketType,
    fielder_id: fielderId ?? null,
    is_free_hit: false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update innings
  const newWickets = innings.total_wickets + 1;
  const newRuns = innings.total_runs + runsOffBat;
  const newLegal = legalBalls + 1;
  await supabase.from('innings').update({
    total_runs: newRuns,
    total_wickets: newWickets,
    total_balls: newLegal,
  }).eq('id', innings.id);

  // Close partnership
  const { data: partner } = await supabase.from('partnerships').select('*')
    .eq('innings_id', innings.id).is('wicket_number', null).single();
  if (partner) {
    await supabase.from('partnerships').update({ wicket_number: newWickets }).eq('id', partner.id);
  }

  const allOut = newWickets >= 10;
  const overComplete = (newLegal % 6) === 0;
  const inningsOver = allOut || newLegal >= match.overs * 6;

  return NextResponse.json({
    success: true,
    ball: newBall,
    allOut,
    overComplete,
    inningsOver,
    totalWickets: newWickets,
    totalRuns: newRuns,
  });
}
