import { NextRequest, NextResponse } from 'next/server';
import { db, TABLE } from '@/lib/db';
import { RESPONSABLES, hoyMadrid } from '@/lib/dates';
import { esDiaValido, especialesDelAno } from '@/lib/dias';

export const dynamic = 'force-dynamic';

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const COLS = 'fecha, voluntario_1, voluntario_2, descripcion, apertura, cierre, desbloqueado, cerrado';
/** Solo se aceptan nombres de la lista fija (o vacío). */
const responsable = (v: unknown) => { const s = String(v ?? '').trim(); return RESPONSABLES.includes(s) ? s : ''; };
const err = (msg: string, status: number) => NextResponse.json({ error: msg }, { status });

/** GET /api/jueves?year=2027 → filas guardadas de ese año y sus días especiales. */
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get('year')) || new Date().getFullYear();
  const { data, error } = await db()
    .from(TABLE)
    .select(COLS)
    .gte('fecha', `${year}-01-01`)
    .lte('fecha', `${year}-12-31`)
    .order('fecha');
  if (error) return err(error.message, 500);
  try {
    return NextResponse.json({ turnos: data, especiales: await especialesDelAno(year) });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

type Fila = { voluntario_1?: string; voluntario_2?: string; descripcion?: string; apertura?: string; cierre?: string; desbloqueado?: boolean; cerrado?: boolean };

/** Comprueba que el día existe y se puede editar (los pasados solo si el admin los desbloqueó). */
async function editable(fecha: string): Promise<{ actual: Fila | null } | { error: NextResponse }> {
  if (!(await esDiaValido(fecha))) return { error: err('Ese día no es un jueves ni un día especial', 400) };
  const { data, error } = await db()
    .from(TABLE)
    .select('voluntario_1, voluntario_2, descripcion, apertura, cierre, desbloqueado, cerrado')
    .eq('fecha', fecha)
    .maybeSingle();
  if (error) return { error: err(error.message, 500) };
  if (fecha < hoyMadrid() && !data?.desbloqueado) {
    return { error: err('Este día ya pasó y está cerrado. Pide al admin que lo desbloquee.', 403) };
  }
  return { actual: data as Fila | null };
}

const vacia = (r: Fila) => !r.voluntario_1 && !r.voluntario_2 && !r.descripcion && !r.apertura && !r.cierre && !r.desbloqueado && !r.cerrado;

/** PUT /api/jueves → guarda voluntarios y nota de un día. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fecha = String(body?.fecha ?? '');
  try {
    const r = await editable(fecha);
    if ('error' in r) return r.error;
    const row = {
      fecha,
      voluntario_1: clean(body.voluntario_1, 80),
      voluntario_2: clean(body.voluntario_2, 80),
      descripcion: clean(body.descripcion, 1000),
      apertura: responsable(body.apertura),
      cierre: responsable(body.cierre),
      updated_at: new Date().toISOString(),
    };
    const turno = { ...row, desbloqueado: !!r.actual?.desbloqueado, cerrado: !!r.actual?.cerrado };

    if (vacia(turno)) {
      const { error } = await db().from(TABLE).delete().eq('fecha', fecha);
      if (error) return err(error.message, 500);
      return NextResponse.json({ ok: true, turno });
    }
    // El upsert no toca "desbloqueado" ni "cerrado"
    const { error } = await db().from(TABLE).upsert(row, { onConflict: 'fecha' });
    if (error) return err(error.message, 500);
    return NextResponse.json({ ok: true, turno });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

/** PATCH /api/jueves { fecha, cerrado } → marca el club como cerrado / abierto ese día. */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fecha = String(body?.fecha ?? '');
  const cerrado = body?.cerrado === true;
  try {
    const r = await editable(fecha);
    if ('error' in r) return r.error;
    const a = r.actual;
    if (!a) {
      if (cerrado) {
        const { error } = await db().from(TABLE).insert({ fecha, cerrado: true });
        if (error) return err(error.message, 500);
      }
    } else if (vacia({ ...a, cerrado })) {
      const { error } = await db().from(TABLE).delete().eq('fecha', fecha);
      if (error) return err(error.message, 500);
    } else {
      const { error } = await db().from(TABLE).update({ cerrado, updated_at: new Date().toISOString() }).eq('fecha', fecha);
      if (error) return err(error.message, 500);
    }
    return NextResponse.json({
      ok: true,
      turno: {
        fecha,
        voluntario_1: a?.voluntario_1 ?? '',
        voluntario_2: a?.voluntario_2 ?? '',
        descripcion: a?.descripcion ?? '',
        apertura: a?.apertura ?? '',
        cierre: a?.cierre ?? '',
        desbloqueado: !!a?.desbloqueado,
        cerrado,
      },
    });
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
