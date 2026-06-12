import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();
async function main() {
  const session = await prisma.sessions.findUnique({ where: { code: 'SEED02' }});
  if (!session) return console.log("Session not found");
  
  const match = await prisma.matches.findFirst({ where: { session_id: session.id }});
  const innings = await prisma.innings.findFirst({ where: { match_id: match.id, status: 'active' }});
  const players = await prisma.players.findMany({ where: { session_id: session.id } });
  const scorer = players.find(p => p.name === 'Rahul Mehta');
  const owner = players.find(p => p.user_id === session.owner_id);
  
  console.log("=== SEED02 ===");
  console.log("Match Status:", match.status);
  console.log("Innings Team ID:", innings?.team_id);
  console.log("Scorer:", { id: scorer?.id, team_id: scorer?.team_id, is_scorer: scorer?.is_scorer });
  console.log("Owner:", { id: owner?.id, team_id: owner?.team_id, is_scorer: owner?.is_scorer });
}
main().catch(console.error).finally(() => prisma.$disconnect());
