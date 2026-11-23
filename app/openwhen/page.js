'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import Nav from '../../components/Nav';

const SETS = {
  stressed: ['Open when you feel stressed', '🌧️', ['Breathe in for four, out for six. Do that five times.', 'You have handled hard days before, and you will handle this one.', 'Only the next small step matters right now.']],
  motivation: ['Open when you need motivation', '🔥', ['Start with two minutes. Starting is the hardest part.', 'Future you is quietly thanking you for today.', 'You do not need to feel ready. You just need to begin.']],
  tired: ['Open when you feel tired', '🌙', ['Rest is productive. Your body is asking for care.', 'Drink some water, stretch, and give yourself ten quiet minutes.', 'It is fine to do less today.']],
  achieved: ['Open when you achieve something', '🎉', ['You did that. Take a moment to really feel it.', 'Write down how you got here so you can remember it.', 'Celebrate this. It counts.']],
  happy: ['Open when you need a little happiness', '🌼', ['Play your favourite song and do a tiny dance.', 'Think of one person who makes you laugh and send them a message.', 'Step outside and find three beautiful things.']],
  progress: ['Open when you want to remember your progress', '🌱', ['Look back at your journal. You have grown more than you notice.', 'Small steps added up to every day you have kept going.', 'You are not who you were in January. Be proud.']],
};

export default function OpenWhen() {
  const user = useUser();
  const [own, setOwn] = useState([]);
  const [cat, setCat] = useState(null);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ category: 'stressed', text: '' });
  const load = () => supabase.from('open_messages').select('*').order('id', { ascending: false }).then(({ data }) => setOwn(data || []));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <main className="wrap">Loading…</main>;

  function reveal(c) {
    const pool = [...SETS[c][2], ...own.filter((o) => o.category === c).map((o) => o.text)];
    const others = pool.filter((p) => p !== msg);
    setCat(c); setMsg(others[Math.floor(Math.random() * others.length)] || pool[0]);
  }
  async function add(e) {
    e.preventDefault();
    if (!form.text.trim()) return;
    await supabase.from('open_messages').insert({ category: form.category, text: form.text.trim() });
    setForm({ ...form, text: '' }); load();
  }
  const del = async (id) => { await supabase.from('open_messages').delete().eq('id', id); load(); };

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><p className="eyebrow">A little encouragement</p><h1>Open When You Need It</h1><p style={{ margin: 0 }}>Pick the envelope that matches how you feel.</p></section>

      <section className="card">
        <div className="pills">
          {Object.entries(SETS).map(([k, [label, icon]]) => (
            <button key={k} className={cat === k ? '' : 'ghost'} onClick={() => reveal(k)}>{icon} {label.replace('Open when ', '')}</button>
          ))}
        </div>
        {cat && (
          <div className="entry" role="status" style={{ fontSize: '1.2rem', fontFamily: 'var(--display), serif' }}>
            ✉️ {msg}
            <div><button className="ghost" style={{ marginTop: '.6rem' }} onClick={() => reveal(cat)}>Another one</button></div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Write your own</h2>
        <form onSubmit={add}>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} aria-label="Envelope">
            {Object.entries(SETS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <textarea rows={3} placeholder="A message from you to you" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <button type="submit">Add message</button>
        </form>
        {own.map((o) => (
          <div key={o.id} className="entry"><span className="tag">{SETS[o.category]?.[0].replace('Open when ', '')}</span><p style={{ margin: '.3rem 0' }}>{o.text}</p><button className="ghost" onClick={() => del(o.id)}>Delete</button></div>
        ))}
      </section>
    </main>
  );
}
