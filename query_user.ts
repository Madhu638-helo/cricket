import { PrismaClient } from './src/generated/prisma'
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.$queryRaw`SELECT id, email FROM auth.users;`
  // @ts-ignore
  const found = users.filter((u: any) => JSON.stringify(u).toLowerCase().includes('teja'))
  console.log('Found in auth.users:', found)
}
main().catch(console.error).finally(() => prisma.$disconnect())
