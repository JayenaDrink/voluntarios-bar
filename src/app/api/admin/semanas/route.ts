import { NextRequest, NextResponse } from 'next/server';
import { db, TABLE } from '@/lib/db';
import { hoyMadrid, isJueves } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/** GET ?year= → filas del año + la fecha de hoy del servidor */
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get('year')) || new Date().getFullYear();
  const { data, error } = await db()
    .from(TABLE)
    .select('fecha, voluntario_1, voluntario_2, descripcion, desbloqueado')
    .gte('fecha', `${year}-01-01`)
    .lte('fecha', `${year}-12-31`)
    .order('fecha');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ turnos: data, hoy: hoyMadrid() });
}

/** PATCH { fecha, desbloqueado } → abre o cierra un jueves ya pasado */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fecha = String(body?.fecha ?? '');
  const desbloqueado = body?.desbloqueado === true;
  if (!isJueves(fecha)) return NextResponse.json({ error: 'La fecha debe ser un jueves' }, { status: 400 });

  const { data: actual, error: e1 } = await db().from(TABLE).select('voluntario_1, voluntario_2, descripcion').eq('fecha', fecha).maybeSingle();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  if (!actual) {
    if (!desbloqueado) return NextResponse.json({ ok: true, desbloqueado: false });
    const { error } = await db().from(TABLE).insert({ fecha, desbloqueado: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, desbloqueado: true });
  }

  // Al volver a cerrar un jueves vacío, se borra la fila
  if (!desbloqueado && !actual.voluntario_1 && !actual.voluntario_2 && !actual.descripcion) {
    const { error } = await db().from(TABLE).delete().eq('fecha', fecha);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, desbloqueado: false });
  }

  const { error } = await db().from(TABLE).update({ desbloqueado }).eq('fecha', fecha);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, desbloqueado });
}
