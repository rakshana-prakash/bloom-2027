'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const ITEMS = [
  ['/dashboard', 'Home', '🏡'], ['/planner', 'Planner', '🗓️'], ['/goals', 'Goals & Habits', '🎯'],
  ['/inspiration', 'Inspiration', '💌'], ['/sounds', 'Sound Space', '🎧'], ['/focus', 'Focus Room', '⏳'],
  ['/memories', 'Memory Lane', '📷'], ['/vision', 'Vision Board', '🌸'], ['/bucket', 'Bucket List', '🪣'], ['/journal', 'Journal', '📖'],
];

export default function Nav() {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  async function logout() { await supabase.auth.signOut(); router.replace('/'); }
  return (
    <>
      <header className="topbar">
        <Link href="/dashboard" className="brand">Bloom 2027</Link>
        <button className="ghost" aria-expanded={open} aria-controls="sidenav" onClick={() => setOpen(!open)}>{open ? 'Close' : '☰ Menu'}</button>
      </header>
      <nav id="sidenav" className={'side' + (open ? ' open' : '')} aria-label="Main">
        <Link href="/dashboard" className="brand">Bloom <span>2027</span></Link>
        <ul>
          {ITEMS.map(([href, label, icon]) => (
            <li key={href}>
              <Link href={href} className="link" aria-current={path === href ? 'page' : undefined} onClick={() => setOpen(false)}>
                <span aria-hidden>{icon}</span>{label}
              </Link>
            </li>
          ))}
        </ul>
        <button className="ghost logout" onClick={logout}>Log out</button>
      </nav>
    </>
  );
}
