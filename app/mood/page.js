'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser, today } from '../../lib/useUser';
import { MOODS, SCORE, EMOJI } from '../../lib/moods';
import Nav from '../../components/Nav';

const ymd = (d) => d.toLocaleDateString('en-CA');
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HELP = {
  Low: ['Take five slow breaths', 'Step outside for a few minutes', 'Message someone you trust'],
  Stressed: ['One-minute breathing', 'Write down what is on your mind', 'Gentle stretching'],
  Anxious: ['Breathe in for four, out for six', 'Name five things you can see', 'Drink a glass of water'],
  Tired: ['Drink some water', 'Take a short rest', 'Do less today, and that is okay'],
};

export default function Mood() {
  const user = useUser();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [sel, setSel] = useState(today());
  const [rows, setRows] = useState([]);
  const [pick, setPick] = useState(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const first = ymd(month), last = ymd(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const load = () => supabase.from('moods').select('day,mood,note').gte('day', first).lte('day', last).then(({ data }) => setRows(data || []));
  useEffect(() => { if (user) load(); }, [user, first]);
  useEffect(() => { const r = rows.find((x) => x.day === sel); setPick(r?.mood || null); setNote(r?.note || ''); setSaved(false); }, [rows, sel]);
  if (!user) return <main className="wrap">Loading…</main>;

  async function save() {
    if (!pick) return;
    await supabase.from('moods').upsert({ day: sel, mood: pick, note: note.trim() || null }, { onConflict: 'user_id,day' });
    setSaved(true); load();
  }
  const shift = (n) => { const d = new Date(month.getFullYear(), month.getMonth() + n, 1); setMonth(d); setSel(ymd(d)); };

  const byDay = Object.fromEntries(rows.map((r) => [r.day, r]));
  const cells = [...Array(month.getDay()).fill(null)];
  for (let d = 1; d <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); d++) cells.push(ymd(new Date(month.getFullYear(), month.getMonth(), d)));

  const tally = {};
  rows.forEach((r) => { tally[r.mood] = (tally[r.mood] || 0) + 1; });
  const tallyList = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const wk = DOW.map((_, i) => {
    const l = rows.filter((r) => new Date(r.day + 'T00:00').getDay() === i);
    return l.length ? l.reduce((s, r) => s + (SCORE[r.mood] || 3), 0) / l.length : 0;
  });
  const notes = rows.filter((r) => r.note).sort((a, b) => (a.day < b.day ? 1 : -1));

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><p className="eyebrow">Emotions and mood history</p><h1>Mood Tracker</h1><p style={{ margin: 0 }}>No right or wrong feelings. Just notice them.</p></section>

      <section className="card">
        <h2>{sel === today() ? 'How are you today?' : 'Mood on ' + sel}</h2>
        <div className="moods">
          {MOODS.map(([e, l]) => <button key={l} className={pick === l ? 'on' : ''} aria-pressed={pick === l} onClick={() => setPick(l)}>{e} {l}</button>)}
        </div>
        <textarea style={{ marginTop: '.7rem' }} rows={3} placeholder="Add a note (optional): what shaped this feeling?" value={note} onChange={(e) => setNote(e.target.value)} />
        <button disabled={!pick} onClick={save}>Save mood</button> {saved && <span role="status" className="muted">Saved ✓</span>}
        {HELP[pick] && (
          <div className="entry"><strong>Something small that might help</strong>
            <ul>{HELP[pick].map((h) => <li key={h}>{h}</li>)}</ul>
            <p className="muted">If heavy feelings stay for a while, talking with someone you trust or a professional can really help.</p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="calhead">
          <button className="ghost" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <button className="ghost" onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
        <div className="cal">
          {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
          {cells.map((c, i) => c ? (
            <button key={c} className={`cell${c === sel ? ' sel' : ''}${c === today() ? ' now' : ''}`} onClick={() => setSel(c)}>
              <small>{Number(c.slice(8))}</small><span className="em">{byDay[c] ? EMOJI[byDay[c].mood] : ''}</span>
            </button>
          ) : <div key={'e' + i} />)}
        </div>
        <p className="muted">Tap any day to add or change its mood.</p>
      </section>

      <section className="card">
        <h2>This month at a glance</h2>
        {tallyList.length === 0 && <p className="muted">No moods logged this month yet.</p>}
        {tallyList.map(([m, n]) => (
          <div key={m} className="mixrow"><span style={{ width: '6.5rem' }}>{EMOJI[m]} {m}</span><div className="bar" style={{ flex: 1, margin: 0 }}><i style={{ width: (n / rows.length) * 100 + '%' }} /></div><span className="muted">{n}</span></div>
        ))}
        {rows.length >= 3 && (
          <>
            <h3 style={{ marginTop: '1.2rem' }}>Pattern by weekday</h3>
            <div className="wk" aria-label="Average mood by weekday">
              {wk.map((v, i) => <div key={i}><i style={{ height: (v / 5) * 100 + '%' }} /><small>{DOW[i]}</small></div>)}
            </div>
            <p className="muted">Taller bars mean brighter days on average.</p>
          </>
        )}
      </section>

      {notes.length > 0 && (
        <section className="card">
          <h2>Notes this month</h2>
          {notes.map((r) => <div key={r.day} className="entry">{EMOJI[r.mood]} <strong>{r.day}</strong> · {r.mood}<p style={{ margin: '.2rem 0' }}>{r.note}</p></div>)}
        </section>
      )}
    </main>
  );
}
