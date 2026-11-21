# Bloom 2027 – Phase 1

Login, dashboard, Little by Little (activities + streak), mood check-in, journal.
Your data is private: each row is locked to the logged-in user (Row Level Security).

## 1. Set up Supabase (free)
1. Go to supabase.com, create an account and a new project.
2. SQL Editor -> New query -> paste everything from `supabase.sql` -> Run.
3. Project Settings -> API: copy the Project URL and the anon public key.

## 2. Run it on your computer
1. Install Node.js (nodejs.org, LTS version).
2. In this folder, copy `.env.example` to `.env.local` and paste your two values.
3. Run `npm install` then `npm run dev` and open http://localhost:3000

Tip: in Supabase, Authentication -> Providers -> Email, turn off "Confirm email" while testing so sign-up logs you in straight away.

## 3. Put it online with Vercel
1. Upload this folder to a new GitHub repository (do NOT upload `.env.local`).
2. vercel.com -> Add New -> Project -> import the repository.
3. Before clicking Deploy, open Environment Variables and add the same two values from `.env.local`.
4. Deploy. You get a `your-project.vercel.app` link.
5. In Supabase: Authentication -> URL Configuration -> set Site URL to your Vercel link.
