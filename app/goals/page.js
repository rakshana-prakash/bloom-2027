'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser, today } from '../../lib/useUser';
import Nav from '../../components/Nav';

const LEVELS = ['year', 'month', 'week'];
const ymd = (d) => d.toLocaleDateString('en-CA');

function streakOf(days) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(ymd(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export default function Goals() {
  const user = useUser();
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [hlog, setHlog] = useState([]);
  const [g, setG] = useState({ title: '', level: 'month', category: '', deadline: '' });
  const [habitName, setHabitName] = useState('');
  const t = today();

  async function load() {
    const since = new Date(); since.setDate(since.getDate() - 90);
    const [a, b, c] = await Promise.all([
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('habits').select('*').order('id'),
      supabase.from('habit_log').select('habit_id,day').gte('day', ymd(since)),
    ]);
    setGoals(a.data || []); setHabits(b.data || []); setHlog(c.data || []);
  }
  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return <main className="wrap">Loading…</main>;

  async function addGoal(e) {
    e.preventDefault();
    if (!g.title.trim()) return;
    await supabase.from('goals').insert({ title: g.title.trim(), level: g.level, category: g.category || null, deadline: g.deadline || null });
    setG({ title: '', level: 'month', category: '', deadline: '' });
    load();
  }
  const saveProgress = async (id, v) => { await supabase.from('goals').update({ progress: v, done: v === 100 }).eq('id', id); load(); };
  const toggleGoal = async (x) => { await supabase.from('goals').update({ done: !x.done, progress: !x.done ? 100 : x.progress }).eq('id', x.id); load(); };
  const delGoal = async (id) => { await supabase.from('goals').delete().eq('id', id); load(); };

  async function addHabit(e) {
    e.preventDefault();
    if (!habitName.trim()) return;
    await supabase.from('habits').insert({ name: habitName.trim() });
    setHabitName(''); load();
  }
  async function toggleHabit(h) {
    const done = hlog.some((l) => l.habit_id === h.id && l.day === t);
    if (done) await supabase.from('habit_log').delete().eq('habit_id', h.id).eq('day', t);
    else await supabase.from('habit_log').insert({ habit_id: h.id, day: t });
    load();
  }
  const delHabit = async (id) => { await supabase.from('habits').delete().eq('id', id); load(); };

  const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return ymd(d); });
  const active = goals.filter((x) => !x.done);
  const archive = goals.filter((x) => x.done);

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><h1>Goals &amp; Habits</h1><p style={{ margin: 0 }}>Big dreams, one small step at a time.</p></section>

      <section className="card">
        <h2>My goals</h2>
        <form onSubmit={addGoal}>
          <input placeholder="A goal for 2027" value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} />
          <select value={g.level} onChange={(e) => setG({ ...g, level: e.target.value })} aria-label="Goal type">
            {LEVELS.map((l) => <option key={l} value={l}>{l}ly goal</option>)}
          </select>{' '}
          <input style={{ width: 'auto' }} placeholder="Category (optional)" value={g.category} onChange={(e) => setG({ ...g, category: e.target.value })} />{' '}
          <input style={{ width: 'auto' }} type="date" aria-label="Deadline" value={g.deadline} onChange={(e) => setG({ ...g, deadline: e.target.value })} />{' '}
          <button type="submit">Add goal</button>
        </form>
        {LEVELS.map((lv) => {
          const list = active.filter((x) => x.level === lv);
          return list.length === 0 ? null : (
            <div key={lv}>
              <h3 style={{ marginTop: '1rem', textTransform: 'capitalize' }}>{lv}ly</h3>
              {list.map((x) => (
                <div key={x.id} className="entry">
                  <strong>{x.title}</strong> {x.category && <span className="tag">{x.category}</span>}
                  <div className="muted">{x.deadline ? 'Due ' + x.deadline + ' · ' : ''}{x.progress}% complete</div>
                  <input type="range" min="0" max="100" step="10" value={x.progress} aria-label={'Progress for ' + x.title}
                    onChange={(e) => setGoals(goals.map((y) => y.id === x.id ? { ...y, progress: Number(e.target.value) } : y))}
                    onPointerUp={(e) => saveProgress(x.id, Number(e.target.value))} onKeyUp={(e) => saveProgress(x.id, Number(e.target.value))} />
                  <button onClick={() => toggleGoal(x)}>Mark done</button>{' '}
                  <button className="ghost" onClick={() => delGoal(x.id)}>Delete</button>
                </div>
              ))}
            </div>
          );
        })}
        {active.length === 0 && <p className="muted">No goals yet. Add your first one above.</p>}
      </section>

      <section className="card">
        <h2>Daily habits</h2>
        <form onSubmit={addHabit}>
          <input placeholder="New habit, e.g. Read 10 pages" value={habitName} onChange={(e) => setHabitName(e.target.value)} />
          <button type="submit">Add habit</button>
        </form>
        {habits.length === 0 && <p className="muted">No habits yet.</p>}
        <ul className="acts">
          {habits.map((h) => {
            const mine = hlog.filter((l) => l.habit_id === h.id).map((l) => l.day);
            return (
              <li key={h.id}>
                <label>
                  <input type="checkbox" checked={mine.includes(t)} onChange={() => toggleHabit(h)} />
                  <span style={{ flex: 1 }}>{h.name}<br /><span className="muted">{streakOf(mine)} day streak · {last7.map((d) => (mine.includes(d) ? '●' : '○')).join(' ')}</span></span>
                  <button type="button" className="ghost" onClick={(e) => { e.preventDefault(); delHabit(h.id); }}>Delete</button>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {archive.length > 0 && (
        <section className="card">
          <h2>Completed goals</h2>
          {archive.map((x) => (
            <div key={x.id} className="entry">✓ {x.title} <button className="ghost" onClick={() => toggleGoal(x)}>Reopen</button></div>
          ))}
        </section>
      )}
    </main>
  );
}
