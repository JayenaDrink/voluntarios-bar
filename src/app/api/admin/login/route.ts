import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_MAX_AGE, COOKIE, MAX_AGE, adminToken, token } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return NextResponse.json({ error: 'ADMIN_PASSWORD no configurada en Vercel' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const given = String(body?.password ?? '');
  if ((await adminToken(given)) !== (await adminToken(pw))) {
    await new Promise((r) => setTimeout(r, 1500));
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminToken(pw), { ...opts, maxAge: ADMIN_MAX_AGE });
  // El admin también puede usar la app normal sin volver a entrar
  const appPw = process.env.APP_PASSWORD;
  if (appPw) res.cookies.set(COOKIE, await token(appPw), { ...opts, maxAge: MAX_AGE });
  return res;
}
