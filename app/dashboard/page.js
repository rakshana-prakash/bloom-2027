'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useUser, today } from '../../lib/useUser';
import Nav from '../../components/Nav';
import { MOODS } from '../../lib/moods';

const ACT = [['One-minute breathing', '🌬️'], ['Drink a glass of water', '💧'], ['Read one page', '📖'], ['Write three things you are grateful for', '🙏'], ['Listen to a favourite song', '🎵'], ['Take a short outdoor break', '🌿'], ['Gentle stretching', '🧘'], ['Learn one new word', '🔤']];
const QUOTES = ['Small steps still move you forward.', 'You do not have to be perfect to bloom.', 'Make little moments count.', 'Rest is part of the plan.', 'Progress, not pressure.'];
const TILES = [['/sounds', 'Sound Space', 'Songs, rain & calm', '🎧', 265], ['/memories', 'Memory Lane', 'Photos worth keeping', '📷', 20], ['/vision', 'Vision Board', 'Dream it, drag it', '🌸', 330], ['/capsule', 'Time Capsule', 'Write to future you', '🕰️', 200], ['/openwhen', 'Open When…', 'Little encouragements', '✉️', 45], ['/inspiration', 'Inspiration', 'A daily spark', '💌', 150], ['/recap', 'My Little Recap', 'Share your small wins', '🌱', 110]];

function calcStreak(days) {
  const set = new Set(days), d = new Date();
  if (!set.has(d.toLocaleDateString('en-CA'))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(d.toLocaleDateString('en-CA'))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export default function Dashboard() {
  const user = useUser();
  const [logs, setLogs] = useState([]);
  const [mood, setMood] = useState(null);
  const [seed, setSeed] = useState(0);
  const [burst, setBurst] = useState(0);
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
  const dayNo = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const picks = [0, 1, 2].map((i) => ACT[(dayNo * 3 + seed * 3 + i) % ACT.length]);
  const picksDone = picks.filter(([n]) => doneToday.has(n)).length;

  async function toggle(name) {
    if (doneToday.has(name)) {
      await supabase.from('activity_log').delete().eq('day', t).eq('activity', name);
      setLogs(logs.filter((l) => !(l.day === t && l.activity === name)));
    } else {
      const { error } = await supabase.from('activity_log').insert({ day: t, activity: name });
      if (!error) { setLogs([...logs, { day: t, activity: name }]); if (picksDone + 1 === 3) setBurst((b) => b + 1); }
    }
  }
  async function pickMood(m) { setMood(m); await supabase.from('moods').upsert({ day: t, mood: m }, { onConflict: 'user_id,day' }); }

  const h = new Date().getHours();
  const time = h < 6 ? 'night' : h < 11 ? 'morning' : h < 17 ? 'day' : h < 20 ? 'evening' : 'night';
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="wrap">
      <Nav />
      <section className="sky" data-time={time}>
        <i className="sun" /><i className="cloud c1" /><i className="cloud c2" /><i className="stars" />
        <div className="sky-in">
          <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greet.split(' ').map((w, i) => <span key={i} className="w" style={{ '--i': i }}>{w}</span>)}</h1>
          <p className="quote">“{QUOTES[dayNo % QUOTES.length]}”</p>
          <span className="pill">🔥 {streak} day{streak === 1 ? '' : 's'} · rest days are okay too</span>
        </div>
      </section>

      <section>
        <h2 className="sec">A few little things <button className="ghost mini-btn" onClick={() => setSeed(seed + 1)} aria-label="Show different ideas">↻</button></h2>
        <p className="muted" style={{ margin: '-.4rem .3rem .9rem' }}>Pick any, or none. Even one counts.</p>
        <div className="bubbles">
          {picks.map(([name, icon]) => (
            <button key={name} className={'bubble' + (doneToday.has(name) ? ' on' : '')} onClick={() => toggle(name)} aria-pressed={doneToday.has(name)}>
              <span className="bi">{icon}</span><span>{name}</span><i className="tick">✓</i>
            </button>
          ))}
        </div>
        {picksDone === 3 && <p className="muted" role="status" style={{ textAlign: 'center', marginTop: '.8rem' }}>That is plenty for today. 🌿</p>}
      </section>

      <section>
        <h2 className="sec">How are you feeling?</h2>
        <div className="moodrow">
          {MOODS.map(([e, label]) => <button key={label} className={mood === label ? 'on' : ''} onClick={() => pickMood(label)} aria-pressed={mood === label} aria-label={label} title={label}>{e}</button>)}
        </div>
        {mood && <p className="muted" style={{ textAlign: 'center' }}>Feeling {mood.toLowerCase()} today. Thank you for noticing.</p>}
      </section>

      <section>
        <h2 className="sec">Wander somewhere</h2>
        <div className="tiles">
          {TILES.map(([href, title, sub, em, hue], i) => (
            <Link key={href} href={href} className="tile" style={{ '--h': hue }}>
              <span className="te" style={{ animationDelay: -i * 0.7 + 's' }} aria-hidden>{em}</span><b>{title}</b><small>{sub}</small>
            </Link>
          ))}
        </div>
      </section>

      {burst > 0 && (
        <div key={burst} className="confetti" aria-hidden>
          {Array.from({ length: 26 }, (_, i) => <i key={i} style={{ '--x': Math.random() * 100 - 50 + 'vw', '--y': -(Math.random() * 55 + 15) + 'vh', '--r': Math.random() * 720 + 'deg', '--d': Math.random() * 0.3 + 's', background: ['#7fb08c', '#f2a7b8', '#b9a7ee', '#f7c98b'][i % 4] }} />)}
        </div>
      )}
    </main>
  );
}
