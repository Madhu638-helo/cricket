import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const password = 'aditya.r@134';
  const hashed = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      name: 'Aditya R',
      username: 'aditya.r',
      password: hashed,
    }
  });
  
  console.log('User created:', user);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
