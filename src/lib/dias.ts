import 'server-only';
import { db, ESPECIALES } from './db';
import { isFecha, isJueves } from './dates';

/** Días especiales de un año (YYYY-MM-DD, ordenados). */
export async function especialesDelAno(year: number): Promise<string[]> {
  const { data, error } = await db()
    .from(ESPECIALES)
    .select('fecha')
    .gte('fecha', `${year}-01-01`)
    .lte('fecha', `${year}-12-31`)
    .order('fecha');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.fecha as string);
}

/** Un día admite voluntarios si es jueves o un día especial dado de alta. */
export async function esDiaValido(fecha: string): Promise<boolean> {
  if (!isFecha(fecha)) return false;
  if (isJueves(fecha)) return true;
  const { data, error } = await db().from(ESPECIALES).select('fecha').eq('fecha', fecha).maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}
