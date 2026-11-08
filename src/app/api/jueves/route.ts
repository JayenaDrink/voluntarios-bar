import { NextRequest, NextResponse } from 'next/server';
import { db, TABLE } from '@/lib/db';
import { isJueves } from '@/lib/dates';

export const dynamic = 'force-dynamic';

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** GET /api/jueves?year=2027 → filas guardadas de ese año. */
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get('year')) || new Date().getFullYear();
  const { data, error } = await db()
    .from(TABLE)
    .select('fecha, voluntario_1, voluntario_2, descripcion')
    .gte('fecha', `${year}-01-01`)
    .lte('fecha', `${year}-12-31`)
    .order('fecha');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ turnos: data });
}

/** PUT /api/jueves → guarda (o borra si queda vacío) un jueves. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fecha = String(body?.fecha ?? '');
  if (!isJueves(fecha)) return NextResponse.json({ error: 'La fecha debe ser un jueves' }, { status: 400 });

  const row = {
    fecha,
    voluntario_1: clean(body.voluntario_1, 80),
    voluntario_2: clean(body.voluntario_2, 80),
    descripcion: clean(body.descripcion, 1000),
    updated_at: new Date().toISOString(),
  };

  if (!row.voluntario_1 && !row.voluntario_2 && !row.descripcion) {
    const { error } = await db().from(TABLE).delete().eq('fecha', fecha);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, turno: { ...row } });
  }

  const { error } = await db().from(TABLE).upsert(row, { onConflict: 'fecha' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, turno: row });
}
