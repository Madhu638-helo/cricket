import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSession } from '@/lib/auth';

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.id;

    // Fetch user stats and all their sessions in a single query!
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        batting_career_stats: true,
        bowling_career_stats: true,
        fielding_career_stats: true,
        players: {
          include: {
            sessions: {
              include: {
                teams: true,
                matches: {
                  orderBy: { match_number: 'desc' },
                  take: 1,
                  include: {
                    innings: {
                      orderBy: { innings_number: 'desc' },
                      take: 1
                    }
                  }
                },
                players: true // for joined player count
              }
            }
          }
        }
      }
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stats = {
      runs: userData.batting_career_stats?.runs || 0,
      wickets: userData.bowling_career_stats?.wickets || 0,
      catches: userData.fielding_career_stats?.catches || 0,
      mvps: 0 // Mock MVPs as it wasn't strictly requested but we can keep the placeholder if needed
    };

    const playerEntries = userData.players;

    const liveMatches: any[] = [];
    const upcomingMatches: any[] = [];
    const processedSessionIds = new Set();

    for (const entry of playerEntries) {
      const s = entry.sessions;
      if (!s || processedSessionIds.has(s.id)) continue;
      if (s.status === 'finished') continue;
      
      processedSessionIds.add(s.id);

      const team1 = s.teams[0];
      const team2 = s.teams[1];
      const match = s.matches[0];
      const matchName = s.name || `${team1?.name || 'Team 1'} vs ${team2?.name || 'Team 2'}`;

      if (s.status === 'active' || (match && (['innings_1', 'innings_2', 'innings_break'].includes(match.status)))) {
        let runs = 0, wickets = 0, overs = '0.0', crr = 0, target = 0;
        
        if (match && match.innings && match.innings.length > 0) {
          const inning = match.innings[match.innings.length - 1]; // get latest
          runs = inning.total_runs || 0;
          wickets = inning.total_wickets || 0;
          const balls = inning.total_balls || 0;
          const ov = Math.floor(balls / 6);
          const rem = balls % 6;
          overs = `${ov}.${rem}`;
          const oversDec = balls / 6;
          crr = oversDec > 0 ? runs / oversDec : 0;
          target = inning.target || 0;
        }

        // Estimate end time: overs * 4min/over * innings remaining
        const completedInnings = match?.innings?.filter((i: any) => i.status === 'complete').length ?? 0;
        const inningsLeft = Math.max(1, 2 - completedInnings);
        const estimatedMinutes = (match?.overs ?? 20) * 4 * inningsLeft;
        const startMs = new Date(s.created_at).getTime();
        const expectedEndAt = new Date(startMs + estimatedMinutes * 60 * 1000).toISOString();

        // Determine batting/bowling team from active innings
        const activeInning = match?.innings?.find((i: any) => i.status === 'active');
        const activeTeamId = activeInning?.team_id;
        const battingTeam = s.teams.find((t: any) => t.id === activeTeamId) ?? team1;
        const bowlingTeam = s.teams.find((t: any) => t.id !== activeTeamId) ?? team2;

        liveMatches.push({
          code: s.code,
          matchName,
          runs,
          wickets,
          overs,
          crr: crr.toFixed(2),
          target,
          battingTeamName: battingTeam?.name || 'Batting Team',
          bowlingTeamName: bowlingTeam?.name || 'Bowling Team',
          expectedEndAt,
        });
      } else if (s.status === 'lobby') {
        // Format date and time from session
        let dateStr = '';
        if (s.match_date) {
          const d = new Date(s.match_date);
          const today = new Date();
          const todayStr = today.toISOString().slice(0, 10);
          const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
          const matchStr = d.toISOString().slice(0, 10);
          if (matchStr === todayStr) dateStr = 'Today';
          else if (matchStr === tomorrowStr) dateStr = 'Tomorrow';
          else dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
        }
        let timeStr = '';
        if (s.match_time) {
          try {
            const [h, m] = s.match_time.toISOString().slice(11, 16).split(':');
            const hr = parseInt(h);
            timeStr = `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
          } catch {
            timeStr = '';
          }
        }

        const overs = match?.overs ?? 20;
        let formatLabel = `${overs} Ov`;
        if (overs === 20) formatLabel = 'T20';

        upcomingMatches.push({
          code: s.code,
          matchName,
          date: dateStr || null,
          time: timeStr || null,
          ground: s.ground || null,
          format: formatLabel,
          aside: `${Math.ceil(s.players.length / 2)}v${Math.ceil(s.players.length / 2)}`,
          playerCount: s.players.length,
          players: s.players.slice(0, 3).map(p => ({ id: p.id, name: p.name, team_id: p.team_id }))
        });
      }
    }

    return NextResponse.json({ stats, liveMatches, upcomingMatches });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
