'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useUser, today } from '../../lib/useUser';

const ACTIVITIES = ['One-minute breathing', 'Drink a glass of water', 'Read one page', 'Write three things you are grateful for', 'Listen to a favourite song', 'Take a short outdoor break', 'Gentle stretching', 'Learn one new word'];
const MOODS = [['😊', 'Happy'], ['😌', 'Calm'], ['😐', 'Okay'], ['😔', 'Low'], ['😣', 'Stressed']];
const QUOTES = ['Small steps still move you forward.', 'You do not have to be perfect to bloom.', 'Make little moments count.', 'Rest is part of the plan.', 'Progress, not pressure.'];

function calcStreak(days) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(d.toLocaleDateString('en-CA'))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(d.toLocaleDateString('en-CA'))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export default function Dashboard() {
  const user = useUser();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [mood, setMood] = useState(null);
  const t = today();

  useEffect(() => {
    if (!user) return;
    const since = new Date(); since.setDate(since.getDate() - 120);
    supabase.from('activity_log').select('day,activity').gte('day', since.toLocaleDateString('en-CA')).then(({ data }) => setLogs(data || []));
    supabase.from('moods').select('mood').eq('day', t).maybeSingle().then(({ data }) => setMood(data?.mood || null));
  }, [user, t]);

  if (!user) return <main className="wrap">Loading…</main>;

  const doneToday = new Set(logs.filter((l) => l.day === t).map((l) => l.activity));
  const streak = calcStreak(logs.map((l) => l.day));

  async function toggle(activity) {
    if (doneToday.has(activity)) {
      await supabase.from('activity_log').delete().eq('day', t).eq('activity', activity);
      setLogs(logs.filter((l) => !(l.day === t && l.activity === activity)));
    } else {
      const { error } = await supabase.from('activity_log').insert({ day: t, activity });
      if (!error) setLogs([...logs, { day: t, activity }]);
    }
  }

  async function pickMood(m) {
    setMood(m);
    await supabase.from('moods').upsert({ day: t, mood: m }, { onConflict: 'user_id,day' });
  }

  async function logout() { await supabase.auth.signOut(); router.replace('/'); }

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  return (
    <main className="wrap">
      <nav>
        <Link href="/dashboard" className="brand">Bloom 2027</Link>
        <Link href="/journal">Journal</Link>
        <button className="ghost" onClick={logout}>Log out</button>
      </nav>

      <section className="card hero">
        <h1>{greet}</h1>
        <p style={{ margin: 0 }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p><em>{quote}</em></p>
      </section>

      <section className="card">
        <h2>Little by Little</h2>
        <div className="streak">{streak} day streak</div>
        <p className="muted">{doneToday.size} of {ACTIVITIES.length} done today. One activity keeps your streak going.</p>
        <ul className="acts">
          {ACTIVITIES.map((a) => (
            <li key={a}>
              <label><input type="checkbox" checked={doneToday.has(a)} onChange={() => toggle(a)} />{a}</label>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>How is your day going?</h2>
        <div className="moods">
          {MOODS.map(([e, label]) => (
            <button key={label} className={mood === label ? 'on' : ''} onClick={() => pickMood(label)} aria-pressed={mood === label}>{e} {label}</button>
          ))}
        </div>
      </section>
    </main>
  );
}
