import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-cricket-admin-key'
);

export async function signUserToken(userId: string, name: string, username: string, isAdmin = false) {
  const token = await new SignJWT({ id: userId, name, username, isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);
  return token;
}

export async function verifyUserToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { id: string; name: string; username: string; isAdmin?: boolean };
  } catch (err) {
    return null;
  }
}

export async function getUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cricket_user_session')?.value;
  if (!token) return null;
  return verifyUserToken(token);
}

export async function setUserSession(userId: string, name: string, username: string, isAdmin = false) {
  const token = await signUserToken(userId, name, username, isAdmin);
  const cookieStore = await cookies();
  cookieStore.set('cricket_user_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete('cricket_user_session');
}
