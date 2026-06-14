import { prisma } from '../src/lib/prisma';

async function main() {
  const session = await prisma.sessions.findUnique({
    where: { code: 'MKQJZY' }
  });

  if (!session) {
    console.log('Session MKQJZY not found.');
    return;
  }

  const result = await prisma.players.updateMany({
    where: {
      session_id: session.id,
      name: {
        in: ['Shree Phanindra', 'Pratham Mavani']
      }
    },
    data: {
      is_scorer: true
    }
  });

  console.log(`Updated ${result.count} player(s) to be scorers.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
