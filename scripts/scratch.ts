import { prisma } from '../src/lib/prisma';

async function main() {
  const latestSession = await prisma.sessions.findFirst({
    orderBy: { created_at: 'desc' },
  });

  if (!latestSession) {
    console.log('No active session found.');
    return;
  }

  // Find Shree Phanindra
  const newOwner = await prisma.user.findFirst({
    where: { name: { contains: 'shree phanindra', mode: 'insensitive' } }
  });

  if (newOwner) {
    await prisma.sessions.update({
      where: { id: latestSession.id },
      data: { owner_id: newOwner.id }
    });
    console.log(`Transferred ownership to ${newOwner.name}`);
  } else {
    console.log('Could not find user Shree Phanindra');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
