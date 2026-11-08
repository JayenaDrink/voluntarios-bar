'use client';
import { useEffect, useState } from 'react';
import { Header, YearBar, useYear } from '@/lib/client';
import { Turno, diasDelAno, fechaLarga, fechaTitulo, isJueves } from '@/lib/dates';

type Nombre = { id: number; nombre: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (res.status === 401) { window.location.href = '/admin/login'; throw new Error('No autorizado'); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Error');
  return j as T;
}

export default function Admin() {
  const [version, setVersion] = useState(0);
  return (
    <>
      <Header active="admin" admin />
      <main className="wrap">
        <Especiales onCambio={() => setVersion((v) => v + 1)} />
        <Voluntarios />
        <Semanas version={version} />
      </main>
    </>
  );
}

function Especiales({ onCambio }: { onCambio: () => void }) {
  const [lista, setLista] = useState<string[] | null>(null);
  const [hoy, setHoy] = useState('');
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmar, setConfirmar] = useState('');
  const [verPasados, setVerPasados] = useState(false);

  useEffect(() => {
    api<{ especiales: string[]; hoy: string }>('/api/admin/especiales')
      .then((j) => { setLista(j.especiales); setHoy(j.hoy); })
      .catch((e) => setError(e.message));
  }, []);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      await api('/api/admin/especiales', { method: 'POST', body: JSON.stringify({ fecha }) });
      setLista((l) => [...new Set([...(l ?? []), fecha])].sort());
      setOk(`Agregado: ${fechaLarga(fecha)}`);
      setFecha('');
      onCambio();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function quitar(f: string) {
    setBusy(true);
    setError('');
    setOk('');
    try {
      await api(`/api/admin/especiales?fecha=${f}`, { method: 'DELETE' });
      setLista((l) => l?.filter((x) => x !== f) ?? null);
      onCambio();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
    setConfirmar('');
  }

  const esJueves = !!fecha && isJueves(fecha);
  const visibles = (lista ?? []).filter((f) => verPasados || f >= hoy);
  const pasados = (lista ?? []).length - (lista ?? []).filter((f) => f >= hoy).length;

  return (
    <section>
      <h2>Días especiales</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Para actividades fuera de los jueves que necesitan voluntarios. Aparecen en la lista ordenados por fecha.
      </p>
      <form className="card especial-form" onSubmit={agregar} style={{ marginTop: 0 }}>
        <label className="lbl" htmlFor="esp-fecha">Fecha</label>
        <div className="fila-form">
          <input id="esp-fecha" type="date" className="txt" value={fecha} min={hoy || undefined}
            onChange={(e) => { setFecha(e.target.value); setError(''); setOk(''); }} />
          <button className="btn" disabled={busy || !fecha || esJueves}>{busy ? 'Agregando…' : 'Agregar'}</button>
        </div>
        {esJueves && <p className="muted small" style={{ marginBottom: 0 }}>Ese día es jueves: ya está en la lista.</p>}
        {ok && <p className="ok small" style={{ marginBottom: 0 }}>{ok}</p>}
        {error && <p className="err small" style={{ marginBottom: 0 }}>{error}</p>}
      </form>

      {lista && visibles.length > 0 && (
        <table className="rep" style={{ marginTop: 12 }}>
          <thead><tr><th>Día especial</th><th style={{ textAlign: 'right' }}>Acción</th></tr></thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f}>
                <td className="fecha">{fechaTitulo(f)}</td>
                <td className="acc">
                  {confirmar === f ? (
                    <>
                      <span className="small" style={{ marginRight: 8 }}>¿Quitar este día?</span>
                      <button className="btn ghost small" onClick={() => setConfirmar('')} disabled={busy}>No</button>{' '}
                      <button className="btn small" onClick={() => quitar(f)} disabled={busy}>Sí, quitar</button>
                    </>
                  ) : (
                    <button className="btn ghost small" onClick={() => setConfirmar(f)}>Quitar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {lista && visibles.length === 0 && <p className="muted small">No hay días especiales próximos.</p>}
      {lista && pasados > 0 && (
        <p style={{ marginTop: 8 }}>
          <button className="btn ghost small" onClick={() => setVerPasados(!verPasados)}>
            {verPasados ? 'Ocultar los ya pasados' : `Ver también los ya pasados (${pasados})`}
          </button>
        </p>
      )}
    </section>
  );
}

function Voluntarios() {
  const [lista, setLista] = useState<Nombre[] | null>(null);
  const [error, setError] = useState('');
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    api<{ nombres: Nombre[] }>('/api/admin/nombres').then((j) => setLista(j.nombres)).catch((e) => setError(e.message));
  }, []);

  async function borrar(n: Nombre) {
    setBusy(n.id);
    setError('');
    try {
      await api(`/api/admin/nombres?id=${n.id}`, { method: 'DELETE' });
      setLista((l) => l?.filter((x) => x.id !== n.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
    setConfirmar(null);
  }

  return (
    <section>
      <h2>Lista de voluntarios</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Borrar un nombre lo quita de los desplegables. Los jueves en los que ya aparece lo conservan en el reporte.
      </p>
      {error && <p className="err">{error}</p>}
      {!lista && !error && <p className="muted">Cargando…</p>}
      {lista && lista.length === 0 && <p className="muted">La lista está vacía.</p>}
      {lista && lista.length > 0 && (
        <table className="rep">
          <thead><tr><th>Nombre</th><th style={{ textAlign: 'right' }}>Acción</th></tr></thead>
          <tbody>
            {lista.map((n) => (
              <tr key={n.id}>
                <td>{n.nombre}</td>
                <td className="acc">
                  {confirmar === n.id ? (
                    <>
                      <span className="small" style={{ marginRight: 8 }}>¿Borrar a {n.nombre}?</span>
                      <button className="btn ghost small" onClick={() => setConfirmar(null)} disabled={busy === n.id}>No</button>{' '}
                      <button className="btn small" onClick={() => borrar(n)} disabled={busy === n.id}>{busy === n.id ? 'Borrando…' : 'Sí, borrar'}</button>
                    </>
                  ) : (
                    <button className="btn ghost small" onClick={() => setConfirmar(n.id)}>Borrar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Semanas({ version }: { version: number }) {
  const [year, setYear] = useYear();
  const [datos, setDatos] = useState<{ turnos: Record<string, Turno>; hoy: string; especiales: string[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let cancel = false;
    setDatos(null);
    setError('');
    api<{ turnos: Turno[]; hoy: string; especiales: string[] }>(`/api/admin/semanas?year=${year}`)
      .then((j) => {
        if (cancel) return;
        const map: Record<string, Turno> = {};
        for (const t of j.turnos) map[t.fecha] = t;
        setDatos({ turnos: map, hoy: j.hoy, especiales: j.especiales ?? [] });
      })
      .catch((e) => !cancel && setError(e.message));
    return () => { cancel = true; };
  }, [year, version]);

  async function cambiar(fecha: string, desbloqueado: boolean) {
    setBusy(fecha);
    setError('');
    try {
      await api('/api/admin/semanas', { method: 'PATCH', body: JSON.stringify({ fecha, desbloqueado }) });
      setDatos((d) => d && {
        ...d,
        turnos: { ...d.turnos, [fecha]: { ...(d.turnos[fecha] ?? { fecha, voluntario_1: '', voluntario_2: '', descripcion: '' }), desbloqueado } },
      });
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  const pasados = datos ? diasDelAno(year, datos.especiales).filter((f) => f < datos.hoy).reverse() : [];
  const abiertos = datos ? pasados.filter((f) => datos.turnos[f]?.desbloqueado).length : 0;

  return (
    <section>
      <h2>Días realizados</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Cuando un día ya pasó queda cerrado y nadie puede cambiarlo. Desbloquéalo para corregirlo y vuelve a cerrarlo después.
      </p>
      <YearBar year={year} setYear={setYear} titulo="Año">
        {datos && <span className="stats">{abiertos} desbloqueado{abiertos === 1 ? '' : 's'}</span>}
      </YearBar>
      {error && <p className="err">{error}</p>}
      {!datos && !error && <p className="muted">Cargando…</p>}
      {datos && pasados.length === 0 && <p className="muted">Todavía no ha pasado ningún día de {year}.</p>}
      {datos && pasados.length > 0 && (
        <div className="tablewrap" style={{ marginTop: 12 }}>
          <table className="rep">
            <thead><tr><th>Fecha</th><th>Voluntarios</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acción</th></tr></thead>
            <tbody>
              {pasados.map((f) => {
                const t = datos.turnos[f];
                const abierto = !!t?.desbloqueado;
                const gente = [t?.voluntario_1, t?.voluntario_2].filter(Boolean).join(' y ');
                return (
                  <tr key={f}>
                    <td className="fecha">{fechaTitulo(f)}{!isJueves(f) && <span className="badge especial">★</span>}</td>
                    <td>{t?.cerrado ? <span className="muted">Club cerrado</span> : gente || <span className="muted">—</span>}</td>
                    <td>{abierto ? <span className="badge open">Desbloqueado</span> : <span className="badge lock">🔒 Cerrado</span>}</td>
                    <td className="acc">
                      <button className={`btn small${abierto ? '' : ' ghost'}`} disabled={busy === f} onClick={() => cambiar(f, !abierto)}>
                        {busy === f ? '…' : abierto ? 'Volver a cerrar' : 'Desbloquear'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
