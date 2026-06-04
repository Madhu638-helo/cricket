import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const session = await prisma.sessions.findFirst({
    where: { code: 'GK75P9' },
    include: { matches: true }
  })
  
  console.log("DB overs before:", session?.matches[0].overs);
  
  if (session?.matches[0].id) {
    await prisma.matches.update({
      where: { id: session.matches[0].id },
      data: { overs: 9 }
    });
    console.log("Updated to 9 in DB");
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
