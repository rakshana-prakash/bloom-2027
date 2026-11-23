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
const hue = (s = '') => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const cover = (t) => { const h = hue(t); return { background: `linear-gradient(135deg, hsl(${h} 75% 82%), hsl(${(h + 60) % 360} 70% 64%))` }; };
const fmt = (s) => (isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00');

export default function Sounds() {
  const user = useUser();
  const { levels, setLevel, setMix, stopAll, sleepLeft, startSleep, music } = useSound();
  const [songs, setSongs] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [meta, setMeta] = useState({ artist: '', playlist: '' });
  const [msg, setMsg] = useState('');
  const [over, setOver] = useState(false);
  const [name, setName] = useState('');

  const loadSongs = () => supabase.from('songs').select('*').order('created_at', { ascending: false }).then(({ data }) => setSongs(data || []));
  const loadMixes = () => supabase.from('sound_mixes').select('*').order('id', { ascending: false }).then(({ data }) => setMixes(data || []));
  useEffect(() => { if (user) { loadSongs(); loadMixes(); } }, [user]);
  if (!user) return <main className="wrap">Loading…</main>;

  async function upload(files) {
    const list = [...files].filter((f) => f.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(f.name));
    if (!list.length) return setMsg('Please choose audio files (MP3, M4A, WAV, OGG…).');
    let done = 0;
    for (const f of list) {
      if (f.size > 50 * 1024 * 1024) { setMsg(f.name + ' is over 50 MB, so it was skipped.'); continue; }
      setMsg(`Uploading ${done + 1} of ${list.length}…`);
      const path = `${user.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('music').upload(path, f, { contentType: f.type || 'audio/mpeg' });
      if (error) { setMsg(error.message); continue; }
      await supabase.from('songs').insert({ title: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), artist: meta.artist || null, playlist: meta.playlist || null, path });
      done++;
    }
    if (done) setMsg(`Added ${done} song${done > 1 ? 's' : ''} ✓`);
    loadSongs();
  }
  const heart = async (s) => { await supabase.from('songs').update({ favourite: !s.favourite }).eq('id', s.id); loadSongs(); };
  async function del(s) {
    if (!window.confirm('Remove “' + s.title + '”?')) return;
    await supabase.storage.from('music').remove([s.path]);
    await supabase.from('songs').delete().eq('id', s.id); loadSongs();
  }
  async function saveMix(e) {
    e.preventDefault();
    const cur = Object.fromEntries(Object.entries(levels).filter(([, v]) => v > 0));
    if (!name.trim() || !Object.keys(cur).length) return;
    await supabase.from('sound_mixes').insert({ name: name.trim(), levels: cur }); setName(''); loadMixes();
  }
  const delMix = async (id) => { await supabase.from('sound_mixes').delete().eq('id', id); loadMixes(); };

  const dom = Object.entries(levels).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
  const playlists = [...new Set(songs.map((s) => s.playlist).filter(Boolean))];
  let list = songs.filter((s) => (s.title + ' ' + (s.artist || '')).toLowerCase().includes(q.trim().toLowerCase()));
  if (filter === 'fav') list = list.filter((s) => s.favourite);
  else if (filter === 'recent') list = list.filter((s) => s.last_played).sort((a, b) => b.last_played.localeCompare(a.last_played)).slice(0, 12);
  else if (filter !== 'all') list = list.filter((s) => s.playlist === filter);
  const cur = music.current;

  return (
    <>
      <div className="stage-bg" aria-hidden>
        {SOUNDS.map((s) => <i key={s.id} className={s.id + (dom === s.id ? ' on' : '')} />)}
        <i className={'music' + (music.playing && !dom ? ' on' : '')} />
      </div>
      <main className="wrap">
        <Nav />
        <section className="card hero"><p className="eyebrow">Music · ambience · calm</p><h1>My Sound Space</h1><p style={{ margin: 0 }}>Play your favourite songs, then layer rain, waves or a fireplace on top. The player follows you around the site.</p></section>

        <section className="card nowplaying">
          <div className={'vinyl' + (music.playing ? ' spin' : '')} aria-hidden><div className="label" style={cur ? cover(cur.title) : undefined}>{cur ? '♪' : ''}</div></div>
          <div className="npinfo">
            <p className="eyebrow">{cur ? (music.playing ? 'Now playing' : 'Paused') : 'Nothing playing yet'}</p>
            <h2>{cur ? cur.title : 'Pick a song below'}</h2>
            <p className="muted">{cur?.artist || (cur ? '' : 'Upload your own music, then tap a cover to play.')}</p>
            <input type="range" min="0" max={music.dur || 0} step="1" value={Math.min(music.time, music.dur || 0)} onChange={(e) => music.seek(Number(e.target.value))} disabled={!cur} aria-label="Song progress" />
            <div className="muted" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{fmt(music.time)}</span><span>{fmt(music.dur)}</span></div>
            <div className="ctl">
              <button className={music.shuffle ? '' : 'ghost'} onClick={() => music.setShuffle(!music.shuffle)} aria-pressed={music.shuffle} aria-label="Shuffle">🔀</button>
              <button className="ghost" onClick={music.prev} disabled={!cur} aria-label="Previous">⏮</button>
              <button className="bigplay" onClick={music.toggle} disabled={!cur} aria-label={music.playing ? 'Pause' : 'Play'}>{music.playing ? '⏸' : '▶'}</button>
              <button className="ghost" onClick={music.next} disabled={!cur} aria-label="Next">⏭</button>
              <button className={music.repeat === 'off' ? 'ghost' : ''} onClick={() => music.setRepeat(music.repeat === 'off' ? 'all' : music.repeat === 'all' ? 'one' : 'off')} aria-label={'Repeat ' + music.repeat}>{music.repeat === 'one' ? '🔂' : '🔁'}</button>
            </div>
            <label className="muted">Music volume <input type="range" min="0" max="1" step="0.05" value={music.mvol} onChange={(e) => music.setMvol(Number(e.target.value))} /></label>
          </div>
        </section>

        <section className="card">
          <h2>Soundscape</h2>
          <p className="muted">Tap a bubble to start it, then slide to set how loud. Mix as many as you like.</p>
          <div className="pills">
            {Object.entries(MODES).map(([m, mix]) => <button key={m} className="ghost" onClick={() => setMix(mix)}>{m}</button>)}
            <button onClick={stopAll}>Silence</button>
          </div>
          <div className="orbs">
            {SOUNDS.map((s) => {
              const v = levels[s.id] || 0;
              return (
                <div key={s.id} className="orbwrap">
                  <button className={'orb' + (v > 0 ? ' on' : '')} onClick={() => setLevel(s.id, v > 0 ? 0 : 0.5)} aria-pressed={v > 0} aria-label={s.label}>{s.icon}</button>
                  <small>{s.label}</small>
                  {v > 0 && <input type="range" min="0.05" max="1" step="0.05" value={v} onChange={(e) => setLevel(s.id, Number(e.target.value))} aria-label={s.label + ' volume'} />}
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2>My songs</h2>
          <label className={'drop' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}>
            <input type="file" accept="audio/*" multiple onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            <span style={{ fontSize: '2rem' }}>🎵</span><br /><strong>Drop songs here or tap to choose</strong>
            <div className="muted">MP3, M4A, WAV or OGG, up to 50 MB each. Only add music you own or have permission to use.</div>
          </label>
          <div style={{ marginTop: '.7rem' }}>
            <input style={{ width: 'auto', minWidth: '10rem' }} placeholder="Artist (optional)" value={meta.artist} onChange={(e) => setMeta({ ...meta, artist: e.target.value })} />{' '}
            <input style={{ width: 'auto', minWidth: '10rem' }} placeholder="Playlist name (optional)" value={meta.playlist} onChange={(e) => setMeta({ ...meta, playlist: e.target.value })} />
          </div>
          {msg && <p role="status" className="muted">{msg}</p>}
          <input type="search" placeholder="Search your songs" aria-label="Search songs" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="pills">
            {[['all', 'All'], ['fav', '♥ Favourites'], ['recent', 'Recently played'], ...playlists.map((p) => [p, '📁 ' + p])].map(([k, l]) => <button key={k} className={filter === k ? '' : 'ghost'} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
          {list.length === 0 && <p className="muted">{songs.length ? 'No songs here yet.' : 'Your library is empty. Add your first song above.'}</p>}
          <div className="songs">
            {list.map((s, i) => {
              const now = cur?.id === s.id;
              return (
                <div key={s.id} className={'song' + (now ? ' now' : '')} style={cover(s.title)} role="button" tabIndex={0} aria-label={'Play ' + s.title}
                  onClick={() => (now ? music.toggle() : music.play(list, i))} onKeyDown={(e) => { if (e.key === 'Enter') (now ? music.toggle() : music.play(list, i)); }}>
                  <span className="big">{now && music.playing ? <span className="eq on"><i /><i /><i /></span> : '♪'}</span>
                  <span className="playbtn" aria-hidden>{now && music.playing ? '⏸' : '▶'}</span>
                  <b>{s.title}</b><small>{s.artist || s.playlist || ''}</small>
                  <span className="sacts" onClick={(e) => e.stopPropagation()}>
                    <button className="ghost" onClick={() => heart(s)} aria-label="Favourite">{s.favourite ? '♥' : '♡'}</button>
                    <button className="ghost" onClick={() => del(s)} aria-label="Remove song">✕</button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2>Sleep timer &amp; saved mixes</h2>
          <div className="pills">
            {[15, 30, 45, 60].map((m) => <button key={m} className="ghost" onClick={() => startSleep(m)}>{m} min</button>)}
            <button className="ghost" onClick={() => startSleep(0)}>Cancel</button>
          </div>
          {sleepLeft > 0 && <p className="muted">Ambient sounds fade out in about {Math.ceil(sleepLeft / 60)} min.</p>}
          <form onSubmit={saveMix}>
            <input placeholder="Name the current soundscape, e.g. Rainy study" value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit">Save soundscape</button>
          </form>
          {mixes.map((m) => (
            <div key={m.id} className="entry"><strong>{m.name}</strong>{' '}<button onClick={() => setMix(m.levels)}>Play</button>{' '}<button className="ghost" onClick={() => delMix(m.id)}>Delete</button></div>
          ))}
        </section>
      </main>
    </>
  );
}
