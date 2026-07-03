import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

  const recentMatches = await prisma.matches.findMany({
    where: {
      created_at: {
        gte: fiveHoursAgo
      }
    },
    include: {
      teams_matches_team1_idToteams: true,
      teams_matches_team2_idToteams: true,
    }
  });

  console.log(`Found ${recentMatches.length} matches in the last 5 hours.`);
  recentMatches.forEach(m => {
    console.log(`- Match ID: ${m.id}`);
    console.log(`  Teams: ${m.teams_matches_team1_idToteams?.name} vs ${m.teams_matches_team2_idToteams?.name}`);
    console.log(`  Status: ${m.status}, Result: ${m.result}`);
    console.log(`  Created At: ${m.created_at}`);
  });
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
