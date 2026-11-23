'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser, today } from '../../lib/useUser';
import Nav from '../../components/Nav';
import { useSound } from '../../components/SoundProvider';

const PRESETS = [5, 15, 25, 45];
const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

export default function Focus() {
  const user = useUser();
  const { setLevel, beep } = useSound();
  const [mins, setMins] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [endAt, setEndAt] = useState(null);
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState([]);
  const [sound, setSound] = useState('none');
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState('');
  const [minimal, setMinimal] = useState(false);
  const running = endAt !== null;

  const loadHistory = () => supabase.from('focus_sessions').select('*').order('created_at', { ascending: false }).limit(30).then(({ data }) => setHistory(data || []));
  useEffect(() => {
    if (!user) return;
    loadHistory();
    supabase.from('planner_items').select('title').eq('day', today()).eq('done', false).then(({ data }) => setTasks(data || []));
  }, [user]);

  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => {
      const l = Math.ceil((endAt - Date.now()) / 1000);
      if (l <= 0) { clearInterval(id); finish(); } else setLeft(l);
    }, 500);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => { document.title = running ? fmt(left) + ' · Focus' : 'Bloom 2027'; }, [left, running]);

  if (!user) return <main className="wrap">Loading…</main>;

  async function finish() {
    setEndAt(null); setLeft(mins * 60); beep();
    if (sound !== 'none') setLevel(sound, 0);
    await supabase.from('focus_sessions').insert({ minutes: mins, task: task || null });
    setMsg('Session complete. Time for a short break: stretch, sip some water, rest your eyes.');
    loadHistory();
  }
  function start() { setMsg(''); setEndAt(Date.now() + left * 1000); if (sound !== 'none') setLevel(sound, 0.4); }
  function pause() { setEndAt(null); if (sound !== 'none') setLevel(sound, 0); }
  function reset() { pause(); setLeft(mins * 60); }
  function choose(m) { const v = Math.max(1, Math.min(180, Number(m) || 25)); setMins(v); setLeft(v * 60); }
  async function fullscreen(on) {
    setMinimal(on);
    try { if (on) await document.documentElement.requestFullscreen(); else if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
  }

  const todayMins = history.filter((h) => new Date(h.created_at).toLocaleDateString('en-CA') === today()).reduce((a, h) => a + h.minutes, 0);

  const controls = (
    <div className="pills" style={{ justifyContent: 'center' }}>
      {!running ? <button onClick={start}>{left < mins * 60 ? 'Resume' : 'Start'}</button> : <button onClick={pause}>Pause</button>}
      <button className="ghost" onClick={reset}>Reset</button>
    </div>
  );

  if (minimal) return (
    <div className="overlay">
      {task && <p className="muted">{task}</p>}
      <div className="timer">{fmt(left)}</div>
      {controls}
      <button className="ghost" onClick={() => fullscreen(false)}>Exit focus mode</button>
    </div>
  );

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><h1>Focus Room</h1><p style={{ margin: 0 }}>One thing at a time. Today: {todayMins} focused minutes.</p></section>

      <section className="card" style={{ textAlign: 'center' }}>
        <div className="pills" style={{ justifyContent: 'center' }}>
          {PRESETS.map((m) => <button key={m} disabled={running} className={mins === m ? '' : 'ghost'} onClick={() => choose(m)}>{m} min</button>)}
          <input style={{ width: '6rem', margin: 0 }} type="number" min="1" max="180" disabled={running} value={mins} onChange={(e) => choose(e.target.value)} aria-label="Custom minutes" />
        </div>
        <div className="timer" role="timer">{fmt(left)}</div>
        {controls}
        {msg && <p role="status">{msg}</p>}
      </section>

      <section className="card">
        <h2>Setup</h2>
        <input list="todays" placeholder="What are you working on? (pick from today’s planner or type)" value={task} disabled={running} onChange={(e) => setTask(e.target.value)} />
        <datalist id="todays">{tasks.map((t, i) => <option key={i} value={t.title} />)}</datalist>
        <label>Focus sound{' '}
          <select value={sound} disabled={running} onChange={(e) => setSound(e.target.value)}>
            <option value="none">None</option><option value="rain">Rain</option><option value="white">White noise</option>
            <option value="ocean">Ocean waves</option><option value="fire">Fireplace</option><option value="piano">Soft piano</option>
          </select>
        </label>{' '}
        <button className="ghost" onClick={() => fullscreen(true)}>Minimal fullscreen mode</button>
      </section>

      <section className="card">
        <h2>Recent sessions</h2>
        {history.length === 0 && <p className="muted">Finish a session and it will appear here.</p>}
        {history.slice(0, 10).map((h) => (
          <div key={h.id} className="entry">{h.minutes} min{h.task ? ' · ' + h.task : ''}<div className="muted">{new Date(h.created_at).toLocaleString()}</div></div>
        ))}
      </section>
    </main>
  );
}
