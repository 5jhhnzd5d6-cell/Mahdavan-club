-- MAHDAVAN CLUB: جدول همگام‌سازی
-- این اسکریپت را یک بار در Supabase > SQL Editor اجرا کنید (Run).

create table if not exists public.app_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

-- هر کاربر فقط ردیف خودش را می‌بیند و تغییر می‌دهد
drop policy if exists "own row select" on public.app_data;
drop policy if exists "own row insert" on public.app_data;
drop policy if exists "own row update" on public.app_data;

create policy "own row select" on public.app_data
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own row insert" on public.app_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own row update" on public.app_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
