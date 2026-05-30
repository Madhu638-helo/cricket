import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { setUserSession } from '@/lib/auth';

export async function POST(request: Request) {
  const { username, password } = await request.json();
  if (!username || !password)
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });

  const normalizedUsername = username.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });

  if (!user) return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });

  await setUserSession(user.id, user.name, user.username, false);
  return NextResponse.json({ success: true, redirect: '/' });
}
