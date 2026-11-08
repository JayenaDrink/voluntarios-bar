import { NextRequest, NextResponse } from 'next/server';
import { db, TABLE } from '@/lib/db';
import { hoyMadrid } from '@/lib/dates';
import { esDiaValido, especialesDelAno } from '@/lib/dias';

export const dynamic = 'force-dynamic';

const err = (msg: string, status: number) => NextResponse.json({ error: msg }, { status });

/** GET ?year= → filas del año, días especiales y la fecha de hoy del servidor */
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get('year')) || new Date().getFullYear();
  const { data, error } = await db()
    .from(TABLE)
    .select('fecha, voluntario_1, voluntario_2, descripcion, apertura, cierre, desbloqueado, cerrado')
    .gte('fecha', `${year}-01-01`)
    .lte('fecha', `${year}-12-31`)
    .order('fecha');
  if (error) return err(error.message, 500);
  try {
    return NextResponse.json({ turnos: data, hoy: hoyMadrid(), especiales: await especialesDelAno(year) });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

/** PATCH { fecha, desbloqueado } → abre o cierra un día ya pasado */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fecha = String(body?.fecha ?? '');
  const desbloqueado = body?.desbloqueado === true;
  try {
    if (!(await esDiaValido(fecha))) return err('Ese día no es un jueves ni un día especial', 400);

    const { data: actual, error: e1 } = await db()
      .from(TABLE)
      .select('voluntario_1, voluntario_2, descripcion, apertura, cierre, cerrado')
      .eq('fecha', fecha)
      .maybeSingle();
    if (e1) return err(e1.message, 500);

    if (!actual) {
      if (!desbloqueado) return NextResponse.json({ ok: true, desbloqueado: false });
      const { error } = await db().from(TABLE).insert({ fecha, desbloqueado: true });
      if (error) return err(error.message, 500);
      return NextResponse.json({ ok: true, desbloqueado: true });
    }

    // Al volver a cerrar un día vacío, se borra la fila
    if (!desbloqueado && !actual.voluntario_1 && !actual.voluntario_2 && !actual.descripcion && !actual.apertura && !actual.cierre && !actual.cerrado) {
      const { error } = await db().from(TABLE).delete().eq('fecha', fecha);
      if (error) return err(error.message, 500);
      return NextResponse.json({ ok: true, desbloqueado: false });
    }

    const { error } = await db().from(TABLE).update({ desbloqueado }).eq('fecha', fecha);
    if (error) return err(error.message, 500);
    return NextResponse.json({ ok: true, desbloqueado });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
