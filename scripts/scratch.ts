import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const players = await prisma.players.findMany({
    where: {
      name: {
        contains: 'Brendon',
        mode: 'insensitive'
      }
    }
  })
  
  console.log("Found players:", players)
  
  if (players.length > 0) {
    const p = players[0];
    const res = await prisma.players.update({
      where: { id: p.id },
      data: { name: 'Shamith' }
    });
    console.log("Updated:", res);
  } else {
    console.log("No player found");
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
