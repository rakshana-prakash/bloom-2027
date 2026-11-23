'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import { uploadPhoto, signedUrls, removePhotos } from '../../lib/photos';
import Nav from '../../components/Nav';

export default function Memories() {
  const user = useUser();
  const [mems, setMems] = useState([]);
  const [urls, setUrls] = useState({});
  const [f, setF] = useState({ caption: '', taken_on: '', location: '' });
  const [file, setFile] = useState(null);
  const [fkey, setFkey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [favOnly, setFavOnly] = useState(false);

  async function load() {
    const { data } = await supabase.from('memories').select('*').order('taken_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    setMems(data || []);
    setUrls(await signedUrls((data || []).map((m) => m.path)));
  }
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <main className="wrap">Loading…</main>;

  async function add(e) {
    e.preventDefault();
    if (!file) return setErr('Choose a photo first.');
    setBusy(true); setErr('');
    const { path, error } = await uploadPhoto(user.id, file);
    if (error) { setErr(error); setBusy(false); return; }
    await supabase.from('memories').insert({ path, caption: f.caption || null, taken_on: f.taken_on || null, location: f.location || null });
    setF({ caption: '', taken_on: '', location: '' }); setFile(null); setFkey(fkey + 1); setBusy(false); load();
  }
  const fav = async (m) => { await supabase.from('memories').update({ favourite: !m.favourite }).eq('id', m.id); load(); };
  async function del(m) {
    if (!window.confirm('Delete this memory?')) return;
    await removePhotos([m.path]);
    await supabase.from('memories').delete().eq('id', m.id); load();
  }
  async function download(m) {
    const { data } = await supabase.storage.from('photos').createSignedUrl(m.path, 60, { download: 'memory.jpg' });
    if (data) window.location.href = data.signedUrl;
  }

  const shown = favOnly ? mems.filter((m) => m.favourite) : mems;
  const groups = {};
  shown.forEach((m) => { const k = (m.taken_on || m.created_at.slice(0, 10)).slice(0, 7); (groups[k] ||= []).push(m); });

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><h1>Memory Lane</h1><p style={{ margin: 0 }}>Your private photo album, grouped by month. Only you can see these.</p></section>

      <form className="card" onSubmit={add}>
        <h2>Add a memory</h2>
        <input key={fkey} type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} aria-label="Photo" />
        <input placeholder="Caption" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} />
        <input style={{ width: 'auto' }} type="date" aria-label="Date" value={f.taken_on} onChange={(e) => setF({ ...f, taken_on: e.target.value })} />{' '}
        <input style={{ width: 'auto' }} placeholder="Place (optional)" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />{' '}
        <button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Save memory'}</button>
        {err && <p role="alert" className="muted">{err}</p>}
      </form>

      <div className="pills">
        <button className={favOnly ? 'ghost' : ''} onClick={() => setFavOnly(false)}>All</button>
        <button className={favOnly ? '' : 'ghost'} onClick={() => setFavOnly(true)}>♥ Favourites</button>
      </div>
      {shown.length === 0 && <section className="card"><p className="muted">No memories here yet.</p></section>}
      {Object.keys(groups).sort().reverse().map((k) => (
        <section key={k} className="card">
          <h2>{new Date(k + '-01T00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <div className="photos">
            {groups[k].map((m) => (
              <figure key={m.id}>
                {urls[m.path] && <img src={urls[m.path]} alt={m.caption || 'Memory photo'} loading="lazy" />}
                <figcaption>
                  {m.caption && <strong>{m.caption}</strong>}
                  <div className="muted">{[m.taken_on, m.location].filter(Boolean).join(' · ')}</div>
                  <button className="ghost" onClick={() => fav(m)} aria-label="Favourite">{m.favourite ? '♥' : '♡'}</button>{' '}
                  <button className="ghost" onClick={() => download(m)}>Save</button>{' '}
                  <button className="ghost" onClick={() => del(m)}>Delete</button>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
