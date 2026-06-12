import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all innings and partnerships to wipe the highest score...');
  await prisma.innings.deleteMany({});
  await prisma.partnerships.deleteMany({});

  console.log('Deleting all matches except those in setup state to wipe winning teams...');
  await prisma.matches.deleteMany({
    where: {
      status: { not: 'setup' }
    }
  });

  console.log('Resetting all users stats to 0 again just to be sure...');
  await prisma.User.updateMany({
    data: { matches_played: 0, matches_won: 0, matches_lost: 0, matches_tied: 0 },
  });

  await prisma.batting_career_stats.updateMany({
    data: { matches: 0, innings: 0, runs: 0, balls_faced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, highest_score: 0, not_outs: 0, average: 0, strike_rate: 0 },
  });

  await prisma.bowling_career_stats.updateMany({
    data: { matches: 0, overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0, dot_balls: 0, economy: 0, strike_rate: 0, best_figures: "-", five_wkt_hauls: 0 },
  });

  console.log('Champions data cleared.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
