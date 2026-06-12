import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding session PTBVNP...');
  const session = await prisma.sessions.findUnique({
    where: { code: 'PTBVNP' }
  });

  if (session) {
    console.log('Session found. Deleting matches (and cascading to innings, balls, partnerships)...');
    const deleteMatches = await prisma.matches.deleteMany({
      where: { session_id: session.id }
    });
    console.log(`Deleted ${deleteMatches.count} matches.`);

    console.log('Setting session status back to lobby...');
    await prisma.sessions.update({
      where: { id: session.id },
      data: { status: 'lobby' }
    });
  } else {
    console.log('Session PTBVNP not found.');
  }

  console.log('Deleting all rankings...');
  const delRankings = await prisma.rankings.deleteMany({});
  console.log(`Deleted ${delRankings.count} rankings.`);

  console.log('Deleting all leaderboards...');
  const delLeaderboards = await prisma.leaderboards.deleteMany({});
  console.log(`Deleted ${delLeaderboards.count} leaderboards.`);

  console.log('Resetting batting career stats...');
  await prisma.batting_career_stats.updateMany({
    data: { matches: 0, innings: 0, runs: 0, balls_faced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, highest_score: 0, not_outs: 0, average: 0, strike_rate: 0 },
  });

  console.log('Resetting bowling career stats...');
  await prisma.bowling_career_stats.updateMany({
    data: { matches: 0, overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0, dot_balls: 0, economy: 0, strike_rate: 0, best_figures: "-", five_wkt_hauls: 0 },
  });

  console.log('Resetting fielding career stats...');
  await prisma.fielding_career_stats.updateMany({
    data: { catches: 0, dropped_catches: 0, run_outs: 0, stumpings: 0 },
  });

  console.log('Resetting User match records...');
  await prisma.User.updateMany({
    data: { matches_played: 0, matches_won: 0, matches_lost: 0, matches_tied: 0 },
  });

  console.log('Hard reset complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
