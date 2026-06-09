import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { setUserSession } from '@/lib/auth';

export async function POST(request: Request) {
  const { name, username, password, battingStyle, bowlingStyle, playerRole } = await request.json();
  if (!name || !username || !password)
    return NextResponse.json({ error: 'Name, username, and password required' }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const normalizedUsername = username.toLowerCase().trim();

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        username: normalizedUsername,
        password: hashed,
        ...(battingStyle && { batting_style: battingStyle }),
        ...(bowlingStyle && { bowling_style: bowlingStyle }),
        ...(playerRole && { player_role: playerRole }),
      }
    });

    await setUserSession(user.id, user.name, user.username, false);
    return NextResponse.json({ 
      success: true, 
      redirect: '/', 
      user: { id: user.id, name: user.name, username: user.username } 
    });
  } catch (error: any) {
    if (error.code === 'P2002')
      return NextResponse.json({ error: 'Username already taken.' }, { status: 400 });
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
