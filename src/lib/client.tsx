'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Turno } from './dates';

/** Cabecera granate con el logo, igual que en los emails del club. */
export function Header({ active, admin = false }: { active?: 'lista' | 'reporte' | 'admin'; admin?: boolean }) {
  async function salir() {
    await fetch(admin ? '/api/admin/logout' : '/api/logout', { method: 'POST' });
    window.location.href = admin ? '/admin/login' : '/login';
  }
  return (
    <header className="header noprint">
      <div className="header-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Amistades Belgas de Levante" />
        <div className="marca">
          <div className="club">Amistades Belgas de Levante</div>
          <div className="app">{admin ? 'Voluntarios del bar · Admin' : 'Voluntarios del bar · Jueves'}</div>
        </div>
        {active && (
          <nav className="nav">
            <Link href="/" className={active === 'lista' ? 'on' : ''}>Jueves</Link>
            <Link href="/reporte" className={active === 'reporte' ? 'on' : ''}>Reporte</Link>
            <Link href="/admin" className={active === 'admin' ? 'on' : ''}>Admin</Link>
            <button onClick={salir}>Salir</button>
          </nav>
        )}
      </div>
    </header>
  );
}

export function YearBar({ year, setYear, titulo, children }: { year: number; setYear: (y: number) => void; titulo?: string; children?: React.ReactNode }) {
  return (
    <div className="subbar">
      {titulo && <span className="titulo">{titulo}</span>}
      <button className="flecha noprint" onClick={() => setYear(year - 1)} aria-label="Año anterior">‹</button>
      <span className="y">{year}</span>
      <button className="flecha noprint" onClick={() => setYear(year + 1)} aria-label="Año siguiente">›</button>
      {children}
    </div>
  );
}

/** Año elegido, recordado en la URL (?year=) */
export function useYear(defecto: () => number = () => new Date().getFullYear()): [number, (y: number) => void] {
  const [year, setYearState] = useState(defecto);
  useEffect(() => {
    const y = Number(new URLSearchParams(window.location.search).get('year'));
    if (y > 2000 && y < 2100) setYearState(y);
  }, []);
  const setYear = useCallback((y: number) => {
    setYearState(y);
    const url = new URL(window.location.href);
    url.searchParams.set('year', String(y));
    window.history.replaceState(null, '', url);
  }, []);
  return [year, setYear];
}

export function useTurnos(year: number, endpoint = '/api/jueves', loginUrl = '/login') {
  const [turnos, setTurnos] = useState<Record<string, Turno> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancel = false;
    setTurnos(null);
    setError('');
    fetch(`${endpoint}?year=${year}`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) { window.location.href = loginUrl; return; }
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Error al cargar');
        if (cancel) return;
        const map: Record<string, Turno> = {};
        for (const t of j.turnos as Turno[]) map[t.fecha] = t;
        setTurnos(map);
      })
      .catch((e) => !cancel && setError(e.message));
    return () => { cancel = true; };
  }, [year, endpoint, loginUrl]);
  return { turnos, setTurnos, error };
}

/** Pantalla de contraseña reutilizada por la app y por el admin. */
export function LoginForm({ titulo, endpoint, destino, etiqueta }: { titulo: string; endpoint: string; destino: string; etiqueta: string }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }),
    });
    if (res.ok) window.location.href = destino;
    else {
      setErr((await res.json().catch(() => ({}))).error || 'Error');
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 420 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="login-logo" src="/logo.png" alt="Amistades Belgas de Levante" />
      <div className="login-titulo">
        <div className="club">Amistades Belgas de Levante</div>
        <p className="muted mono small" style={{ margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '.06em' }}>{titulo}</p>
      </div>
      <form className="card" onSubmit={submit}>
        <label className="lbl" htmlFor="pw">{etiqueta}</label>
        <input id="pw" type="password" className="txt" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <p className="err">{err}</p>}
        <button className="btn full" style={{ marginTop: 12 }} disabled={busy || !pw}>Entrar</button>
      </form>
    </main>
  );
}
