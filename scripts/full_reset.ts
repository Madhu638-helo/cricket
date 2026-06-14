import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Resetting database...');
  await prisma.balls.deleteMany({});
  await prisma.partnerships.deleteMany({});
  await prisma.innings.deleteMany({});
  await prisma.matches.deleteMany({});
  await prisma.teams.deleteMany({});
  await prisma.players.deleteMany({});
  await prisma.sessions.deleteMany({});
  
  await prisma.batting_career_stats.deleteMany({});
  await prisma.bowling_career_stats.deleteMany({});
  await prisma.fielding_career_stats.deleteMany({});

  
  await prisma.user.updateMany({
    data: {
      matches_played: 0,
      matches_won: 0,
      matches_lost: 0,
      matches_tied: 0,
    }
  });

  console.log('Database completely reset!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
