import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting ALL balls across the database to wipe leaderboard stats...');
  const delBalls = await prisma.balls.deleteMany({});
  console.log(`Deleted ${delBalls.count} balls.`);

  console.log('Finding session PTBVNP...');
  const session = await prisma.sessions.findUnique({
    where: { code: 'PTBVNP' }
  });

  if (session) {
    console.log('Checking for existing matches...');
    const existingMatches = await prisma.matches.findMany({
      where: { session_id: session.id }
    });

    if (existingMatches.length === 0) {
      console.log('No matches found. Recreating the setup match for the lobby...');
      await prisma.matches.create({
        data: {
          session_id: session.id,
          match_number: 1,
          status: 'setup',
          overs: 2,
        }
      });
      console.log('Match recreated. Lobby should now load players!');
    } else {
      console.log('Match already exists. Setting it to setup...');
      await prisma.matches.update({
        where: { id: existingMatches[0].id },
        data: { status: 'setup', overs: 2 }
      });
    }

    console.log('Ensuring session is in lobby state...');
    await prisma.sessions.update({
      where: { id: session.id },
      data: { status: 'lobby' }
    });
  } else {
    console.log('Session PTBVNP not found.');
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
