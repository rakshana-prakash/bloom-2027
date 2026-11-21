-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
create table activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  activity text not null,
  unique (user_id, day, activity)
);
create table moods (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  mood text not null,
  unique (user_id, day)
);
create table journal (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  title text,
  body text not null
);
alter table activity_log enable row level security;
alter table moods enable row level security;
alter table journal enable row level security;
create policy "own rows" on activity_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on moods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on journal for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
