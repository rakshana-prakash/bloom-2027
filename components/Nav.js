'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const LINKS = [['/dashboard', 'Dashboard'], ['/planner', 'Planner'], ['/goals', 'Goals'], ['/inspiration', 'Inspiration'], ['/sounds', 'Sounds'], ['/focus', 'Focus'], ['/journal', 'Journal']];

export default function Nav() {
  const router = useRouter();
  async function logout() { await supabase.auth.signOut(); router.replace('/'); }
  return (
    <nav>
      <Link href="/dashboard" className="brand">Bloom 2027</Link>
      {LINKS.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      <button className="ghost" onClick={logout}>Log out</button>
    </nav>
  );
}
