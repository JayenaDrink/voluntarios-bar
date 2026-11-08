'use client';
import { useState } from 'react';

export default function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }),
    });
    if (res.ok) window.location.href = '/';
    else {
      setErr((await res.json().catch(() => ({}))).error || 'Error');
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 460 }}>
      <h1>🍺 Voluntarios del bar</h1>
      <p className="muted">Club belga · turnos de los jueves</p>
      <form className="card" onSubmit={submit}>
        <label className="lbl" htmlFor="pw">Contraseña</label>
        <input id="pw" type="password" className="txt" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <p className="err">{err}</p>}
        <button className="btn full" style={{ marginTop: 12 }} disabled={busy || !pw}>Entrar</button>
      </form>
    </main>
  );
}
