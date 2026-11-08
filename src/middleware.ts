import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, isSession } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname === '/api/login') return NextResponse.next();

  if (!process.env.APP_PASSWORD) {
    return new NextResponse('APP_PASSWORD no está configurada en el servidor.', { status: 503 });
  }
  if (await isSession(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/|favicon.ico).*)'] };
