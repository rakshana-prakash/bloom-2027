'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/useUser';
import { uploadPhoto, signedUrls, removePhotos } from '../../lib/photos';
import Nav from '../../components/Nav';

const BGS = ['#d5e0cc', '#f2d6da', '#f5ecd9', '#dfe6f2', '#ffffff'];
const STICKERS = ['🌸', '⭐', '🦋', '☀️', '💛', '🌈', '✨', '🌿'];

export default function Vision() {
  const user = useUser();
  const boardRef = useRef(null);
  const drag = useRef(null);
  const [boards, setBoards] = useState([]);
  const [bid, setBid] = useState(null);
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [text, setText] = useState('');
  const [newName, setNewName] = useState('');
  const [fkey, setFkey] = useState(0);
  const [err, setErr] = useState('');

  async function loadBoards() {
    let { data } = await supabase.from('boards').select('*').order('id');
    if (data && data.length === 0) {
      await supabase.from('boards').insert({ name: 'My 2027 vision' });
      ({ data } = await supabase.from('boards').select('*').order('id'));
    }
    setBoards(data || []);
    setBid((cur) => cur ?? data?.[0]?.id ?? null);
  }
  async function loadItems() {
    if (!bid) return;
    const { data } = await supabase.from('vision_items').select('*').eq('board_id', bid).order('id');
    setItems(data || []);
    setUrls(await signedUrls((data || []).filter((i) => i.kind === 'image').map((i) => i.content)));
  }
  useEffect(() => { if (user) loadBoards(); }, [user]);
  useEffect(() => { if (user) loadItems(); }, [user, bid]);
  if (!user) return <main className="wrap">Loading…</main>;

  const board = boards.find((b) => b.id === bid);
  const addItem = async (kind, content, w) => { await supabase.from('vision_items').insert({ board_id: bid, kind, content, w, x: 8 + Math.random() * 40, y: 8 + Math.random() * 40 }); loadItems(); };
  async function addImage(e) {
    const file = e.target.files[0]; if (!file) return;
    setErr('');
    const { path, error } = await uploadPhoto(user.id, file);
    if (error) setErr(error); else await addItem('image', path, 30);
    setFkey(fkey + 1);
  }
  async function addText(e) { e.preventDefault(); if (!text.trim()) return; await addItem('text', text.trim(), 30); setText(''); }
  const setBg = async (bg) => { await supabase.from('boards').update({ bg }).eq('id', bid); loadBoards(); };
  async function newBoard(e) {
    e.preventDefault(); if (!newName.trim()) return;
    const { data } = await supabase.from('boards').insert({ name: newName.trim() }).select().single();
    setNewName(''); await loadBoards(); if (data) setBid(data.id);
  }
  async function delBoard() {
    if (!window.confirm('Delete this whole board?')) return;
    await removePhotos(items.filter((i) => i.kind === 'image').map((i) => i.content));
    await supabase.from('boards').delete().eq('id', bid);
    setBid(null); await loadBoards();
  }
  async function delItem(it) {
    if (it.kind === 'image') await removePhotos([it.content]);
    await supabase.from('vision_items').delete().eq('id', it.id); loadItems();
  }
  async function resize(it, d) {
    const w = Math.max(8, Math.min(90, it.w + d));
    setItems(items.map((i) => (i.id === it.id ? { ...i, w } : i)));
    await supabase.from('vision_items').update({ w }).eq('id', it.id);
  }

  function down(e, it) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: it.id, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y };
  }
  function move(e) {
    const d = drag.current; if (!d) return;
    const r = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(92, d.ox + ((e.clientX - d.sx) / r.width) * 100));
    const y = Math.max(0, Math.min(92, d.oy + ((e.clientY - d.sy) / r.height) * 100));
    d.x = x; d.y = y;
    setItems((list) => list.map((i) => (i.id === d.id ? { ...i, x, y } : i)));
  }
  async function up() {
    const d = drag.current; drag.current = null;
    if (d && d.x !== undefined) await supabase.from('vision_items').update({ x: d.x, y: d.y }).eq('id', d.id);
  }

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><h1>My Vision Board</h1><p style={{ margin: 0 }}>Drag pictures, words and stickers around. Everything saves automatically.</p></section>

      <section className="card">
        <div className="pills">
          {boards.map((b) => <button key={b.id} className={b.id === bid ? '' : 'ghost'} onClick={() => setBid(b.id)}>{b.name}</button>)}
        </div>
        <form onSubmit={newBoard}><input placeholder="New board name" value={newName} onChange={(e) => setNewName(e.target.value)} /><button type="submit">Create board</button></form>
      </section>

      {board && (
        <>
          <section className="card">
            <h2>Add to “{board.name}”</h2>
            <input key={fkey} type="file" accept="image/*" onChange={addImage} aria-label="Add a picture" />
            {err && <p role="alert" className="muted">{err}</p>}
            <form onSubmit={addText}><input placeholder="A quote or goal, e.g. Travel more" value={text} onChange={(e) => setText(e.target.value)} /><button type="submit">Add words</button></form>
            <div className="pills" style={{ marginTop: '.6rem' }}>
              {STICKERS.map((s) => <button key={s} className="ghost" onClick={() => addItem('sticker', s, 12)} aria-label={'Add sticker ' + s}>{s}</button>)}
            </div>
            <div className="pills">
              <span className="muted">Background:</span>
              {BGS.map((c) => <button key={c} onClick={() => setBg(c)} aria-label={'Background ' + c} style={{ background: c, border: board.bg === c ? '3px solid var(--moss)' : '1px solid #b9c7ae', width: '2rem', height: '2rem', padding: 0 }} />)}
              <button className="ghost" onClick={delBoard}>Delete board</button>
            </div>
          </section>

          <div className="board" ref={boardRef} style={{ background: board.bg }}>
            {items.length === 0 && <p className="muted" style={{ padding: '1rem' }}>Your board is empty. Add a picture, some words or a sticker above.</p>}
            {items.map((it) => (
              <div key={it.id} className="vitem" style={{ left: it.x + '%', top: it.y + '%', width: it.kind === 'sticker' ? 'auto' : it.w + '%' }}
                onPointerDown={(e) => down(e, it)} onPointerMove={move} onPointerUp={up}>
                {it.kind === 'image' && urls[it.content] && <img src={urls[it.content]} alt="Vision board" draggable={false} />}
                {it.kind === 'text' && <div className="vtext" style={{ fontSize: it.w / 30 + 'rem' }}>{it.content}</div>}
                {it.kind === 'sticker' && <div style={{ fontSize: it.w / 6 + 'rem', lineHeight: 1 }}>{it.content}</div>}
                <div className="vctl" onPointerDown={(e) => e.stopPropagation()}>
                  <button onClick={() => resize(it, 6)} aria-label="Bigger">+</button>
                  <button onClick={() => resize(it, -6)} aria-label="Smaller">−</button>
                  <button onClick={() => delItem(it)} aria-label="Remove">✕</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
