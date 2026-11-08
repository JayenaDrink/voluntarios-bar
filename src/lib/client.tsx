'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Turno } from './dates';

export function Nav({ active }: { active: 'lista' | 'reporte' }) {
  async function salir() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  return (
    <div className="top noprint">
      <h1>🍺 Voluntarios del bar</h1>
      <nav className="nav">
        <Link href="/" className={active === 'lista' ? 'on' : ''}>Jueves</Link>
        <Link href="/reporte" className={active === 'reporte' ? 'on' : ''}>Reporte</Link>
        <button onClick={salir}>Salir</button>
      </nav>
    </div>
  );
}

export function YearBar({ year, setYear, children }: { year: number; setYear: (y: number) => void; children?: React.ReactNode }) {
  return (
    <div className="yearbar">
      <button className="noprint" onClick={() => setYear(year - 1)} aria-label="Año anterior">‹</button>
      <span className="y">{year}</span>
      <button className="noprint" onClick={() => setYear(year + 1)} aria-label="Año siguiente">›</button>
      {children}
    </div>
  );
}

/** Año elegido, recordado en la URL (?year=) */
export function useYear(): [number, (y: number) => void] {
  const [year, setYearState] = useState(() => new Date().getFullYear());
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

export function useTurnos(year: number) {
  const [turnos, setTurnos] = useState<Record<string, Turno> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancel = false;
    setTurnos(null);
    setError('');
    fetch(`/api/jueves?year=${year}`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) { window.location.href = '/login'; return; }
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Error al cargar');
        if (cancel) return;
        const map: Record<string, Turno> = {};
        for (const t of j.turnos as Turno[]) map[t.fecha] = t;
        setTurnos(map);
      })
      .catch((e) => !cancel && setError(e.message));
    return () => { cancel = true; };
  }, [year]);
  return { turnos, setTurnos, error };
}
