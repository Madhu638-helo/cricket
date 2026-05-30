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
      // Fetch all users and all batting stats separately, then merge
      const [{ data: allUsers }, { data: batStats }] = await Promise.all([
        supabase.from('users').select('id, name, batting_style, player_role'),
        supabase.from('batting_career_stats').select('*'),
      ]);

      if (!allUsers) return NextResponse.json({ rankings: [] });

      const statsMap = new Map((batStats ?? []).map((r: any) => [r.user_id, r]));

      const rankings = allUsers
        .map(u => {
          const s = statsMap.get(u.id);
          return {
            userId: u.id,
            name: u.name ?? 'Player',
            runs: s?.runs ?? 0,
            average: Number(s?.average ?? 0),
            strike_rate: Number(s?.strike_rate ?? 0),
            highest_score: s?.highest_score ?? 0,
            matches: s?.matches ?? 0,
            battingStyle: u.batting_style?.replace('_', ' ') ?? '',
            isMe: u.id === session.id,
          };
        })
        .sort((a, b) => b.runs - a.runs || b.average - a.average)
        .map((r, i) => ({
          rank: i + 1,
          name: r.name,
          value: `${r.runs} runs`,
          secondary: `Avg ${r.average.toFixed(1)} · SR ${r.strike_rate.toFixed(1)} · HS ${r.highest_score}`,
          meta: r.battingStyle,
          userId: r.userId,
          isMe: r.isMe,
        }));

      return NextResponse.json({ rankings });
    }

    if (category === 'bowling') {
      const [{ data: allUsers }, { data: bowlStats }] = await Promise.all([
        supabase.from('users').select('id, name, bowling_style, player_role'),
        supabase.from('bowling_career_stats').select('*'),
      ]);

      if (!allUsers) return NextResponse.json({ rankings: [] });

      const statsMap = new Map((bowlStats ?? []).map((r: any) => [r.user_id, r]));

      const rankings = allUsers
        .map(u => {
          const s = statsMap.get(u.id);
          return {
            userId: u.id,
            name: u.name ?? 'Player',
            wickets: s?.wickets ?? 0,
            economy: Number(s?.economy ?? 0),
            best_figures: s?.best_figures ?? '-',
            maidens: s?.maidens ?? 0,
            matches: s?.matches ?? 0,
            bowlingStyle: u.bowling_style?.replace(/_/g, ' ') ?? '',
            isMe: u.id === session.id,
          };
        })
        .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
        .map((r, i) => ({
          rank: i + 1,
          name: r.name,
          value: `${r.wickets} wkts`,
          secondary: `Econ ${r.economy.toFixed(2)} · BF ${r.best_figures} · M ${r.maidens}`,
          meta: r.bowlingStyle,
          userId: r.userId,
          isMe: r.isMe,
        }));

      return NextResponse.json({ rankings });
    }

    // All-rounder — merge all users with both stats tables
    const [{ data: allUsers }, { data: batData }, { data: bowlData }] = await Promise.all([
      supabase.from('users').select('id, name, player_role'),
      supabase.from('batting_career_stats').select('user_id, runs, average, strike_rate'),
      supabase.from('bowling_career_stats').select('user_id, wickets, economy'),
    ]);

    if (!allUsers) return NextResponse.json({ rankings: [] });

    const batMap = new Map((batData ?? []).map((r: any) => [r.user_id, r]));
    const bowlMap = new Map((bowlData ?? []).map((r: any) => [r.user_id, r]));

    const scored = allUsers.map(u => {
      const bat = batMap.get(u.id);
      const bowl = bowlMap.get(u.id);
      const bScore = ((bat?.runs ?? 0) * 0.4) + ((Number(bat?.average ?? 0)) * 0.3) + ((Number(bat?.strike_rate ?? 0)) * 0.2);
      const wScore = ((bowl?.wickets ?? 0) * 0.5) + (bowl?.economy ? (1 / Number(bowl.economy)) * 100 * 0.3 : 0);
      return { uid: u.id, name: u.name ?? 'Player', score: bScore * 0.5 + wScore * 0.5, isMe: u.id === session.id };
    }).sort((a, b) => b.score - a.score);

    const rankings = scored.map((s, i) => ({
      rank: i + 1,
      name: s.name,
      value: s.score.toFixed(0),
      secondary: 'All-Round Score',
      userId: s.uid,
      isMe: s.isMe,
    }));

    return NextResponse.json({ rankings });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ rankings: [] });
  }
}

