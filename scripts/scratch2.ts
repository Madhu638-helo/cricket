import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const session = await prisma.sessions.findFirst({
    where: { code: 'GK75P9' },
    include: { matches: true }
  })
  
  console.log(session?.matches[0].overs);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
