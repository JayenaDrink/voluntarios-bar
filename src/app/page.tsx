'use client';
import { useEffect, useMemo, useState } from 'react';
import { Nav, YearBar, useTurnos, useYear } from '@/lib/client';
import { Turno, fechaLarga, hoyISO, juevesDelAno, nombreMes, proximoJueves } from '@/lib/dates';

const vacio = (fecha: string): Turno => ({ fecha, voluntario_1: '', voluntario_2: '', descripcion: '' });

export default function Lista() {
  // Por defecto, el año del próximo jueves (así a finales de diciembre ya enseña enero)
  const [year, setYear] = useYear(() => Number(proximoJueves().slice(0, 4)));
  const { turnos, setTurnos, error } = useTurnos(year);
  const [verPasados, setVerPasados] = useState(false);
  const hoy = hoyISO();
  const todas = useMemo(() => juevesDelAno(year), [year]);
  const pasados = todas.filter((f) => f < hoy).length;
  // Solo desde el próximo jueves (hoy incluido si es jueves); los anteriores, a petición
  const fechas = verPasados ? todas : todas.filter((f) => f >= hoy);

  // Nombres ya usados → sugerencias al escribir
  const nombres = useMemo(() => {
    const s = new Set<string>();
    Object.values(turnos ?? {}).forEach((t) => { if (t.voluntario_1) s.add(t.voluntario_1); if (t.voluntario_2) s.add(t.voluntario_2); });
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }, [turnos]);

  const cubiertos = fechas.filter((f) => turnos?.[f]?.voluntario_1 || turnos?.[f]?.voluntario_2).length;

  const porMes: { mes: number; fechas: string[] }[] = [];
  for (const f of fechas) {
    const m = Number(f.slice(5, 7)) - 1;
    if (!porMes.length || porMes[porMes.length - 1].mes !== m) porMes.push({ mes: m, fechas: [] });
    porMes[porMes.length - 1].fechas.push(f);
  }

  return (
    <main className="wrap">
      <Nav active="lista" />
      <YearBar year={year} setYear={(y) => { setYear(y); setVerPasados(false); }}>
        {turnos && fechas.length > 0 && <span className="stats muted small">{cubiertos} de {fechas.length} jueves con voluntarios</span>}
      </YearBar>

      {error && <p className="err">{error}</p>}
      {!turnos && !error && <p className="muted">Cargando…</p>}

      <datalist id="nombres">{nombres.map((n) => <option key={n} value={n} />)}</datalist>

      {turnos && fechas.length === 0 && <p className="muted">Todos los jueves de {year} ya han pasado.</p>}

      {turnos && porMes.map(({ mes, fechas }) => (
        <section key={mes}>
          <h2 className="mes">{nombreMes(mes)}</h2>
          {fechas.map((f) => (
            <Fila key={f} inicial={turnos[f] ?? vacio(f)} hoy={hoy}
              onSaved={(t) => setTurnos((prev) => ({ ...prev, [t.fecha]: t }))} />
          ))}
        </section>
      ))}

      {turnos && pasados > 0 && (
        <p style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn ghost" onClick={() => setVerPasados(!verPasados)}>
            {verPasados ? 'Ocultar jueves anteriores' : `Ver jueves anteriores (${pasados})`}
          </button>
        </p>
      )}
    </main>
  );
}

function Fila({ inicial, hoy, onSaved }: { inicial: Turno; hoy: string; onSaved: (t: Turno) => void }) {
  const [t, setT] = useState(inicial);
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok' | string>('');
  // Solo resetear cuando cambian los datos guardados (no en cada render del padre)
  useEffect(() => setT(inicial), [inicial.voluntario_1, inicial.voluntario_2, inicial.descripcion]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = t.voluntario_1 !== inicial.voluntario_1 || t.voluntario_2 !== inicial.voluntario_2 || t.descripcion !== inicial.descripcion;
  const pasado = t.fecha < hoy;
  const conGente = inicial.voluntario_1 || inicial.voluntario_2;

  async function guardar() {
    setEstado('guardando');
    const res = await fetch('/api/jueves', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) { window.location.href = '/login'; return; }
    if (!res.ok) { setEstado(j.error || 'Error al guardar'); return; }
    onSaved(j.turno);
    setEstado('ok');
    setTimeout(() => setEstado((e) => (e === 'ok' ? '' : e)), 2500);
  }

  const set = (k: keyof Turno) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setT({ ...t, [k]: e.target.value });
    if (estado && estado !== 'guardando') setEstado('');
  };

  return (
    <div id={`j-${t.fecha}`} className={`turno${pasado ? ' past' : ''}${t.fecha === hoy ? ' today' : ''}${dirty ? ' dirty' : ''}`}>
      <div className="head">
        <span className="date">{fechaLarga(t.fecha)}</span>
        {conGente
          ? <span className={`badge${pasado ? ' done' : ''}`}>{pasado ? 'Trabajó' : 'Asignado'}</span>
          : <span className="badge empty">{pasado ? 'Sin datos' : 'Libre'}</span>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (dirty) guardar(); }}>
        <div className="names">
          <input className="txt" list="nombres" placeholder="Voluntario 1" aria-label="Voluntario 1" value={t.voluntario_1} onChange={set('voluntario_1')} />
          <input className="txt" list="nombres" placeholder="Voluntario 2" aria-label="Voluntario 2" value={t.voluntario_2} onChange={set('voluntario_2')} />
        </div>
        <textarea className="txt" rows={1} placeholder="Nota (opcional)" aria-label="Descripción" value={t.descripcion} onChange={set('descripcion')} />
        {(dirty || estado) && (
          <div className="foot">
            {estado === 'ok' && <span className="ok">Guardado ✓</span>}
            {estado && estado !== 'ok' && estado !== 'guardando' && <span className="err">{estado}</span>}
            {dirty && <button type="button" className="btn ghost" onClick={() => { setT(inicial); setEstado(''); }}>Deshacer</button>}
            {dirty && <button className="btn" disabled={estado === 'guardando'}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</button>}
          </div>
        )}
      </form>
    </div>
  );
}
