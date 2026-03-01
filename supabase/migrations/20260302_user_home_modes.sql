create table if not exists public.user_home_modes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check (mode in ('a', 'b', 'c')) default 'c',
  updated_at timestamptz not null default now()
);

create index if not exists user_home_modes_mode_idx
  on public.user_home_modes (mode);

alter table public.user_home_modes enable row level security;

drop policy if exists "user_home_modes_select_own" on public.user_home_modes;
create policy "user_home_modes_select_own"
  on public.user_home_modes
  for select
  using (auth.uid() = user_id);
