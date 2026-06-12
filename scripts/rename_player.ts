import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const players = await prisma.players.findMany({
    where: {
      name: {
        contains: 'Brendon',
        mode: 'insensitive'
      }
    }
  });
  
  console.log("Found players:", players);
  
  if (players.length > 0) {
    for (const p of players) {
      const res = await prisma.players.update({
        where: { id: p.id },
        data: { name: 'Shamith' }
      });
      console.log("Updated:", res.id, res.name);
    }
  } else {
    console.log("No player found");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
