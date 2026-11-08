'use client';
import { useEffect, useState } from 'react';
import { Header, YearBar, useYear } from '@/lib/client';
import { Turno, fechaLarga, juevesDelAno } from '@/lib/dates';

type Nombre = { id: number; nombre: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (res.status === 401) { window.location.href = '/admin/login'; throw new Error('No autorizado'); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Error');
  return j as T;
}

export default function Admin() {
  return (
    <>
      <Header active="admin" admin />
      <main className="wrap">
        <Voluntarios />
        <Semanas />
      </main>
    </>
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

function Semanas() {
  const [year, setYear] = useYear();
  const [datos, setDatos] = useState<{ turnos: Record<string, Turno>; hoy: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let cancel = false;
    setDatos(null);
    setError('');
    api<{ turnos: Turno[]; hoy: string }>(`/api/admin/semanas?year=${year}`)
      .then((j) => {
        if (cancel) return;
        const map: Record<string, Turno> = {};
        for (const t of j.turnos) map[t.fecha] = t;
        setDatos({ turnos: map, hoy: j.hoy });
      })
      .catch((e) => !cancel && setError(e.message));
    return () => { cancel = true; };
  }, [year]);

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

  const pasados = datos ? juevesDelAno(year).filter((f) => f < datos.hoy).reverse() : [];
  const abiertos = datos ? pasados.filter((f) => datos.turnos[f]?.desbloqueado).length : 0;

  return (
    <section>
      <h2>Jueves realizados</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Cuando un jueves ya pasó queda cerrado y nadie puede cambiarlo. Desbloquéalo para corregirlo y vuelve a cerrarlo después.
      </p>
      <YearBar year={year} setYear={setYear} titulo="Año">
        {datos && <span className="stats">{abiertos} desbloqueado{abiertos === 1 ? '' : 's'}</span>}
      </YearBar>
      {error && <p className="err">{error}</p>}
      {!datos && !error && <p className="muted">Cargando…</p>}
      {datos && pasados.length === 0 && <p className="muted">Todavía no ha pasado ningún jueves de {year}.</p>}
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
                    <td className="fecha">{fechaLarga(f).replace('jueves ', '')}</td>
                    <td>{gente || <span className="muted">—</span>}</td>
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
