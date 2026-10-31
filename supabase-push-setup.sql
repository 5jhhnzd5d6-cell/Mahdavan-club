-- Mahdavan Club: real push notifications (run once in Supabase -> SQL Editor)
create table if not exists public.push_subs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "own subs" on public.push_subs;
create policy "own subs" on public.push_subs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.push_sent (
  key text primary key,
  user_id uuid,
  sent_at timestamptz not null default now()
);
alter table public.push_sent enable row level security; -- no policy: only the server can use it

create extension if not exists pg_net;
create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('mahdavan-reminders'); exception when others then null; end $$;
select cron.schedule('mahdavan-reminders', '* * * * *', $job$
  select net.http_post(
    url := 'https://iymqhbkzscdtjzwghwqa.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type":"application/json","x-cron-secret":"e7986ed59e0f134410abc5a7ff704431b4af7737b3756730"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$job$);
