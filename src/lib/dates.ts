export type Turno = {
  fecha: string; // YYYY-MM-DD
  voluntario_1: string;
  voluntario_2: string;
  descripcion: string;
  desbloqueado?: boolean; // día ya pasado que el admin ha abierto para editar
  cerrado?: boolean;      // ese día el club no abre
};

/** Un jueves ya pasado queda cerrado salvo que el admin lo desbloquee. */
export const bloqueado = (t: Turno, hoy: string) => t.fecha < hoy && !t.desbloqueado;

const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Todos los jueves de un año como YYYY-MM-DD. */
export function juevesDelAno(year: number): string[] {
  const d = new Date(year, 0, 1);
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  const out: string[] = [];
  while (d.getFullYear() === year) {
    out.push(iso(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

export function hoyISO() {
  return iso(new Date());
}

/** Hoy en España (para el servidor, que corre en UTC). */
export function hoyMadrid() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Próximo jueves (hoy mismo si hoy es jueves). */
export function proximoJueves() {
  const d = new Date();
  d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7));
  return iso(d);
}

/** ¿Es una fecha YYYY-MM-DD real? */
export function isFecha(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isJueves(fecha: string) {
  if (!isFecha(fecha)) return false;
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 4;
}

/** Jueves del año + días especiales de ese año, sin repetir y ordenados por fecha. */
export function diasDelAno(year: number, especiales: string[] = []): string[] {
  const set = new Set(juevesDelAno(year));
  for (const f of especiales) if (f.startsWith(`${year}-`)) set.add(f);
  return [...set].sort();
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export function diaSemana(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number);
  return DIAS[new Date(y, m - 1, d).getDay()];
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (m: number) => MESES[m];

export function fechaLarga(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number);
  return `${diaSemana(fecha)} ${d} de ${MESES[m - 1]} de ${y}`;
}

export function fechaCorta(fecha: string) {
  const [, m, d] = fecha.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}

/** "Sábado 21 de noviembre de 2026" (solo la primera letra en mayúscula). */
export function fechaTitulo(fecha: string) {
  const s = fechaLarga(fecha);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
