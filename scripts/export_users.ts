import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true }
  });
  fs.writeFileSync('all_users.json', JSON.stringify(users, null, 2));
  console.log(`Saved ${users.length} users to all_users.json`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
