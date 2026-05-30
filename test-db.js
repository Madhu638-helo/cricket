const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.sessions.findFirst({
    orderBy: { created_at: 'desc' }
  });
  console.log("Session:", session.code);
  const match = await prisma.matches.findFirst({
    where: { session_id: session.id },
    orderBy: { created_at: 'desc' }
  });
  console.log("Match batting_first:", match.batting_first);
  const players = await prisma.players.findMany({
    where: { session_id: session.id }
  });
  console.log("Players count:", players.length);
  const battingPlayers = players.filter(p => p.team_id === match.batting_first);
  console.log("Batting Players:", battingPlayers.map(p => p.name));
  
  const bowlingTeamId = (await prisma.teams.findFirst({
    where: { session_id: session.id, id: { not: match.batting_first } }
  }))?.id;
  const bowlingPlayers = players.filter(p => p.team_id === bowlingTeamId);
  console.log("Bowling Players:", bowlingPlayers.map(p => p.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
