'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const SCENES = ['Plan your days.', 'Nurture your mind.', 'Collect your memories.'];
const SUBS = ['A calm place for the little things.', 'Mood, music, rain and quiet moments.', 'Photos, letters and dreams, kept safe.'];
const PETALS = ['🌸', '🍃', '✨', '🌼', '🌿'];

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [scene, setScene] = useState(0);
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace('/dashboard'); });
    setPetals(Array.from({ length: 16 }, (_, i) => ({ e: PETALS[i % 5], l: Math.random() * 100, s: 1 + Math.random() * 1.4, d: 9 + Math.random() * 9, de: -Math.random() * 14, w: (Math.random() - 0.5) * 30 })));
    const id = setInterval(() => setScene((s) => (s + 1) % 3), 4600);
    return () => clearInterval(id);
  }, [router]);

  function parallax(e) {
    const t = e.currentTarget;
    t.style.setProperty('--mx', (e.clientX / window.innerWidth - 0.5) * 2);
    t.style.setProperty('--my', (e.clientY / window.innerHeight - 0.5) * 2);
  }
  async function submit(e) {
    e.preventDefault(); setMsg('');
    const { data, error } = mode === 'signup' ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    if (data.session) router.push('/dashboard'); else setMsg('Check your email to confirm your account, then log in.');
  }

  return (
    <main className="cine" onMouseMove={parallax}>
      <div className="cine-bg" aria-hidden>{[0, 1, 2].map((i) => <i key={i} className={'sc' + i + (scene === i ? ' on' : '')} />)}</div>
      <div aria-hidden><i className="pb" style={{ '--k': 40, width: 340, height: 340, left: '8%', top: '12%', background: '#f9d7df' }} /><i className="pb" style={{ '--k': -60, width: 420, height: 420, right: '6%', top: '30%', background: '#ddd2f6' }} /><i className="pb" style={{ '--k': 90, width: 260, height: 260, left: '40%', bottom: '4%', background: '#cfe6d3' }} /></div>
      <div aria-hidden>{petals.map((p, i) => <span key={i} className="petal" style={{ left: p.l + '%', fontSize: p.s + 'rem', animationDuration: p.d + 's', animationDelay: p.de + 's', '--sway': p.w + 'vw' }}>{p.e}</span>)}</div>

      <div className="cine-in">
        <div>
          <p className="eyebrow">Bloom 2027</p>
          <h1 className="mega" aria-live="polite">{SCENES[scene].split(' ').map((w, i) => <span key={scene + '-' + i} className="w" style={{ '--i': i }}>{w}</span>)}</h1>
          <p key={'s' + scene} className="subline">{SUBS[scene]}</p>
          <div className="dots" aria-hidden>{[0, 1, 2].map((i) => <i key={i} className={scene === i ? 'on' : ''} />)}</div>
        </div>
        <form className="card" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Welcome back' : 'Begin your year'}</h2>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password (6+ characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">{mode === 'login' ? 'Log in' : 'Sign up'}</button>{' '}
          <button type="button" className="ghost" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'New here? Sign up' : 'Have an account? Log in'}</button>
          {msg && <p className="muted" role="status">{msg}</p>}
        </form>
      </div>
    </main>
  );
}
