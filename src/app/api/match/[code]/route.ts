import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const sessionUser = await getUserSession();
  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: 'Match code is required' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  try {
    const { data: session, error: se } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (se || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('session_id', session.id)
      .neq('status', 'abandoned')
      .order('match_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!match) {
      return NextResponse.json({
        session,
        match: null,
        innings: [],
        balls: [],
        players: [],
        teams: []
      });
    }

    const { data: innings } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', match.id);

    const inningsIds = (innings ?? []).map((i: any) => i.id);

    const [{ data: balls }, { data: players }, { data: teams }] = await Promise.all([
      inningsIds.length > 0
        ? supabase.from('balls').select('*').in('innings_id', inningsIds).order('delivery_number', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase.from('players').select('*').eq('session_id', session.id),
      supabase.from('teams').select('*').eq('session_id', session.id),
    ]);

    return NextResponse.json({
      session,
      match,
      innings: innings ?? [],
      balls: balls ?? [],
      players: players ?? [],
      teams: teams ?? []
    });
  } catch (err: any) {
    console.error('Error fetching match details:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
