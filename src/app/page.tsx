'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header, YearBar, useTurnos, useYear } from '@/lib/client';
import { Turno, bloqueado, diaSemana, diasDelAno, hoyISO, isJueves, nombreMes, proximoJueves } from '@/lib/dates';

const vacio = (fecha: string): Turno => ({ fecha, voluntario_1: '', voluntario_2: '', descripcion: '' });

export default function Lista() {
  // Por defecto, el año del próximo jueves (así a finales de diciembre ya enseña enero)
  const [year, setYear] = useYear(() => Number(proximoJueves().slice(0, 4)));
  const { turnos, setTurnos, especiales, error } = useTurnos(year);
  const [verPasados, setVerPasados] = useState(false);
  const hoy = hoyISO();
  // Jueves + días especiales, ordenados por fecha
  const todas = useMemo(() => diasDelAno(year, especiales), [year, especiales]);
  const pasados = todas.filter((f) => f < hoy).length;
  // Solo desde hoy en adelante; los anteriores, a petición
  const fechas = verPasados ? todas : todas.filter((f) => f >= hoy);

  // Lista de voluntarios para los desplegables (orden alfabético, viene del servidor)
  const [nombres, setNombres] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/nombres', { cache: 'no-store' }).then((r) => r.json()).then((j) => j.nombres && setNombres(j.nombres)).catch(() => {});
  }, []);

  // Popup "Agregar uno nuevo": devuelve el nombre agregado, o null si se cancela
  const [popup, setPopup] = useState<((n: string | null) => void) | null>(null);
  const pedirNombre = useCallback(() => new Promise<string | null>((resolve) => setPopup(() => resolve)), []);

  const abiertos = fechas.filter((f) => !turnos?.[f]?.cerrado);
  const cubiertos = abiertos.filter((f) => turnos?.[f]?.voluntario_1 || turnos?.[f]?.voluntario_2).length;

  const porMes: { mes: number; fechas: string[] }[] = [];
  for (const f of fechas) {
    const m = Number(f.slice(5, 7)) - 1;
    if (!porMes.length || porMes[porMes.length - 1].mes !== m) porMes.push({ mes: m, fechas: [] });
    porMes[porMes.length - 1].fechas.push(f);
  }

  return (
    <>
    <Header active="lista" />
    <main className="wrap">
      <YearBar year={year} setYear={(y) => { setYear(y); setVerPasados(false); }} titulo="Turnos del bar">
        {turnos && fechas.length > 0 && <span className="stats">{cubiertos} de {abiertos.length} cubiertos</span>}
      </YearBar>

      {error && <p className="err">{error}</p>}
      {!turnos && !error && <p className="muted">Cargando…</p>}

      {popup && (
        <NuevoVoluntario
          onCerrar={(nombre, lista) => { if (lista) setNombres(lista); popup(nombre); setPopup(null); }} />
      )}

      {turnos && fechas.length === 0 && <p className="muted">Todos los días de {year} ya han pasado.</p>}

      {turnos && porMes.map(({ mes, fechas }) => (
        <section key={mes}>
          <h2>{nombreMes(mes)}</h2>
          {fechas.map((f) => (
            <Fila key={f} inicial={turnos[f] ?? vacio(f)} hoy={hoy} nombres={nombres} pedirNombre={pedirNombre}
              onSaved={(t) => setTurnos((prev) => ({ ...prev, [t.fecha]: t }))} />
          ))}
        </section>
      ))}

      {turnos && pasados > 0 && (
        <p style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn ghost" onClick={() => setVerPasados(!verPasados)}>
            {verPasados ? 'Ocultar días anteriores' : `Ver días anteriores (${pasados})`}
          </button>
        </p>
      )}
    </main>
    </>
  );
}

const NUEVO = '__nuevo__';

