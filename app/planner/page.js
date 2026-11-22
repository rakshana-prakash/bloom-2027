'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser, today } from '../../lib/useUser';
import Nav from '../../components/Nav';

const ymd = (d) => d.toLocaleDateString('en-CA');
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITIES = ['high', 'normal', 'low'];

export default function Planner() {
  const user = useUser();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState(today());
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');

  const first = ymd(month);
  const last = ymd(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  const load = () => supabase.from('planner_items').select('*').gte('day', first).lte('day', last).order('id')
    .then(({ data }) => setItems(data || []));
  useEffect(() => { if (user) load(); }, [user, first]);

  if (!user) return <main className="wrap">Loading…</main>;

  const cells = [];
  for (let i = 0; i < month.getDay(); i++) cells.push(null);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= days; d++) cells.push(ymd(new Date(month.getFullYear(), month.getMonth(), d)));

  const dayItems = items.filter((i) => i.day === selected);
  const open = items.filter((i) => !i.done).length;

  function shift(n) { setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1)); }

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await supabase.from('planner_items').insert({ day: selected, title: title.trim(), priority });
    setTitle(''); load();
  }
  async function toggle(it) {
    await supabase.from('planner_items').update({ done: !it.done }).eq('id', it.id);
    load();
  }
  async function remove(id) {
    await supabase.from('planner_items').delete().eq('id', id);
    load();
  }

  return (
    <main className="wrap">
      <Nav />
      <section className="card">
        <div className="calhead">
          <button className="ghost" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <button className="ghost" onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
        <p className="muted">{open} open task{open === 1 ? '' : 's'} this month</p>
        <div className="cal">
          {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
          {cells.map((c, i) => c ? (
            <button key={c} className={`cell${c === selected ? ' sel' : ''}${c === today() ? ' now' : ''}`} onClick={() => setSelected(c)}>
              {Number(c.slice(8))}
              {items.some((x) => x.day === c) && <span className="dot" />}
            </button>
          ) : <div key={'e' + i} />)}
        </div>
      </section>

      <section className="card">
        <h2>{new Date(selected + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <form onSubmit={add}>
          <input placeholder="Add a task or event" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p} priority</option>)}
          </select>{' '}
          <button type="submit">Add</button>
        </form>
        {dayItems.length === 0 && <p className="muted">Nothing planned for this day yet.</p>}
        <ul className="acts">
          {dayItems.map((it) => (
            <li key={it.id}>
              <label>
                <input type="checkbox" checked={it.done} onChange={() => toggle(it)} />
                <span style={{ textDecoration: it.done ? 'line-through' : 'none', flex: 1 }}>{it.title}</span>
                <span className={`tag ${it.priority}`}>{it.priority}</span>
                <button type="button" className="ghost" onClick={(e) => { e.preventDefault(); remove(it.id); }}>Delete</button>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
