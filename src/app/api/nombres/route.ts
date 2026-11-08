import { NextRequest, NextResponse } from 'next/server';
import { db, NOMBRES } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ordenar = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' });

async function lista() {
  const { data, error } = await db().from(NOMBRES).select('nombre');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.nombre as string).sort(ordenar);
}

/** GET /api/nombres → lista ordenada alfabéticamente */
export async function GET() {
  try {
    return NextResponse.json({ nombres: await lista() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/nombres { nombre } → agrega (si ya existe, devuelve el existente) */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const nombre = String(body?.nombre ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!nombre) return NextResponse.json({ error: 'Escribe un nombre' }, { status: 400 });
  try {
    const actuales = await lista();
    const existente = actuales.find((n) => n.toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'));
    if (existente) return NextResponse.json({ nombre: existente, nombres: actuales, yaExistia: true });
    const { error } = await db().from(NOMBRES).insert({ nombre });
    if (error) throw new Error(error.message);
    return NextResponse.json({ nombre, nombres: await lista() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
