'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace('/dashboard'); });
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    const { data, error } = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    if (data.session) router.push('/dashboard');
    else setMsg('Check your email to confirm your account, then log in.');
  }

  return (
    <main className="wrap">
      <div className="card hero" style={{ marginTop: '3rem' }}>
        <h1 style={{ fontSize: '2.4rem' }}>Bloom 2027</h1>
        <p>Plan your days. Nurture your mind. Collect your memories.</p>
      </div>
      <form className="card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create your account'}</h2>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (6+ characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">{mode === 'login' ? 'Log in' : 'Sign up'}</button>{' '}
        <button type="button" className="ghost" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'New here? Sign up' : 'Have an account? Log in'}
        </button>
        {msg && <p className="muted" role="status">{msg}</p>}
      </form>
    </main>
  );
}
