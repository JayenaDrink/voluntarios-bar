import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, COOKIE, isAdminSession, isSession } from '@/lib/auth';

const PUBLICAS = ['/login', '/api/login', '/admin/login', '/api/admin/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.includes(pathname)) return NextResponse.next();

  const esAdmin = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
  const variable = esAdmin ? 'ADMIN_PASSWORD' : 'APP_PASSWORD';
  if (!process.env[variable]) {
    return new NextResponse(`${variable} no está configurada en el servidor.`, { status: 503 });
  }

  const ok = esAdmin
    ? await isAdminSession(req.cookies.get(ADMIN_COOKIE)?.value)
    : await isSession(req.cookies.get(COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = esAdmin ? '/admin/login' : '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

// Todo salvo estáticos (logo, iconos, _next)
export const config = { matcher: ['/((?!_next/|favicon|logo\\.png|icon-|apple-touch-icon).*)'] };
