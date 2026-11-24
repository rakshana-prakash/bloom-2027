'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const MAIN = [['/dashboard', 'Home', '🏡'], ['/mood', 'Mood', '🙂'], ['/journal', 'Journal', '📖'], ['/sounds', 'Sounds', '🎧'], ['/memories', 'Memories', '📷']];
const MORE = [['/planner', 'Planner', '🗓️'], ['/inspiration', 'Inspiration', '💌'], ['/vision', 'Vision board', '🌸'], ['/capsule', 'Time capsule', '🕰️'], ['/openwhen', 'Open when…', '✉️'], ['/recap', 'My Little Recap', '🌱']];

export default function Nav() {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  async function logout() { await supabase.auth.signOut(); router.replace('/'); }
  return (
    <>
      {open && <div className="sheet-bg" onClick={() => setOpen(false)} />}
      {open && (
        <div className="sheet">
          {MORE.map(([h, l, i]) => (
            <Link key={h} href={h} className="tile-s" aria-current={path === h ? 'page' : undefined} onClick={() => setOpen(false)}><span aria-hidden>{i}</span>{l}</Link>
          ))}
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      )}
      <nav className="dock" aria-label="Main">
        {MAIN.map(([h, l, i]) => (
          <Link key={h} href={h} className="dk" aria-current={path === h ? 'page' : undefined}><span aria-hidden>{i}</span><em>{l}</em></Link>
        ))}
        <button className={'dk' + (open || MORE.some(([h]) => h === path) ? ' on' : '')} aria-expanded={open} onClick={() => setOpen(!open)}><span aria-hidden>✨</span><em>More</em></button>
      </nav>
    </>
  );
}
