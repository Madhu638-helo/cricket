import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  try {
    let users;
    if (q.trim().length === 0) {
      users = await prisma.user.findMany({
        take: 20,
        select: { id: true, name: true, username: true, avatar_url: true },
        orderBy: { name: 'asc' }
      });
    } else {
      users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: 20,
        select: { id: true, name: true, username: true, avatar_url: true },
        orderBy: { name: 'asc' }
      });
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
