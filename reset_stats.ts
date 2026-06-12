import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting batting career stats...');
  const battingReset = await prisma.batting_career_stats.updateMany({
    data: {
      matches: 0,
      innings: 0,
      runs: 0,
      balls_faced: 0,
      fours: 0,
      sixes: 0,
      fifties: 0,
      hundreds: 0,
      highest_score: 0,
      not_outs: 0,
      average: 0,
      strike_rate: 0,
    },
  });
  console.log(`Reset ${battingReset.count} batting stats records.`);

  console.log('Resetting bowling career stats...');
  const bowlingReset = await prisma.bowling_career_stats.updateMany({
    data: {
      matches: 0,
      overs_bowled: 0,
      runs_conceded: 0,
      wickets: 0,
      maidens: 0,
      dot_balls: 0,
      economy: 0,
      strike_rate: 0,
      best_figures: "-",
      five_wkt_hauls: 0,
    },
  });
  console.log(`Reset ${bowlingReset.count} bowling stats records.`);

  console.log('Resetting fielding career stats...');
  const fieldingReset = await prisma.fielding_career_stats.updateMany({
    data: {
      catches: 0,
      dropped_catches: 0,
      run_outs: 0,
      stumpings: 0,
    },
  });
  console.log(`Reset ${fieldingReset.count} fielding stats records.`);

  console.log('Resetting User matches played/won/lost/tied...');
  const userReset = await prisma.User.updateMany({
    data: {
      matches_played: 0,
      matches_won: 0,
      matches_lost: 0,
      matches_tied: 0,
    },
  });
  console.log(`Reset ${userReset.count} user match records.`);

  console.log('All stats have been successfully reset to zero.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
