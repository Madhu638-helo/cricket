import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const session = await prisma.sessions.findFirst({
    where: { code: 'GK75P9' },
    include: { matches: true }
  })
  
  if (!session || !session.matches[0]) return;
  const matchId = session.matches[0].id;
  const sessionName = session.name || "Test Session";

  const payload = {
    action: 'update_match_details',
    data: { matchId, overs: 10, sessionName }
  };
  
  console.log("Simulating API payload:", payload);
  
  // Try directly using prisma to mimic the supabase query
  const m = await prisma.matches.findUnique({ where: { id: matchId }});
  if (m && ['setup', 'toss'].includes(m.status)) {
    await prisma.matches.update({ where: { id: matchId }, data: { overs: payload.data.overs } });
    console.log("Successfully simulated update!");
  } else {
    console.log("Failed to update because status is", m?.status);
  }
}

main().finally(async () => await prisma.$disconnect());
