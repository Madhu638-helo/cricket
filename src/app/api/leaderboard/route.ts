import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUserSession } from '@/lib/auth';

type Category = 'batting' | 'bowling' | 'allrounder';

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const category = (url.searchParams.get('category') ?? 'batting') as Category;

  const supabase = await createServiceClient();

  try {
    if (category === 'batting') {
      const { data, error } = await supabase
        .from('batting_career_stats')
        .select('user_id, runs, average, strike_rate, matches, highest_score, fifties, hundreds, users(name, batting_style, player_role)')
        .order('runs', { ascending: false })
        .limit(50);

      if (error || !data) return NextResponse.json({ rankings: [] });

      const rankings = data.map((row: any, i: number) => ({
        rank: i + 1,
        name: row.users?.name ?? 'Player',
        value: `${row.runs} runs`,
        secondary: `Avg ${Number(row.average ?? 0).toFixed(1)} · SR ${Number(row.strike_rate ?? 0).toFixed(1)} · HS ${row.highest_score ?? 0}`,
        meta: row.users?.batting_style?.replace('_', ' ') ?? '',
        userId: row.user_id,
        isMe: row.user_id === session.id,
      }));

      return NextResponse.json({ rankings });
    }

    if (category === 'bowling') {
      const { data, error } = await supabase
        .from('bowling_career_stats')
        .select('user_id, wickets, economy, best_figures, maidens, matches, users(name, bowling_style, player_role)')
        .order('wickets', { ascending: false })
        .limit(50);

      if (error || !data) return NextResponse.json({ rankings: [] });

      const rankings = data.map((row: any, i: number) => ({
        rank: i + 1,
        name: row.users?.name ?? 'Player',
        value: `${row.wickets} wkts`,
        secondary: `Econ ${Number(row.economy ?? 0).toFixed(2)} · BF ${row.best_figures ?? '-'} · M ${row.maidens}`,
        meta: row.users?.bowling_style?.replace(/_/g, ' ') ?? '',
        userId: row.user_id,
        isMe: row.user_id === session.id,
      }));

      return NextResponse.json({ rankings });
    }

    // All-rounder — single batched query using Promise.all
    const [{ data: batData }, { data: bowlData }] = await Promise.all([
      supabase.from('batting_career_stats').select('user_id, runs, average, strike_rate, users(name, player_role)'),
      supabase.from('bowling_career_stats').select('user_id, wickets, economy'),
    ]);

    const batMap = new Map((batData ?? []).map((r: any) => [r.user_id, r]));
    const bowlMap = new Map((bowlData ?? []).map((r: any) => [r.user_id, r]));
    const allUsers = new Set([...batMap.keys(), ...bowlMap.keys()]);

    const scored = [...allUsers].map(uid => {
      const bat = batMap.get(uid);
      const bowl = bowlMap.get(uid);
      const bScore = ((bat?.runs ?? 0) * 0.4) + ((bat?.average ?? 0) * 0.3) + ((bat?.strike_rate ?? 0) * 0.2);
      const wScore = ((bowl?.wickets ?? 0) * 0.5) + (bowl?.economy ? (1 / bowl.economy) * 100 * 0.3 : 0);
      return { uid, name: (bat?.users as any)?.name ?? 'Player', score: bScore * 0.5 + wScore * 0.5 };
    }).sort((a, b) => b.score - a.score);

    const rankings = scored.map((s, i) => ({
      rank: i + 1,
      name: s.name,
      value: s.score.toFixed(0),
      secondary: 'All-Round Score',
      userId: s.uid,
      isMe: s.uid === session.id,
    }));

    return NextResponse.json({ rankings });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ rankings: [] });
  }
}
