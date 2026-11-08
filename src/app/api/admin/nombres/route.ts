import { NextRequest, NextResponse } from 'next/server';
import { db, NOMBRES } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET → lista con id, en orden alfabético */
export async function GET() {
  const { data, error } = await db().from(NOMBRES).select('id, nombre');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const nombres = (data ?? []).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  return NextResponse.json({ nombres });
}

/** DELETE ?id= → quita el nombre de la lista (los jueves ya guardados lo conservan) */
export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'id no válido' }, { status: 400 });
  const { error } = await db().from(NOMBRES).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
