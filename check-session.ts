import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.sessions.findFirst({
    where: { name: { contains: 'friday turf game', mode: 'insensitive' } },
    include: { matches: true }
  });
  console.log(JSON.stringify(session, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
