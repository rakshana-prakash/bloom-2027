'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import Nav from '../../components/Nav';

const QUOTES = ['Small steps still move you forward.', 'You do not have to be perfect to bloom.', 'Make little moments count.', 'Rest is part of the plan.', 'Progress, not pressure.', 'Begin where you are.', 'Be gentle with yourself today.', 'One good thing at a time.', 'Your pace is still progress.', 'Growth is quiet before it is visible.'];
const AFFIRMATIONS = ['I am allowed to take things slowly.', 'I am proud of the little things I do.', 'I can start again any time.', 'I choose calm over rush today.', 'I am growing, even on quiet days.', 'I deserve rest and joy.', 'My effort matters.', 'I am enough as I am.'];
const MINI = ['Take five slow breaths.', 'Drink a glass of water.', 'Step outside for two minutes.', 'Tidy one small corner.', 'Stretch your shoulders and neck.', 'Text someone something kind.', 'Read one page of a book.', 'Learn one new word.'];
const PROMPTS = ['What made me smile today?', 'What am I looking forward to?', 'Which small win am I proud of?', 'What do I need more of this week?', 'Who am I grateful for, and why?', 'What would make tomorrow feel lighter?'];
const CREATIVE = ['Draw your day in three shapes.', 'Write a four-line poem about the weather.', 'Take a photo of something blue.', 'Doodle for three minutes without lifting the pen.', 'Describe your room as if you were a visitor.'];

const dayOfYear = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
const pick = (arr, k = 0) => arr[(dayOfYear() + k) % arr.length];

export default function Inspiration() {
  const user = useUser();
  const [favs, setFavs] = useState([]);
  const load = () => supabase.from('favourites').select('*').order('id', { ascending: false }).then(({ data }) => setFavs(data || []));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <main className="wrap">Loading…</main>;

  const quote = pick(QUOTES), affirmation = pick(AFFIRMATIONS, 3);
  const surprise = [['Mini activity', pick(MINI, 1)], ['Journal prompt', pick(PROMPTS, 2)], ['Creative challenge', pick(CREATIVE, 4)]];

  async function save(text) { await supabase.from('favourites').insert({ text }); load(); }
  async function remove(id) { await supabase.from('favourites').delete().eq('id', id); load(); }
  const saved = (text) => favs.some((f) => f.text === text);

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero">
        <h1>Daily Inspiration</h1>
        <p style={{ fontSize: '1.2rem' }}><em>“{quote}”</em></p>
        <button disabled={saved(quote)} onClick={() => save(quote)}>{saved(quote) ? 'Saved ♥' : 'Save to favourites'}</button>
      </section>

      <section className="card">
        <h2>Today’s affirmation</h2>
        <p style={{ fontSize: '1.1rem' }}>{affirmation}</p>
        <button disabled={saved(affirmation)} className="ghost" onClick={() => save(affirmation)}>{saved(affirmation) ? 'Saved ♥' : 'Save ♥'}</button>
      </section>

      <section className="card">
        <h2>Today’s surprise</h2>
        {surprise.map(([label, text]) => (
          <div key={label} className="entry"><span className="tag">{label}</span><p style={{ margin: '.4rem 0' }}>{text}</p></div>
        ))}
        <p className="muted">A new set appears every day.</p>
      </section>

      <section className="card">
        <h2>My favourites</h2>
        {favs.length === 0 && <p className="muted">Nothing saved yet. Tap “Save” on a quote or affirmation you love.</p>}
        {favs.map((f) => (
          <div key={f.id} className="entry">{f.text} <button className="ghost" onClick={() => remove(f.id)}>Remove</button></div>
        ))}
      </section>
    </main>
  );
}
