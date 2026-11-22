'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import Nav from '../../components/Nav';

export default function Journal() {
  const user = useUser();
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = () => supabase.from('journal').select('*').order('created_at', { ascending: false }).then(({ data }) => setEntries(data || []));
  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return <main className="wrap">Loading…</main>;

  async function save(e) {
    e.preventDefault();
    if (!body.trim()) return;
    await supabase.from('journal').insert({ title, body });
    setTitle(''); setBody('');
    load();
  }
  async function remove(id) {
    await supabase.from('journal').delete().eq('id', id);
    load();
  }

  return (
    <main className="wrap">
      <Nav />
      <form className="card" onSubmit={save}>
        <h2>My Journal</h2>
        <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea rows={5} placeholder="Write about your day, or three things you are grateful for." value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="submit">Save entry</button>
      </form>
      <section className="card">
        <h2>Past entries</h2>
        {entries.length === 0 && <p className="muted">No entries yet. Write your first one above.</p>}
        {entries.map((en) => (
          <article key={en.id} className="entry">
            <strong>{en.title || 'Untitled'}</strong>
            <div className="muted">{new Date(en.created_at).toLocaleString()}</div>
            <p>{en.body}</p>
            <button className="ghost" onClick={() => remove(en.id)}>Delete</button>
          </article>
        ))}
      </section>
    </main>
  );
}
