const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.error('Please provide a match code');
    process.exit(1);
  }

  const session = await prisma.sessions.findUnique({ where: { code } });
  if (!session) {
    console.error(`Session with code ${code} not found`);
    process.exit(1);
  }

  // Find the two teams for this session
  const teams = await prisma.teams.findMany({ where: { session_id: session.id } });
  if (teams.length < 2) {
    console.error(`Need 2 teams, found ${teams.length}`);
    process.exit(1);
  }

  const t1 = teams[0].id;
  const t2 = teams[1].id;

  const players = [
    // Team A (t1)
    { session_id: session.id, name: 'Virat Kohli', team_id: t1 },
    { session_id: session.id, name: 'Rohit Sharma', team_id: t1 },
    { session_id: session.id, name: 'KL Rahul', team_id: t1 },
    { session_id: session.id, name: 'Suryakumar Yadav', team_id: t1 },
    { session_id: session.id, name: 'Hardik Pandya', team_id: t1 },
    // Team B (t2)
    { session_id: session.id, name: 'Babar Azam', team_id: t2 },
    { session_id: session.id, name: 'Mohammad Rizwan', team_id: t2 },
    { session_id: session.id, name: 'Shaheen Afridi', team_id: t2 },
    { session_id: session.id, name: 'Shadab Khan', team_id: t2 },
    { session_id: session.id, name: 'Fakhar Zaman', team_id: t2 },
  ];

  await prisma.players.createMany({ data: players, skipDuplicates: true });
  console.log('Players added to match', code);
}

main().catch(console.error).finally(() => prisma.$disconnect());
