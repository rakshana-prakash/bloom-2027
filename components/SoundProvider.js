'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export const SOUNDS = [
  { id: 'rain', label: 'Rain', icon: '🌧️' }, { id: 'thunder', label: 'Thunder', icon: '⛈️' },
  { id: 'ocean', label: 'Ocean waves', icon: '🌊' }, { id: 'birds', label: 'Forest birds', icon: '🐦' },
  { id: 'fire', label: 'Fireplace', icon: '🔥' }, { id: 'night', label: 'Night crickets', icon: '🌙' },
  { id: 'wind', label: 'Wind', icon: '🍃' }, { id: 'piano', label: 'Soft piano', icon: '🎹' },
  { id: 'white', label: 'White noise', icon: '📻' },
];

function makeNoise(ctx, type) {
  const n = ctx.sampleRate * 4, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (type === 'white') d[i] = w;
    else if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
  }
  return buf;
}

// Each builder makes a sound with the Web Audio API and returns a stop function.
const BUILD = {
  rain(ctx, out, noise) {
    const s = ctx.createBufferSource(); s.buffer = noise('pink'); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 700;
    s.connect(f); f.connect(out); s.start(); return () => s.stop();
  },
  ocean(ctx, out, noise) {
    const s = ctx.createBufferSource(); s.buffer = noise('brown'); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const mod = ctx.createGain(); mod.gain.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lg = ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(mod.gain);
    s.connect(f); f.connect(mod); mod.connect(out); s.start(); lfo.start();
    return () => { s.stop(); lfo.stop(); };
  },
  wind(ctx, out, noise) {
    const s = ctx.createBufferSource(); s.buffer = noise('white'); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = ctx.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency);
    s.connect(f); f.connect(out); s.start(); lfo.start();
    return () => { s.stop(); lfo.stop(); };
  },
  white(ctx, out, noise) {
    const s = ctx.createBufferSource(); s.buffer = noise('white'); s.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.35; s.connect(g); g.connect(out); s.start(); return () => s.stop();
  },
  fire(ctx, out, noise) {
    const s = ctx.createBufferSource(); s.buffer = noise('brown'); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    const g = ctx.createGain(); g.gain.value = 0.7; s.connect(f); f.connect(g); g.connect(out); s.start();
    let dead = false, t;
    const pop = () => {
      if (dead) return;
      const p = ctx.createBufferSource(); p.buffer = noise('white');
      const pg = ctx.createGain(); pg.gain.setValueAtTime(0.5 * Math.random() + 0.1, ctx.currentTime);
      pg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
      p.connect(hp); hp.connect(pg); pg.connect(out); p.start(ctx.currentTime, Math.random() * 2, 0.06);
      t = setTimeout(pop, 80 + Math.random() * 450);
    };
    pop(); return () => { dead = true; clearTimeout(t); s.stop(); };
  },
  birds(ctx, out) {
    let dead = false, t;
    const chirp = (when) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = 2200 + Math.random() * 1800;
      o.frequency.setValueAtTime(f, when); o.frequency.linearRampToValueAtTime(f * 1.4, when + 0.12);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.18, when + 0.02); g.gain.linearRampToValueAtTime(0, when + 0.15);
      o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.2);
    };
    const loop = () => {
      if (dead) return;
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) chirp(ctx.currentTime + i * 0.2);
      t = setTimeout(loop, 1500 + Math.random() * 3500);
    };
    loop(); return () => { dead = true; clearTimeout(t); };
  },
  night(ctx, out) {
    const nodes = [4300, 4650].map((fr, i) => {
      const o = ctx.createOscillator(); o.frequency.value = fr;
      const g = ctx.createGain(); g.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 8 + i * 3;
      const lg = ctx.createGain(); lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(out); o.start(); lfo.start(); return [o, lfo];
    });
    return () => nodes.flat().forEach((n) => n.stop());
  },
  piano(ctx, out) {
    const notes = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3];
    let dead = false, t;
    const loop = () => {
      if (dead) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), now = ctx.currentTime;
      o.type = 'triangle'; o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.25, now + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
      o.connect(g); g.connect(out); o.start(now); o.stop(now + 3.3);
      t = setTimeout(loop, 1800 + Math.random() * 2500);
    };
    loop(); return () => { dead = true; clearTimeout(t); };
  },
  thunder(ctx, out, noise) {
    let dead = false, t;
    const loop = () => {
      if (dead) return;
      const s = ctx.createBufferSource(); s.buffer = noise('brown');
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150;
      const g = ctx.createGain(), now = ctx.currentTime;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + 0.3); g.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
      s.connect(f); f.connect(g); g.connect(out); s.start(now, Math.random(), 3.6);
      t = setTimeout(loop, 9000 + Math.random() * 12000);
    };
    t = setTimeout(loop, 1500); return () => { dead = true; clearTimeout(t); };
  },
};

const Ctx = createContext({ levels: {}, setLevel() {}, setMix() {}, stopAll() {}, beep() {}, sleepLeft: 0, startSleep() {} });
export const useSound = () => useContext(Ctx);

