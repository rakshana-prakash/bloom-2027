'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import Nav from '../../components/Nav';

const KINDS = ['Diary', 'Gratitude', 'Proud of', 'Favourite memory', 'Achievement'];
const HINT = { Diary: 'Write about your day…', Gratitude: 'Three things I am grateful for…', 'Proud of': 'Something I am proud of…', 'Favourite memory': 'A memory I want to keep…', Achievement: 'Something I achieved…' };
const newToken = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

export default function Journal() {
  const user = useUser();
  const [entries, setEntries] = useState([]);
  const [shares, setShares] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', kind: 'Diary' });
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [edit, setEdit] = useState(null);
  const [panel, setPanel] = useState(null);
  const [days, setDays] = useState(3);
  const [copied, setCopied] = useState('');

  const load = () => supabase.from('journal').select('*').order('created_at', { ascending: false }).then(({ data }) => setEntries(data || []));
  async function loadShares() {
    await supabase.from('shared_entries').delete().lt('expires_at', new Date().toISOString());
    const { data } = await supabase.from('shared_entries').select('*').order('created_at', { ascending: false });
    setShares(data || []);
  }
  useEffect(() => { if (user) { load(); loadShares(); } }, [user]);
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
  const remove = async (id) => { if (window.confirm('Delete this entry? Any share links for it will stop working.')) { await supabase.from('journal').delete().eq('id', id); load(); loadShares(); } };
  function exportAll() {
    const text = entries.map((en) => `${new Date(en.created_at).toLocaleString()} · ${en.kind}\n${en.title || 'Untitled'}\n\n${en.body}\n\n----------\n`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'bloom-journal.txt'; a.click(); URL.revokeObjectURL(a.href);
  }

  const live = (id) => shares.filter((s) => s.entry_id === id && new Date(s.expires_at) > new Date());
  const url = (t) => `${window.location.origin}/s/${t}`;
  async function createLink(en) {
    await supabase.from('shared_entries').insert({ entry_id: en.id, token: newToken(), expires_at: new Date(Date.now() + days * 864e5).toISOString() });
    loadShares();
  }
  async function copy(t) { try { await navigator.clipboard.writeText(url(t)); setCopied(t); } catch { window.prompt('Copy this link', url(t)); } }
  async function nativeShare(t, title) {
    if (navigator.share) { try { await navigator.share({ title: title || 'A page from my journal', url: url(t) }); } catch {} } else copy(t);
  }
  const stop = async (id) => { await supabase.from('shared_entries').delete().eq('id', id); loadShares(); };

  const shown = entries.filter((en) => (filter === 'All' || en.kind === filter) && (!q.trim() || ((en.title || '') + ' ' + en.body).toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><p className="eyebrow">Diary and gratitude</p><h1>My Journal</h1><p style={{ margin: 0 }}>{entries.length} entr{entries.length === 1 ? 'y' : 'ies'} so far. Private unless you choose to share one.</p></section>

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
                <strong>{en.title || 'Untitled'}</strong> <span className="tag">{en.kind}</span> {live(en.id).length > 0 && <span className="tag high">🔗 shared</span>}
                <div className="muted">{new Date(en.created_at).toLocaleString()}</div>
                <p>{en.body}</p>
                <button className="ghost" onClick={() => setEdit(en)}>Edit</button>{' '}
                <button className="ghost" onClick={() => setPanel(panel === en.id ? null : en.id)}>🔗 Share link</button>{' '}
                <button className="ghost" onClick={() => remove(en.id)}>Delete</button>
                {panel === en.id && (
                  <div className="sharebox">
                    <p className="muted">Anyone who has the link can read <strong>this one entry</strong> until it expires. Nothing else in your journal is visible, and your name and email are never shown. You can stop sharing at any time.</p>
                    <label>Link works for{' '}
                      <select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[[1, '1 day'], [3, '3 days'], [7, '7 days']].map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select>
                    </label>{' '}
                    <button onClick={() => createLink(en)}>Create new link</button>
                    {live(en.id).map((s) => (
                      <div key={s.id} className="linkbox">
                        <input readOnly value={url(s.token)} onFocus={(e) => e.target.select()} aria-label="Share link" />
                        <button onClick={() => copy(s.token)}>{copied === s.token ? 'Copied ✓' : 'Copy'}</button>
                        <button className="ghost" onClick={() => nativeShare(s.token, en.title)}>Share…</button>
                        <button className="ghost" onClick={() => stop(s.id)}>Stop sharing</button>
                        <small className="muted" style={{ flexBasis: '100%' }}>Expires {new Date(s.expires_at).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
