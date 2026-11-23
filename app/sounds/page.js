'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import Nav from '../../components/Nav';
import { SOUNDS, useSound } from '../../components/SoundProvider';

const MODES = {
  Study: { rain: 0.35, white: 0.1 }, Reading: { fire: 0.4, piano: 0.25 }, Relax: { ocean: 0.5, birds: 0.25 },
  Sleep: { rain: 0.4, thunder: 0.2, night: 0.15 }, Morning: { birds: 0.5, piano: 0.3, wind: 0.15 },
};

export default function Sounds() {
  const user = useUser();
  const { levels, setLevel, setMix, stopAll, sleepLeft, startSleep } = useSound();
  const [mixes, setMixes] = useState([]);
  const [name, setName] = useState('');
  const load = () => supabase.from('sound_mixes').select('*').order('id', { ascending: false }).then(({ data }) => setMixes(data || []));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <main className="wrap">Loading…</main>;

  async function saveMix(e) {
    e.preventDefault();
    const cur = Object.fromEntries(Object.entries(levels).filter(([, v]) => v > 0));
    if (!name.trim() || Object.keys(cur).length === 0) return;
    await supabase.from('sound_mixes').insert({ name: name.trim(), levels: cur });
    setName(''); load();
  }
  const delMix = async (id) => { await supabase.from('sound_mixes').delete().eq('id', id); load(); };

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><h1>My Sound Space</h1><p style={{ margin: 0 }}>Mix your own calm. The player stays on while you move around the site.</p></section>

      <section className="card">
        <h2>Modes</h2>
        <div className="pills">
          {Object.entries(MODES).map(([m, mix]) => <button key={m} className="ghost" onClick={() => setMix(mix)}>{m}</button>)}
          <button onClick={stopAll}>Stop all</button>
        </div>
      </section>

      <section className="card">
        <h2>Sound mixer</h2>
        {SOUNDS.map((s) => (
          <div key={s.id} className="mixrow">
            <span aria-hidden>{s.icon}</span><label htmlFor={s.id} style={{ width: '7.5rem' }}>{s.label}</label>
            <input id={s.id} type="range" min="0" max="1" step="0.05" value={levels[s.id] || 0} onChange={(e) => setLevel(s.id, Number(e.target.value))} />
          </div>
        ))}
        <p className="muted">Sounds are generated in your browser, so nothing is downloaded. Raise a slider to start it.</p>
      </section>

      <section className="card">
        <h2>Sleep timer</h2>
        <div className="pills">
          {[15, 30, 45, 60].map((m) => <button key={m} className="ghost" onClick={() => startSleep(m)}>{m} min</button>)}
          <button className="ghost" onClick={() => startSleep(0)}>Cancel</button>
        </div>
        {sleepLeft > 0 && <p className="muted">Sounds fade out in about {Math.ceil(sleepLeft / 60)} min.</p>}
      </section>

      <section className="card">
        <h2>My saved mixes</h2>
        <form onSubmit={saveMix}>
          <input placeholder="Name the current mix, e.g. Rainy study" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit">Save current mix</button>
        </form>
        {mixes.length === 0 && <p className="muted">Set some sliders, name your mix and save it.</p>}
        {mixes.map((m) => (
          <div key={m.id} className="entry">
            <strong>{m.name}</strong>{' '}
            <button onClick={() => setMix(m.levels)}>Play</button>{' '}
            <button className="ghost" onClick={() => delMix(m.id)}>Delete</button>
          </div>
        ))}
      </section>
    </main>
  );
}
