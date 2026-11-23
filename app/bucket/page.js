'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import { uploadPhoto, signedUrls, removePhotos } from '../../lib/photos';
import Nav from '../../components/Nav';

const CATS = ['Learn', 'Visit', 'Read', 'Watch', 'Skill', 'Try', 'Challenge'];

export default function Bucket() {
  const user = useUser();
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('Try');
  const [file, setFile] = useState(null);
  const [fkey, setFkey] = useState(0);
  const [err, setErr] = useState('');

  async function load() {
    const { data } = await supabase.from('bucket_items').select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setUrls(await signedUrls((data || []).map((i) => i.image_path)));
  }
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <main className="wrap">Loading…</main>;

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setErr('');
    let image_path = null;
    if (file) {
      const r = await uploadPhoto(user.id, file);
      if (r.error) return setErr(r.error);
      image_path = r.path;
    }
    await supabase.from('bucket_items').insert({ title: title.trim(), category: cat, image_path });
    setTitle(''); setFile(null); setFkey(fkey + 1); load();
  }
  const toggle = async (i) => { await supabase.from('bucket_items').update({ done: !i.done }).eq('id', i.id); load(); };
  async function del(i) {
    if (i.image_path) await removePhotos([i.image_path]);
    await supabase.from('bucket_items').delete().eq('id', i.id); load();
  }

  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const row = (i) => (
    <li key={i.id}>
      <label>
        <input type="checkbox" checked={i.done} onChange={() => toggle(i)} />
        {i.image_path && urls[i.image_path] && <img src={urls[i.image_path]} alt="" className="thumb" />}
        <span style={{ flex: 1, textDecoration: i.done ? 'line-through' : 'none' }}>{i.title}</span>
        <button type="button" className="ghost" onClick={(e) => { e.preventDefault(); del(i); }}>Delete</button>
      </label>
    </li>
  );

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><h1>My 2027 Bucket List</h1><p style={{ margin: 0 }}>{done.length} done · {open.length} to go</p></section>

      <form className="card" onSubmit={add}>
        <h2>Add something</h2>
        <input placeholder="e.g. Visit a new city" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">{CATS.map((c) => <option key={c}>{c}</option>)}</select>{' '}
        <input key={fkey} style={{ width: 'auto' }} type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} aria-label="Optional picture" />{' '}
        <button type="submit">Add</button>
        {err && <p role="alert" className="muted">{err}</p>}
      </form>

      {open.length === 0 && done.length === 0 && <section className="card"><p className="muted">Your list is empty. Add your first dream above.</p></section>}
      {CATS.map((c) => {
        const list = open.filter((i) => i.category === c);
        return list.length ? <section key={c} className="card"><h2>{c}</h2><ul className="acts">{list.map(row)}</ul></section> : null;
      })}
      {done.length > 0 && <section className="card"><h2>Completed 🎉</h2><ul className="acts">{done.map(row)}</ul></section>}
    </main>
  );
}
