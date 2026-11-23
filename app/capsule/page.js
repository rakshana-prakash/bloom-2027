'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser, today } from '../../lib/useUser';
import Nav from '../../components/Nav';

const ymd = (d) => d.toLocaleDateString('en-CA');
const daysUntil = (day) => Math.ceil((new Date(day + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);

export default function Capsule() {
  const user = useUser();
  const [letters, setLetters] = useState([]);
  const [f, setF] = useState({ title: '', body: '', open_on: '' });
  const [opened, setOpened] = useState({});
  const [err, setErr] = useState('');
  const load = () => supabase.from('capsules').select('*').order('open_on').then(({ data }) => setLetters(data || []));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <main className="wrap">Loading…</main>;

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  async function add(e) {
    e.preventDefault(); setErr('');
    if (!f.title.trim() || !f.body.trim() || !f.open_on) return setErr('Add a title, your letter and an opening date.');
    await supabase.from('capsules').insert({ title: f.title.trim(), body: f.body.trim(), open_on: f.open_on });
    setF({ title: '', body: '', open_on: '' }); load();
  }
  const del = async (id) => { if (window.confirm('Delete this letter?')) { await supabase.from('capsules').delete().eq('id', id); load(); } };

  const ready = letters.filter((l) => l.open_on <= today());
  const waiting = letters.filter((l) => l.open_on > today());

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><p className="eyebrow">Letters to my future self</p><h1>Time Capsule</h1><p style={{ margin: 0 }}>Write now, open later. Letters stay sealed until the date you choose.</p></section>

      {ready.length > 0 && (
        <section className="card">
          <h2>Ready to open 💌</h2>
          {ready.map((l) => (
            <div key={l.id} className="entry">
              <strong>{l.title}</strong><div className="muted">Written {new Date(l.created_at).toLocaleDateString()} · opened {l.open_on}</div>
              {opened[l.id] ? <p>{l.body}</p> : <button onClick={() => setOpened({ ...opened, [l.id]: true })}>Open letter</button>}{' '}
              <button className="ghost" onClick={() => del(l.id)}>Delete</button>
            </div>
          ))}
        </section>
      )}

      <form className="card" onSubmit={add}>
        <h2>Write a letter</h2>
        <input placeholder="Title, e.g. For December me" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea rows={6} placeholder="Dear me, I hope you achieved the goals you dreamed about in January…" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <label>Open on{' '}<input style={{ width: 'auto' }} type="date" min={ymd(tomorrow)} value={f.open_on} onChange={(e) => setF({ ...f, open_on: e.target.value })} /></label>{' '}
        <button type="submit">Seal letter</button>
        {err && <p role="alert" className="muted">{err}</p>}
      </form>

      <section className="card">
        <h2>Sealed letters 🔒</h2>
        {waiting.length === 0 && <p className="muted">No sealed letters yet.</p>}
        {waiting.map((l) => (
          <div key={l.id} className="entry">
            <strong>{l.title}</strong>
            <div className="muted">Opens on {l.open_on} · {daysUntil(l.open_on)} day{daysUntil(l.open_on) === 1 ? '' : 's'} to go</div>
            <button className="ghost" onClick={() => del(l.id)}>Delete</button>
          </div>
        ))}
        <p className="muted">The lock is a gentle promise to yourself, so try not to peek.</p>
      </section>
    </main>
  );
}
