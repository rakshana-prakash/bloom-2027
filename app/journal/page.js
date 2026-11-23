'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import Nav from '../../components/Nav';

const KINDS = ['Diary', 'Gratitude', 'Proud of', 'Favourite memory', 'Achievement'];
const HINT = { Diary: 'Write about your day…', Gratitude: 'Three things I am grateful for…', 'Proud of': 'Something I am proud of…', 'Favourite memory': 'A memory I want to keep…', Achievement: 'Something I achieved…' };

export default function Journal() {
  const user = useUser();
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', kind: 'Diary' });
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [edit, setEdit] = useState(null);

  const load = () => supabase.from('journal').select('*').order('created_at', { ascending: false }).then(({ data }) => setEntries(data || []));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <main className="wrap">Loading…</main>;

  async function save(e) {
    e.preventDefault();
    if (!form.body.trim()) return;
    await supabase.from('journal').insert({ title: form.title.trim() || null, body: form.body, kind: form.kind });
    setForm({ ...form, title: '', body: '' }); load();
  }
  async function saveEdit() {
    await supabase.from('journal').update({ title: edit.title || null, body: edit.body, kind: edit.kind }).eq('id', edit.id);
    setEdit(null); load();
  }
  const remove = async (id) => { if (window.confirm('Delete this entry?')) { await supabase.from('journal').delete().eq('id', id); load(); } };
  function exportAll() {
    const text = entries.map((en) => `${new Date(en.created_at).toLocaleString()} · ${en.kind}\n${en.title || 'Untitled'}\n\n${en.body}\n\n----------\n`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'bloom-journal.txt'; a.click(); URL.revokeObjectURL(a.href);
  }

  const shown = entries.filter((en) => (filter === 'All' || en.kind === filter) && (!q.trim() || ((en.title || '') + ' ' + en.body).toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><p className="eyebrow">Diary and gratitude</p><h1>My Journal</h1><p style={{ margin: 0 }}>{entries.length} entr{entries.length === 1 ? 'y' : 'ies'} so far</p></section>

      <form className="card" onSubmit={save}>
        <h2>New entry</h2>
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} aria-label="Type">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea rows={5} placeholder={HINT[form.kind]} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <button type="submit">Save entry</button>
      </form>

      <section className="card">
        <h2>Past entries</h2>
        <input type="search" placeholder="Search your entries" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="pills">
          {['All', ...KINDS].map((k) => <button key={k} className={filter === k ? '' : 'ghost'} onClick={() => setFilter(k)}>{k}</button>)}
          <button className="ghost" onClick={exportAll} disabled={!entries.length}>Export all (.txt)</button>
        </div>
        {shown.length === 0 && <p className="muted">{entries.length ? 'No entries match.' : 'No entries yet. Write your first one above.'}</p>}
        {shown.map((en) => (
          <article key={en.id} className="entry">
            {edit?.id === en.id ? (
              <>
                <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })} aria-label="Type">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
                <input value={edit.title || ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Title" />
                <textarea rows={5} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
                <button onClick={saveEdit}>Save changes</button> <button className="ghost" onClick={() => setEdit(null)}>Cancel</button>
              </>
            ) : (
              <>
                <strong>{en.title || 'Untitled'}</strong> <span className="tag">{en.kind}</span>
                <div className="muted">{new Date(en.created_at).toLocaleString()}</div>
                <p>{en.body}</p>
                <button className="ghost" onClick={() => setEdit(en)}>Edit</button> <button className="ghost" onClick={() => remove(en.id)}>Delete</button>
              </>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
