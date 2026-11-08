import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, MAX_AGE, token } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.json({ error: 'APP_PASSWORD no configurada' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const given = String(body?.password ?? '');
  if ((await token(given)) !== (await token(pw))) {
    await new Promise((r) => setTimeout(r, 1500));
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await token(pw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  return res;
}
