'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';

export function useUser() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/');
      else setUser(data.session.user);
    });
  }, [router]);
  return user;
}

export const today = () => new Date().toLocaleDateString('en-CA');
