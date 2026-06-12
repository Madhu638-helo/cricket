import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();
async function main() {
  const session = await prisma.sessions.findUnique({ where: { code: 'SEED02' }});
  const match = await prisma.matches.findFirst({ where: { session_id: session!.id }});
  const innings = await prisma.innings.findFirst({ where: { match_id: match!.id, status: 'active' }});
  const players = await prisma.players.findMany({ where: { session_id: session!.id } });
  const scorer = players.find(p => p.name === 'Rahul Mehta');
  console.log({
    scorerTeamId: scorer?.team_id,
    inningsTeamId: innings?.team_id,
    isScorer: scorer?.is_scorer,
  });
}
main();
