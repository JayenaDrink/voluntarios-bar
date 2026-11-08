'use client';
import { useMemo } from 'react';
import { Header, YearBar, useTurnos, useYear } from '@/lib/client';
import { Turno, diasDelAno, fechaCorta, fechaTitulo, hoyISO, isJueves } from '@/lib/dates';

export default function Reporte() {
  const [year, setYear] = useYear();
  const { turnos, especiales, error } = useTurnos(year);
  const hoy = hoyISO();

  const r = useMemo(() => {
    if (!turnos) return null;
    // Jueves + días especiales; los días con el club cerrado no cuentan
    const fechas = diasDelAno(year, especiales);
    const cerrado = (f: string) => !!turnos[f]?.cerrado;
    const con = (f: string) => !cerrado(f) && !!(turnos[f]?.voluntario_1 || turnos[f]?.voluntario_2);
    const pasados = fechas.filter((f) => f < hoy && con(f)).map((f) => turnos[f]).reverse();
    const futuros = fechas.filter((f) => f >= hoy && con(f)).map((f) => turnos[f]);
    const libres = fechas.filter((f) => f >= hoy && !con(f) && !cerrado(f));
    const cerrados = fechas.filter((f) => f >= hoy && cerrado(f));

    // Resumen por persona (sin distinguir mayúsculas/espacios)
    const per = new Map<string, { nombre: string; hechos: number; proximos: number; ultimo: string; siguiente: string }>();
    const add = (nombre: string, f: string) => {
      const n = nombre.trim();
      if (!n) return;
      const k = n.toLocaleLowerCase('es').replace(/\s+/g, ' ');
      const p = per.get(k) ?? { nombre: n, hechos: 0, proximos: 0, ultimo: '', siguiente: '' };
      if (f < hoy) { p.hechos++; if (f > p.ultimo) p.ultimo = f; }
      else { p.proximos++; if (!p.siguiente || f < p.siguiente) p.siguiente = f; }
      per.set(k, p);
    };
    for (const f of fechas) { const t = turnos[f]; if (t && !t.cerrado) { add(t.voluntario_1, f); add(t.voluntario_2, f); } }
    const personas = [...per.values()].sort((a, b) => b.hechos + b.proximos - (a.hechos + a.proximos) || a.nombre.localeCompare(b.nombre, 'es'));

    return { pasados, futuros, libres, cerrados, personas };
  }, [turnos, especiales, year, hoy]);

  return (
    <>
    <Header active="reporte" />
    <main className="wrap">
      <h1 className="print-only">Amistades Belgas de Levante · Voluntarios del bar</h1>
      <YearBar year={year} setYear={setYear} titulo="Reporte">
        <button className="btn ghost small noprint" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>Imprimir / PDF</button>
      </YearBar>

      {error && <p className="err">{error}</p>}
      {!r && !error && <p className="muted">Cargando…</p>}

      {r && (
        <>
          <div className="kpis">
            <div className="kpi"><b>{r.pasados.length}</b><span className="muted small">días trabajados</span></div>
            <div className="kpi"><b>{r.futuros.length}</b><span className="muted small">días asignados</span></div>
            <div className="kpi"><b>{r.libres.length}</b><span className="muted small">días libres por cubrir</span></div>
          </div>

          <h2>Próximos turnos (van a trabajar)</h2>
          <Tabla filas={r.futuros} vacio="No hay turnos asignados." />

          {r.libres.length > 0 && (
            <p className="small"><b>Días libres:</b> <span className="muted">{r.libres.map(fechaCorta).join(' · ')}</span></p>
          )}
          {r.cerrados.length > 0 && (
            <p className="small"><b>Club cerrado:</b> <span className="muted">{r.cerrados.map(fechaCorta).join(' · ')}</span></p>
          )}

          <h2>Turnos realizados (trabajaron)</h2>
          <Tabla filas={r.pasados} vacio="Todavía no hay turnos realizados este año." />

          <h2>Resumen por voluntario</h2>
          {r.personas.length === 0 ? <p className="muted">Sin voluntarios este año.</p> : (
            <div className="tablewrap">
              <table className="rep">
                <thead><tr><th>Voluntario</th><th>Trabajados</th><th>Próximos</th><th>Último</th><th>Siguiente</th></tr></thead>
                <tbody>
                  {r.personas.map((p) => (
                    <tr key={p.nombre}>
                      <td>{p.nombre}</td>
                      <td className="num">{p.hechos}</td>
                      <td className="num">{p.proximos}</td>
                      <td>{p.ultimo ? fechaCorta(p.ultimo) : '—'}</td>
                      <td>{p.siguiente ? fechaCorta(p.siguiente) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
    </>
  );
}

function Tabla({ filas, vacio }: { filas: Turno[]; vacio: string }) {
  if (!filas.length) return <p className="muted">{vacio}</p>;
  return (
    <div className="tablewrap">
      <table className="rep">
        <thead><tr><th>Fecha</th><th>Voluntarios</th><th>Apertura</th><th>Cierre</th><th>Nota</th></tr></thead>
        <tbody>
          {filas.map((t) => (
            <tr key={t.fecha}>
              <td className="fecha">{fechaTitulo(t.fecha)}{!isJueves(t.fecha) && <span className="badge especial">★</span>}</td>
              <td>{[t.voluntario_1, t.voluntario_2].filter(Boolean).join(' y ')}</td>
              <td>{t.apertura || <span className="muted">—</span>}</td>
              <td>{t.cierre || <span className="muted">—</span>}</td>
              <td className="nota">{t.descripcion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
