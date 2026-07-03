import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserSession } from '@/lib/auth';

export async function POST(request: Request) {
  const sessionUser = await getUserSession();
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { code } = body;

  if (!code || code.length < 4) {
    return NextResponse.json({ error: 'Valid match code is required' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  try {
    const { data: sess, error: sessErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (sessErr || !sess) {
      return NextResponse.json({ error: 'No match found with that code' }, { status: 404 });
    }

    // Check if already in the match
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('session_id', sess.id)
      .eq('user_id', sessionUser.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('players').insert({
        session_id: sess.id,
        user_id: sessionUser.id,
        name: sessionUser.name || 'Player',
        is_scorer: false,
        is_joker: false,
        is_captain: false
      });
    }

    // Get match status to return to client for routing
    const { data: match } = await supabase
      .from('matches')
      .select('status')
      .eq('session_id', sess.id)
      .order('match_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      status: match?.status || 'setup'
    });
  } catch (err: any) {
    console.error('Join match error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