function Fila({ inicial, hoy, nombres, pedirNombre, onSaved }: {
  inicial: Turno; hoy: string; nombres: string[]; pedirNombre: () => Promise<string | null>; onSaved: (t: Turno) => void;
}) {
  const [t, setT] = useState(inicial);
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok' | string>('');
  // Solo resetear cuando cambian los datos guardados (no en cada render del padre)
  useEffect(() => setT(inicial), [inicial.voluntario_1, inicial.voluntario_2, inicial.descripcion, inicial.cerrado]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cambiando, setCambiando] = useState(false);

  const dirty = t.voluntario_1 !== inicial.voluntario_1 || t.voluntario_2 !== inicial.voluntario_2 || t.descripcion !== inicial.descripcion;
  const pasado = t.fecha < hoy;
  const bloq = bloqueado(inicial, hoy);          // día pasado sin desbloquear
  const clubCerrado = !!inicial.cerrado;         // ese día no abre el club
  const especial = !isJueves(t.fecha);
  const conGente = inicial.voluntario_1 || inicial.voluntario_2;
  const [, mesTxt, diaTxt] = t.fecha.split('-').map(Number);

  async function alternarClub() {
    setCambiando(true);
    setEstado('');
    const res = await fetch('/api/jueves', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha: t.fecha, cerrado: !clubCerrado }) });
    const j = await res.json().catch(() => ({}));
    setCambiando(false);
    if (res.status === 401) { window.location.href = '/login'; return; }
    if (!res.ok) { setEstado(j.error || 'No se pudo cambiar'); return; }
    onSaved(j.turno);
  }

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

  const cambiar = (k: keyof Turno, v: string) => {
    setT((prev) => ({ ...prev, [k]: v }));
    if (estado && estado !== 'guardando') setEstado('');
  };

  async function elegir(k: 'voluntario_1' | 'voluntario_2', v: string) {
    if (v !== NUEVO) return cambiar(k, v);
    const nuevo = await pedirNombre();
    if (nuevo) cambiar(k, nuevo);
  }

  const desplegable = (k: 'voluntario_1' | 'voluntario_2', etiqueta: string) => {
    const valor = t[k];
    // Si hay un nombre guardado que ya no está en la lista, se sigue mostrando
    const opciones = valor && !nombres.includes(valor) ? [...nombres, valor] : nombres;
    return (
      <select className={`txt${valor ? '' : ' vacio'}`} aria-label={etiqueta} value={valor} disabled={bloq} onChange={(e) => elegir(k, e.target.value)}>
        <option value="">{bloq ? '—' : `— ${etiqueta} —`}</option>
        <option value={NUEVO}>➕ Agregar uno nuevo…</option>
        {opciones.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    );
  };

  return (
    <div id={`j-${t.fecha}`} className={`turno${conGente && !clubCerrado ? ' asignado' : ''}${especial ? ' especial' : ''}${clubCerrado ? ' club-cerrado' : ''}${pasado ? ' past' : ''}${t.fecha === hoy ? ' today' : ''}${dirty ? ' dirty' : ''}`}>
      <div className="head">
        <span className="date">
          <span className="dia">{diaSemana(t.fecha)}</span>{diaTxt} de {nombreMes(mesTxt - 1)}
          {especial && <span className="badge especial">★ Día especial</span>}
        </span>
        <span className="estado">
          {clubCerrado
            ? null
            : pasado
              ? (bloq
                ? <span className="badge lock">🔒 {conGente ? 'Trabajó' : 'Cerrado'}</span>
                : <span className="badge open">Desbloqueado</span>)
              : (conGente
                ? <span className="badge">Asignado</span>
                : <span className="badge empty">Libre</span>)}
          <button type="button" className={`toggle${clubCerrado ? ' on' : ''}`} onClick={alternarClub}
            disabled={bloq || cambiando || dirty} aria-pressed={clubCerrado}
            title={bloq ? 'Día cerrado: pide al admin que lo desbloquee' : dirty ? 'Guarda o deshaz los cambios primero' : clubCerrado ? 'Pulsa para volver a abrir' : 'Pulsa si ese día el club no abre'}>
            {cambiando ? '…' : clubCerrado ? (bloq ? '🔒 Club cerrado' : 'Club cerrado') : 'Abierto'}
          </button>
        </span>
      </div>
      {clubCerrado && <p className="aviso-cerrado">El club no abre este día · no hacen falta voluntarios</p>}
      {clubCerrado && estado && estado !== 'ok' && <p className="err small">{estado}</p>}
      {!clubCerrado && (
      <form onSubmit={(e) => { e.preventDefault(); if (dirty && !bloq) guardar(); }}>
        <div className="names">
          {desplegable('voluntario_1', 'Voluntario 1')}
          {desplegable('voluntario_2', 'Voluntario 2')}
        </div>
        {(!bloq || t.descripcion) && (
          <textarea className="txt" rows={1} placeholder="Nota (opcional)" aria-label="Descripción" readOnly={bloq}
            value={t.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} />
        )}
        {(dirty || estado) && (
          <div className="foot">
            {estado === 'ok' && <span className="ok">Guardado ✓</span>}
            {estado && estado !== 'ok' && estado !== 'guardando' && <span className="err">{estado}</span>}
            {dirty && <button type="button" className="btn ghost" onClick={() => { setT(inicial); setEstado(''); }}>Deshacer</button>}
            {dirty && <button className="btn" disabled={estado === 'guardando'}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</button>}
          </div>
        )}
      </form>
      )}
    </div>
  );
}

function NuevoVoluntario({ onCerrar }: { onCerrar: (nombre: string | null, lista?: string[]) => void }) {
  const [nombre, setNombre] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/nombres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }) });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) { window.location.href = '/login'; return; }
    if (!res.ok) { setErr(j.error || 'No se pudo agregar'); setBusy(false); return; }
    onCerrar(j.nombre, j.nombres);
  }

  return (
    <div className="modal-fondo" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(null); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="nv-titulo" onSubmit={agregar}>
        <h3 id="nv-titulo">Nuevo voluntario</h3>
        <div className="cuerpo">
          <label className="lbl" htmlFor="nv-nombre">Nombre</label>
          <input id="nv-nombre" ref={input} className="txt" value={nombre} maxLength={80} autoComplete="off"
            onChange={(e) => setNombre(e.target.value)} />
          {err && <p className="err">{err}</p>}
          <div className="modal-botones">
            <button type="button" className="btn ghost" onClick={() => onCerrar(null)}>Cancelar</button>
            <button className="btn" disabled={busy || !nombre.trim()}>{busy ? 'Agregando…' : 'Agregar'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
