import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();
async function main() {
  const session = await prisma.sessions.findUnique({ where: { code: 'SEED02' }});
  const match = await prisma.matches.findFirst({ where: { session_id: session.id }});
  const innings = await prisma.innings.findMany({ where: { match_id: match.id }});
  const inn1 = innings.find(i => i.innings_number === 1);
  const balls = await prisma.balls.findMany({ where: { innings_id: inn1?.id }});
  console.log("Innings 1 Balls count:", balls.length);
  console.log("Match status:", match.status);
}
main().catch(console.error).finally(() => prisma.$disconnect());
