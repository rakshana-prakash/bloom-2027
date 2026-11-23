'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import Nav from '../../components/Nav';

const ymd = (d) => d.toLocaleDateString('en-CA');
const key = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const label = (m) => new Date(m + '-01T00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const EMPTY = { highlights: '', improve: '', theme: '', intention: '' };

export default function Reset() {
  const user = useUser();
  const [month, setMonth] = useState(() => { const d = new Date(); return key(new Date(d.getFullYear(), d.getMonth() - 1, 1)); });
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [past, setPast] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1), end = new Date(y, m, 1), first = ymd(start), last = ymd(new Date(y, m, 0));
    (async () => {
      const [a, b, c, d, e, f, g] = await Promise.all([
        supabase.from('activity_log').select('day').gte('day', first).lte('day', last),
        supabase.from('planner_items').select('done').gte('day', first).lte('day', last),
        supabase.from('focus_sessions').select('minutes').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
        supabase.from('journal').select('id').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
        supabase.from('moods').select('mood').gte('day', first).lte('day', last),
        supabase.from('monthly_resets').select('*').eq('month', month).maybeSingle(),
        supabase.from('monthly_resets').select('month').order('month', { ascending: false }),
      ]);
      const counts = {};
      (e.data || []).forEach((x) => { counts[x.mood] = (counts[x.mood] || 0) + 1; });
      const top = Object.entries(counts).sort((p, q) => q[1] - p[1])[0];
      setStats({
        acts: (a.data || []).length, days: new Set((a.data || []).map((x) => x.day)).size,
        tasksDone: (b.data || []).filter((x) => x.done).length, tasks: (b.data || []).length,
        focus: (c.data || []).reduce((s, x) => s + x.minutes, 0), entries: (d.data || []).length, mood: top ? top[0] : '—',
      });
      setForm(f.data ? { highlights: f.data.highlights || '', improve: f.data.improve || '', theme: f.data.theme || '', intention: f.data.intention || '' } : EMPTY);
      setPast(g.data || []); setSaved(false);
    })();
  }, [user, month]);

  if (!user) return <main className="wrap">Loading…</main>;

  const shift = (n) => { const [y, m] = month.split('-').map(Number); setMonth(key(new Date(y, m - 1 + n, 1))); };
  async function save(e) {
    e.preventDefault();
    await supabase.from('monthly_resets').upsert({ month, ...form }, { onConflict: 'user_id,month' });
    setSaved(true); setPast((p) => (p.some((x) => x.month === month) ? p : [{ month }, ...p]));
  }

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><p className="eyebrow">Monthly Reset</p><h1>Review, reflect, begin again</h1>
        <div className="pills" style={{ marginBottom: 0 }}>
          <button className="ghost" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <strong style={{ alignSelf: 'center' }}>{label(month)}</strong>
          <button className="ghost" onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
      </section>

      {stats && (
        <div className="stats wide">
          <div className="stat"><b>{stats.days}</b><small>active days</small></div>
          <div className="stat"><b>{stats.acts}</b><small>mini activities</small></div>
          <div className="stat"><b>{stats.tasksDone}/{stats.tasks}</b><small>tasks done</small></div>
          <div className="stat"><b>{stats.focus}</b><small>focus minutes</small></div>
          <div className="stat"><b>{stats.entries}</b><small>journal entries</small></div>
          <div className="stat"><b>{stats.mood}</b><small>most common mood</small></div>
        </div>
      )}

      <form className="card" onSubmit={save}>
        <h2>Reflect on {label(month)}</h2>
        <label>What were my highlights?<textarea rows={3} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} /></label>
        <label>What would I like to do differently?<textarea rows={3} value={form.improve} onChange={(e) => setForm({ ...form, improve: e.target.value })} /></label>
        <label>Theme for the next month<input placeholder="e.g. Slow and steady" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></label>
        <label>One intention for the next month<input value={form.intention} onChange={(e) => setForm({ ...form, intention: e.target.value })} /></label>
        <button type="submit">Save reset</button> {saved && <span role="status" className="muted">Saved ✓</span>}
      </form>

      <section className="card">
        <h2>Fresh start checklist</h2>
        <ul className="acts">
          <li><Link href="/goals">Set new goals and habits →</Link></li>
          <li><Link href="/vision">Update my vision board →</Link></li>
          <li><Link href="/sounds">Build a fresh playlist or sound mix →</Link></li>
          <li><Link href="/planner">Plan the month ahead →</Link></li>
        </ul>
      </section>

      {past.length > 0 && (
        <section className="card">
          <h2>Past resets</h2>
          <div className="pills">{past.map((p) => <button key={p.month} className={p.month === month ? '' : 'ghost'} onClick={() => setMonth(p.month)}>{label(p.month)}</button>)}</div>
        </section>
      )}
    </main>
  );
}
