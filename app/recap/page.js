'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser, today } from '../../lib/useUser';
import { EMOJI } from '../../lib/moods';
import { uploadPhoto } from '../../lib/photos';
import Nav from '../../components/Nav';

const ymd = (d) => d.toLocaleDateString('en-CA');
const KINDS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const NOTE_LABEL = { daily: 'Daily achievement', weekly: 'Weekly reflection', monthly: 'Monthly highlight' };

function calcStreak(days) {
  const set = new Set(days), d = new Date();
  if (!set.has(ymd(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

async function fetchData(kind) {
  const now = new Date(), t = ymd(now);
  let from = t;
  if (kind === 'weekly') { const d = new Date(); d.setDate(d.getDate() - 6); from = ymd(d); }
  if (kind === 'monthly') from = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const iso = new Date(from + 'T00:00').toISOString();
  const since = new Date(); since.setDate(since.getDate() - 120);
  const [a, s, b, f, m, h] = await Promise.all([
    supabase.from('activity_log').select('day,activity').gte('day', from).lte('day', t),
    supabase.from('activity_log').select('day').gte('day', ymd(since)),
    supabase.from('planner_items').select('done').gte('day', from).lte('day', t),
    supabase.from('focus_sessions').select('minutes').gte('created_at', iso),
    supabase.from('moods').select('mood').gte('day', from).lte('day', t),
    supabase.from('habit_log').select('id').gte('day', from).lte('day', t),
  ]);
  return { from, t, acts: a.data || [], streakDays: (s.data || []).map((x) => x.day), tasksDone: (b.data || []).filter((x) => x.done).length, focus: (f.data || []).reduce((n, x) => n + x.minutes, 0), moods: m.data || [], habits: (h.data || []).length };
}

function buildCard(kind, d, o) {
  const names = {};
  d.acts.forEach((x) => { names[x.activity] = (names[x.activity] || 0) + 1; });
  const ranked = Object.entries(names).sort((p, q) => q[1] - p[1]);
  const days = new Set(d.acts.map((x) => x.day));
  const streak = calcStreak(d.streakDays);
  const mc = {}; d.moods.forEach((x) => { mc[x.mood] = (mc[x.mood] || 0) + 1; });
  const top = Object.entries(mc).sort((p, q) => q[1] - p[1])[0]?.[0];
  const stats = [];
  if (o.activities) stats.push([String(d.acts.length), 'activities']);
  if (kind !== 'daily') stats.push([days.size + (kind === 'weekly' ? '/7' : ''), 'active days']);
  if (o.streak) stats.push([streak + ' 🔥', 'day streak']);
  if (o.tasks) { stats.push([String(d.tasksDone), 'tasks done']); if (kind !== 'daily') stats.push([String(d.focus), 'focus min']); }
  const now = new Date();
  const sub = kind === 'daily' ? now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : kind === 'weekly' ? new Date(d.from + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' – ' + now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const dots = kind === 'weekly' && o.activities ? [...Array(7)].map((_, i) => { const x = new Date(); x.setDate(x.getDate() - (6 - i)); return days.has(ymd(x)); }) : null;
  return {
    title: kind === 'daily' ? 'A little progress today 🌱' : kind === 'weekly' ? 'My week, little by little' : 'My month in little moments',
    sub, stats: stats.slice(0, 3), dots,
    winsTitle: kind === 'daily' ? 'Today’s little wins' : kind === 'weekly' ? 'Most completed this week' : 'Favourite activities this month',
    wins: o.activities ? (kind === 'daily' ? ranked.map((r) => r[0]).slice(0, 6) : ranked.slice(0, 5).map(([n, c]) => `${n} ×${c}`)) : [],
    mood: o.mood && top ? (kind === 'daily' ? `Feeling ${top.toLowerCase()} ${EMOJI[top]}` : `Mostly ${top.toLowerCase()} ${EMOJI[top]}`) : '',
    note: o.note.trim(), name: o.name ? o.nameText.trim() : '',
  };
}

function draw(canvas, c) {
  const W = 1080, H = 1350, ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#d5e0cc'); g.addColorStop(0.6, '#eef3e8'); g.addColorStop(1, '#f2d6da');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const rr = (x, y, w, h, r, fill) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  rr(60, 60, W - 120, H - 120, 48, 'rgba(255,255,255,.82)');
  const serif = 'Georgia, serif', sans = 'system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a6847'; ctx.font = `600 28px ${sans}`; ctx.fillText('MY LITTLE RECAP', W / 2, 150);
  ctx.fillStyle = '#25302a'; ctx.font = `600 62px ${serif}`; ctx.fillText(c.title, W / 2, 235, 900);
  ctx.fillStyle = '#5d6b60'; ctx.font = `30px ${sans}`; ctx.fillText(c.sub, W / 2, 285, 900);
  if (c.name) ctx.fillText('by ' + c.name, W / 2, 330, 900);
  let y = 380;
  const tw = 270, gap = 35, n = c.stats.length, x0 = (W - (n * tw + (n - 1) * gap)) / 2;
  c.stats.forEach(([v, l], i) => {
    const x = x0 + i * (tw + gap);
    rr(x, y, tw, 190, 28, '#f1f6ec');
    ctx.fillStyle = '#25302a'; ctx.font = `600 62px ${serif}`; ctx.fillText(v, x + tw / 2, y + 95, tw - 20);
    ctx.fillStyle = '#5d6b60'; ctx.font = `26px ${sans}`; ctx.fillText(l, x + tw / 2, y + 145, tw - 20);
  });
  y += 270;
  if (c.dots) {
    c.dots.forEach((on, i) => { ctx.beginPath(); ctx.arc(W / 2 - 150 + i * 50, y, 18, 0, 7); ctx.fillStyle = on ? '#4a6847' : '#d5e0cc'; ctx.fill(); });
    y += 70;
  }
  ctx.textAlign = 'left';
  if (c.wins.length) {
    ctx.fillStyle = '#25302a'; ctx.font = `600 38px ${serif}`; ctx.fillText(c.winsTitle, 130, y, 820); y += 62;
    ctx.font = `34px ${sans}`; ctx.fillStyle = '#3b5439';
    c.wins.forEach((w) => { ctx.fillText('✓  ' + w, 130, y, 820); y += 56; });
    y += 20;
  }
  if (c.mood) { ctx.fillStyle = '#25302a'; ctx.font = `34px ${sans}`; ctx.fillText(c.mood, 130, y, 820); y += 70; }
  if (c.note) {
    ctx.fillStyle = '#3b5439'; ctx.font = `italic 36px ${serif}`;
    let line = '', lines = 0;
    for (const word of c.note.split(/\s+/)) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > 820 && line) { ctx.fillText(line, 130, y); y += 52; line = word; if (++lines >= 4) break; } else line = test;
    }
    if (lines < 4 && line) ctx.fillText(line, 130, y);
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#4a6847'; ctx.font = `600 24px ${sans}`;
  ctx.fillText('BLOOM 2027 · MY PERSONAL JOURNEY', W / 2, H - 110);
}

const toText = (c) => [c.title, c.sub, c.name && 'by ' + c.name, '', ...c.stats.map(([v, l]) => `${v} ${l}`), c.wins.length ? '' : null, ...(c.wins.length ? [c.winsTitle, ...c.wins.map((w) => '✓ ' + w)] : []), c.mood, c.note && `“${c.note}”`, '', 'Bloom 2027'].filter((x) => x !== null && x !== undefined && x !== false).join('\n');

export default function Recap() {
  const user = useUser();
  const ref = useRef(null);
  const [kind, setKind] = useState('daily');
  const [data, setData] = useState(null);
  const [o, setO] = useState({ activities: true, mood: false, streak: true, tasks: true, name: false, nameText: '', note: '' });
  const [status, setStatus] = useState('');

  useEffect(() => { try { const n = localStorage.getItem('bloom-name'); if (n) setO((x) => ({ ...x, nameText: n })); } catch {} }, []);
  useEffect(() => { if (user) { setData(null); fetchData(kind).then(setData); } }, [user, kind]);
  const card = data ? buildCard(kind, data, o) : null;
  const key = JSON.stringify(card);
  useEffect(() => { if (card && ref.current) draw(ref.current, card); }, [key]);
  if (!user) return <main className="wrap">Loading…</main>;

  const set = (k, v) => setO((x) => ({ ...x, [k]: v }));
  const blob = () => new Promise((r) => ref.current.toBlob(r, 'image/png'));
  async function download() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(await blob()); a.download = `little-recap-${today()}.png`; a.click(); URL.revokeObjectURL(a.href);
  }
  async function share() {
    const file = new File([await blob()], 'little-recap.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: 'My Little Recap 🌱' }); } catch {} }
    else setStatus('Image sharing is not available on this device. Use Download, then share the picture yourself.');
  }
  const whatsapp = () => window.open('https://wa.me/?text=' + encodeURIComponent(toText(card)), '_blank');
  async function copy() { try { await navigator.clipboard.writeText(toText(card)); setStatus('Copied the text version.'); } catch { setStatus('Could not copy on this device.'); } }
  async function toMemories() {
    setStatus('Saving…');
    const { path, error } = await uploadPhoto(user.id, new File([await blob()], 'recap.png', { type: 'image/png' }));
    if (error) return setStatus(error);
    await supabase.from('memories').insert({ path, caption: 'My Little Recap · ' + card.sub, taken_on: today() });
    setStatus('Saved to Memory Lane ✓');
  }
  function nameChange(v) { set('nameText', v); try { localStorage.setItem('bloom-name', v); } catch {} }

  return (
    <main className="wrap">
      <Nav />
      <section className="card hero"><p className="eyebrow">Share your progress, not your privacy</p><h1>My Little Recap</h1><p style={{ margin: 0 }}>Nothing is shared until you tap a share button, and your journal is never included.</p></section>

      <div className="pills">{Object.entries(KINDS).map(([k, l]) => <button key={k} className={kind === k ? '' : 'ghost'} onClick={() => setKind(k)}>{l}</button>)}</div>

      <section className="card">
        <h2>What to include</h2>
        {[['activities', 'Activities completed'], ['streak', 'Streak'], ['tasks', 'Tasks and focus time'], ['mood', 'Mood (hidden by default)'], ['name', 'My name']].map(([k, l]) => (
          <label key={k} style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginBottom: '.4rem' }}>
            <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={o[k]} onChange={(e) => set(k, e.target.checked)} />{l}
          </label>
        ))}
        {o.name && <input placeholder="Name on the card" value={o.nameText} onChange={(e) => nameChange(e.target.value)} />}
        <label>{NOTE_LABEL[kind]} (optional)<textarea rows={2} maxLength={160} placeholder="Proud of the little things I did." value={o.note} onChange={(e) => set('note', e.target.value)} /></label>
        <p className="muted">Goals and journal entries are never included.</p>
      </section>

      <section className="card">
        <h2>Preview</h2>
        {!data && <p className="muted">Building your recap…</p>}
        <canvas ref={ref} style={{ width: '100%', maxWidth: 420, height: 'auto', borderRadius: 18, display: data ? 'block' : 'none', margin: '0 auto' }} aria-label="Recap card preview" />
        {data && (
          <div className="pills" style={{ marginTop: '1rem' }}>
            <button onClick={download}>Download image</button>
            <button onClick={share}>Share…</button>
            <button className="ghost" onClick={whatsapp}>WhatsApp text</button>
            <button className="ghost" onClick={copy}>Copy text</button>
            <button className="ghost" onClick={toMemories}>Save to Memory Lane</button>
          </div>
        )}
        {status && <p role="status" className="muted">{status}</p>}
        <p className="muted">On a phone, “Share…” lets you pick Instagram Stories, WhatsApp or other apps.</p>
      </section>
    </main>
  );
}
