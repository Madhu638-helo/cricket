import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserSession } from '@/lib/auth';
import { generateMatchCode } from '@/lib/cricket/engine';

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { sessionName, overs, team1, team2, ground, matchDate, matchTime } = body;

  if (!team1 || !team2) {
    return NextResponse.json({ error: 'Missing team names' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  try {
    let code = '';
    let tries = 0;
    do {
      code = generateMatchCode();
      const { data: existing } = await supabase.from('sessions').select('id').eq('code', code).maybeSingle();
      if (!existing) break;
      tries++;
    } while (tries < 5);

    const { data: sess, error: sessionError } = await supabase.from('sessions').insert({
      code,
      name: sessionName || `${team1} vs ${team2}`,
      owner_id: session.id,
      status: 'lobby',
      ground: ground || null,
      match_date: matchDate || null,
      match_time: matchTime || null,
    }).select().single();

    if (!sess || sessionError) {
      throw new Error(sessionError?.message || 'Failed to create session');
    }

    const { data: t1 } = await supabase.from('teams').insert({ session_id: sess.id, name: team1 }).select().single();
    const { data: t2 } = await supabase.from('teams').insert({ session_id: sess.id, name: team2 }).select().single();

    if (!t1 || !t2) throw new Error('Failed to create teams');

    await supabase.from('players').insert({
      session_id: sess.id,
      user_id: session.id,
      name: session.name || 'Owner',
      is_scorer: true,
      team_id: t1.id
    });

    const { data: match } = await supabase.from('matches').insert({
      session_id: sess.id,
      match_number: 1,
      overs: parseInt(overs) || 5,
      team1_id: t1.id,
      team2_id: t2.id,
      status: 'setup',
      is_paused: false
    }).select().single();

    if (!match) throw new Error('Failed to create match');

    return NextResponse.json({ code });
  } catch (err: any) {
    console.error('Create match error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