export default function SoundProvider({ children }) {
  const eng = useRef({ ctx: null, master: null, nodes: {}, cache: {} });
  const [levels, setLevels] = useState({});
  const [sleepAt, setSleepAt] = useState(null);
  const [sleepLeft, setSleepLeft] = useState(0);

  function ensure() {
    const e = eng.current;
    if (!e.ctx) {
      e.ctx = new (window.AudioContext || window.webkitAudioContext)();
      e.master = e.ctx.createGain(); e.master.gain.value = 0.8; e.master.connect(e.ctx.destination);
    }
    if (e.ctx.state === 'suspended') e.ctx.resume();
    return e;
  }
  const noise = (type) => { const e = eng.current; return (e.cache[type] ||= makeNoise(e.ctx, type)); };

  function setLevel(id, v) {
    setLevels((l) => ({ ...l, [id]: v }));
    const e = eng.current;
    if (v > 0) {
      ensure();
      let n = e.nodes[id];
      if (!n) {
        const vol = e.ctx.createGain(); vol.gain.value = 0; vol.connect(e.master);
        n = { vol, stop: BUILD[id](e.ctx, vol, noise) }; e.nodes[id] = n;
      }
      clearTimeout(n.kill);
      n.vol.gain.setTargetAtTime(v * 0.8, e.ctx.currentTime, 0.1);
    } else if (e.nodes[id]) {
      const n = e.nodes[id];
      n.vol.gain.setTargetAtTime(0, e.ctx.currentTime, 0.15);
      n.kill = setTimeout(() => { n.stop(); n.vol.disconnect(); delete e.nodes[id]; }, 800);
    }
  }
  const setMix = (mix) => SOUNDS.forEach((s) => setLevel(s.id, mix[s.id] || 0));
  const stopAll = () => { setMix({}); setSleepAt(null); };
  function startSleep(min) { setSleepAt(min ? Date.now() + min * 60000 : null); }
  function beep() {
    const e = ensure();
    [660, 880].forEach((f, i) => {
      const o = e.ctx.createOscillator(), g = e.ctx.createGain(), t = e.ctx.currentTime + i * 0.25;
      o.frequency.value = f; g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g); g.connect(e.ctx.destination); o.start(t); o.stop(t + 0.7);
    });
  }

  useEffect(() => {
    if (!sleepAt) { setSleepLeft(0); return; }
    const id = setInterval(() => {
      const left = Math.ceil((sleepAt - Date.now()) / 1000);
      if (left <= 0) { clearInterval(id); stopAll(); } else setSleepLeft(left);
    }, 1000);
    return () => clearInterval(id);
  }, [sleepAt]);


  // ---- music player (user's own songs) ----
  const au = useRef(null);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [mvol, setMvolState] = useState(0.9);
  const st = useRef({}); st.current = { queue, idx, shuffle, repeat };

  useEffect(() => {
    const a = new Audio(); a.preload = 'auto'; a.volume = 0.9; au.current = a;
    a.ontimeupdate = () => setTime(a.currentTime);
    a.onloadedmetadata = () => setDur(a.duration || 0);
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    a.onended = () => advance(1, true);
    return () => { a.pause(); a.removeAttribute('src'); };
  }, []);

  async function loadSong(list, i) {
    const song = list[i]; if (!song) return;
    setQueue(list); setIdx(i);
    const { data } = await supabase.storage.from('music').createSignedUrl(song.path, 3600);
    if (!data) return;
    const a = au.current; a.src = data.signedUrl;
    try { await a.play(); } catch {}
    supabase.from('songs').update({ last_played: new Date().toISOString() }).eq('id', song.id).then(() => {});
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist || 'Bloom 2027' });
      navigator.mediaSession.setActionHandler('nexttrack', () => advance(1));
      navigator.mediaSession.setActionHandler('previoustrack', () => advance(-1));
    }
  }
  function advance(dir, auto) {
    const { queue: q, idx: i, shuffle: sh, repeat: rp } = st.current;
    if (!q.length) return;
    if (auto && rp === 'one') { au.current.currentTime = 0; au.current.play(); return; }
    let n = i + dir;
    if (sh && q.length > 1) { do { n = Math.floor(Math.random() * q.length); } while (n === i); }
    if (n >= q.length) { if (rp === 'all' || !auto) n = 0; else { setPlaying(false); return; } }
    if (n < 0) n = q.length - 1;
    loadSong(q, n);
  }
  const toggleMusic = () => { const a = au.current; if (a && a.src) (a.paused ? a.play() : a.pause()); };
  const seek = (t) => { if (au.current) au.current.currentTime = t; };
  const setMvol = (v) => { setMvolState(v); if (au.current) au.current.volume = v; };
  const stopMusic = () => { au.current?.pause(); au.current?.removeAttribute('src'); setQueue([]); setIdx(-1); setTime(0); setDur(0); };
  const current = queue[idx] || null;
  const music = { current, playing, shuffle, repeat, time, dur, mvol, play: loadSong, next: () => advance(1), prev: () => (time > 3 ? seek(0) : advance(-1)), toggle: toggleMusic, seek, setShuffle, setRepeat, setMvol, stop: stopMusic };

  const active = SOUNDS.filter((s) => levels[s.id] > 0);
  return (
    <Ctx.Provider value={{ levels, setLevel, setMix, stopAll, beep, sleepLeft, startSleep, music }}>
      {children}
      {(active.length > 0 || current) && (
        <div className="mini" role="region" aria-label="Sound player">
          {current && (
            <>
              <span className={'eq' + (playing ? ' on' : '')} aria-hidden><i /><i /><i /></span>
              <strong className="minititle">{current.title}</strong>
              <button className="ghost" onClick={() => advance(-1)} aria-label="Previous">⏮</button>
              <button onClick={toggleMusic} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '⏸' : '▶'}</button>
              <button className="ghost" onClick={() => advance(1)} aria-label="Next">⏭</button>
            </>
          )}
          {active.length > 0 && <span>🌿 {active.map((x) => x.label).join(', ')}</span>}
          {sleepLeft > 0 && <span style={{ color: '#cfd8cc' }}>sleeps in {Math.ceil(sleepLeft / 60)} min</span>}
          <Link href="/sounds">Open</Link>
          <button className="ghost" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => { stopAll(); stopMusic(); }}>Stop all</button>
        </div>
      )}
    </Ctx.Provider>
  );
}
