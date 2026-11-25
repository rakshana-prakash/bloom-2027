'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function Shared() {
  const { token } = useParams();
  const [entry, setEntry] = useState(undefined);

  useEffect(() => {
    if (!token) return;
    supabase.rpc('get_shared_entry', { p_token: String(token) }).then(({ data, error }) => setEntry(!error && data && data.length ? data[0] : null));
  }, [token]);

  return (
    <main className="wrap" style={{ paddingBottom: '3rem' }}>
      {entry === undefined && <section className="card"><p className="muted">Opening…</p></section>}
      {entry === null && (
        <section className="card hero">
          <h1>This link has ended</h1>
          <p>It may have expired, or the person stopped sharing it.</p>
          <Link href="/">Visit Bloom 2027</Link>
        </section>
      )}
      {entry && (
        <>
          <section className="card hero"><p className="eyebrow">Shared with you</p><h1>{entry.title || 'A page from a journal'}</h1><p className="muted" style={{ margin: 0 }}>{entry.kind} · {new Date(entry.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p></section>
          <article className="card" style={{ whiteSpace: 'pre-wrap', fontSize: '1.08rem' }}>{entry.body}</article>
          <p className="muted" style={{ textAlign: 'center' }}>This link works until {new Date(entry.expires_at).toLocaleString()}. Shared privately from <Link href="/">Bloom 2027</Link>.</p>
        </>
      )}
    </main>
  );
}
