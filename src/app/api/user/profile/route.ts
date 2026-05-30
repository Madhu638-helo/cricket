import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserSession } from '@/lib/auth';

export async function GET() {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServiceClient();

  // Single query — user row + all 3 career stat tables joined
  const [
    { data: user },
    { data: bat },
    { data: bowl },
    { data: field },
    { data: recentPlayers },
  ] = await Promise.all([
    supabase.from('users').select('id,name,username,batting_style,bowling_style,player_role,batting_position,jersey_number,bio,preferred_ground,date_of_birth,created_at').eq('id', session.id).single(),
    supabase.from('batting_career_stats').select('*').eq('user_id', session.id).single(),
    supabase.from('bowling_career_stats').select('*').eq('user_id', session.id).single(),
    supabase.from('fielding_career_stats').select('*').eq('user_id', session.id).single(),
    supabase.from('players').select('session_id, joined_at, sessions(id,name,code,created_at,status,match_date,match_time)').eq('user_id', session.id).order('joined_at', { ascending: false }).limit(10),
  ]);

  return NextResponse.json({
    user,
    batting: bat ?? null,
    bowling: bowl ?? null,
    fielding: field ?? null,
    recentMatches: (recentPlayers ?? []).map((p: any) => p.sessions).filter(Boolean),
  });
}

export async function PATCH(request: Request) {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const allowed = ['batting_style','bowling_style','player_role','batting_position','jersey_number','bio','preferred_ground','date_of_birth'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const supabase = await createServiceClient();
  const { error } = await supabase.from('users').update(update).eq('id', session.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
