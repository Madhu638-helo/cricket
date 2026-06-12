import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const sessionCode = 'PTBVNP';
  const session = await prisma.sessions.findUnique({
    where: { code: sessionCode },
    include: { teams: true },
  });

  if (!session) {
    console.error(`Session with code ${sessionCode} not found.`);
    process.exit(1);
  }

  console.log(`Found session ${sessionCode} with ${session.teams.length} teams.`);

  for (const team of session.teams) {
    const testPlayerName = `TestPlayer_${team.name.replace(/\s+/g, '')}`;
    
    // Check if a test player already exists to avoid duplicates
    const existingPlayer = await prisma.players.findFirst({
        where: {
            session_id: session.id,
            team_id: team.id,
            name: testPlayerName
        }
    });

    if (existingPlayer) {
        console.log(`Player ${testPlayerName} already exists in team ${team.name}`);
        continue;
    }

    const player = await prisma.players.create({
      data: {
        session_id: session.id,
        team_id: team.id,
        name: testPlayerName,
        role: 'PLAYER',
        player_status: 'PLAYING',
        approval_status: 'approved',
      },
    });
    console.log(`Added player ${player.name} to team ${team.name}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
