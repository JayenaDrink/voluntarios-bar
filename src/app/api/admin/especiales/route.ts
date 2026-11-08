import { NextRequest, NextResponse } from 'next/server';
import { db, ESPECIALES, TABLE } from '@/lib/db';
import { hoyMadrid, isFecha, isJueves } from '@/lib/dates';

export const dynamic = 'force-dynamic';

const err = (msg: string, status: number) => NextResponse.json({ error: msg }, { status });

/** GET → todos los días especiales, por fecha */
export async function GET() {
  const { data, error } = await db().from(ESPECIALES).select('fecha').order('fecha');
  if (error) return err(error.message, 500);
  return NextResponse.json({ especiales: (data ?? []).map((r) => r.fecha as string), hoy: hoyMadrid() });
}

/** POST { fecha } → agrega un día especial */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fecha = String(body?.fecha ?? '');
  if (!isFecha(fecha)) return err('Elige una fecha', 400);
  if (isJueves(fecha)) return err('Los jueves ya están en la lista', 400);
  const { error } = await db().from(ESPECIALES).upsert({ fecha }, { onConflict: 'fecha', ignoreDuplicates: true });
  if (error) return err(error.message, 500);
  return NextResponse.json({ ok: true, fecha });
}

/** DELETE ?fecha= → quita el día especial y lo que se hubiera apuntado en él */
export async function DELETE(req: NextRequest) {
  const fecha = req.nextUrl.searchParams.get('fecha') ?? '';
  if (!isFecha(fecha) || isJueves(fecha)) return err('Fecha no válida', 400);
  const { error: e1 } = await db().from(TABLE).delete().eq('fecha', fecha);
  if (e1) return err(e1.message, 500);
  const { error } = await db().from(ESPECIALES).delete().eq('fecha', fecha);
  if (error) return err(error.message, 500);
  return NextResponse.json({ ok: true });
}
