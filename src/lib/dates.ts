export type Turno = {
  fecha: string; // YYYY-MM-DD
  voluntario_1: string;
  voluntario_2: string;
  descripcion: string;
};

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

export function isJueves(fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && dt.getDay() === 4;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (m: number) => MESES[m];

export function fechaLarga(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number);
  return `jueves ${d} de ${MESES[m - 1]} de ${y}`;
}

export function fechaCorta(fecha: string) {
  const [, m, d] = fecha.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}
