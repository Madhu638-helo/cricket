import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        batting_career_stats: true,
        bowling_career_stats: true,
      }
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // To get daily stats, find the most recent day they played a match.
    const recentMatch = await prisma.matches.findFirst({
      where: { 
        status: 'result', 
        innings: { 
          some: { 
            balls: { 
              some: { 
                players_balls_batsman_idToplayers: { user_id: user.id } 
              } 
            } 
          } 
        } 
      },
      orderBy: { created_at: 'desc' },
      select: { created_at: true }
    });

    let dailyBatting = { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
    let dailyBowling = { wickets: 0, runsConceded: 0, legalBalls: 0, economy: 0 };
    let matchCount = 0;
    let targetDateStr = null;

    if (recentMatch) {
      const targetDate = new Date(recentMatch.created_at);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      targetDateStr = startOfDay.toISOString();

      // Find all matches on that day
      const dailyMatches = await prisma.matches.findMany({
        where: {
          status: 'result',
          created_at: { gte: startOfDay, lte: endOfDay },
          sessions: {
            players: { some: { user_id: user.id } }
          }
        },
        select: { id: true, session_id: true }
      });

      matchCount = dailyMatches.length;
      const matchIds = dailyMatches.map(m => m.id);
      const sessionIds = dailyMatches.map(m => m.session_id);

      if (matchIds.length > 0) {
        // Fetch players for this user in these sessions
        const userPlayers = await prisma.players.findMany({
          where: { user_id: user.id, session_id: { in: sessionIds } },
          select: { id: true }
        });
        const userPlayerIds = userPlayers.map(p => p.id);

        if (userPlayerIds.length > 0) {
          // Fetch all balls for this user in these matches
          const userBallsAsBatsman = await prisma.balls.findMany({
            where: { innings: { match_id: { in: matchIds } }, batsman_id: { in: userPlayerIds } }
          });

          const userBallsAsBowler = await prisma.balls.findMany({
            where: { innings: { match_id: { in: matchIds } }, bowler_id: { in: userPlayerIds } }
          });

        dailyBatting.runs = userBallsAsBatsman.reduce((acc, b) => acc + (b.runs_off_bat || 0), 0);
        dailyBatting.balls = userBallsAsBatsman.filter(b => b.extra_type !== 'wide').length;
        dailyBatting.fours = userBallsAsBatsman.filter(b => b.runs_off_bat === 4).length;
        dailyBatting.sixes = userBallsAsBatsman.filter(b => b.runs_off_bat === 6).length;
        dailyBatting.strikeRate = dailyBatting.balls > 0 ? (dailyBatting.runs / dailyBatting.balls) * 100 : 0;

        dailyBowling.runsConceded = userBallsAsBowler.reduce((acc, b) => acc + (b.runs_off_bat || 0) + (b.extras || 0), 0);
        dailyBowling.legalBalls = userBallsAsBowler.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
        dailyBowling.wickets = userBallsAsBowler.filter(b => b.is_wicket && b.wicket_type !== 'runout').length;
          dailyBowling.economy = dailyBowling.legalBalls > 0 ? (dailyBowling.runsConceded / (dailyBowling.legalBalls / 6)) : 0;
        }
      }
    }

    return NextResponse.json({
      user: { name: userData.name, username: userData.username, mvps: userData.mvps },
      career: {
        batting: userData.batting_career_stats,
        bowling: userData.bowling_career_stats,
      },
      daily: {
        date: targetDateStr,
        matches: matchCount,
        batting: dailyBatting,
        bowling: dailyBowling
      }
    });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
