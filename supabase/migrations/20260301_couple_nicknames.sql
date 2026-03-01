create extension if not exists pgcrypto;

create table if not exists public.couple_nicknames (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, owner_user_id, target_user_id)
);

create index if not exists couple_nicknames_owner_idx
  on public.couple_nicknames (owner_user_id, couple_id);

create index if not exists couple_nicknames_target_idx
  on public.couple_nicknames (target_user_id, couple_id);

alter table public.couple_nicknames enable row level security;

drop policy if exists "couple_nicknames_select_own" on public.couple_nicknames;
create policy "couple_nicknames_select_own"
  on public.couple_nicknames
  for select
  using (is_couple_member(couple_id) and owner_user_id = auth.uid());

drop policy if exists "couple_nicknames_insert_own" on public.couple_nicknames;
create policy "couple_nicknames_insert_own"
  on public.couple_nicknames
  for insert
  with check (is_couple_member(couple_id) and owner_user_id = auth.uid());

drop policy if exists "couple_nicknames_update_own" on public.couple_nicknames;
create policy "couple_nicknames_update_own"
  on public.couple_nicknames
  for update
  using (is_couple_member(couple_id) and owner_user_id = auth.uid())
  with check (is_couple_member(couple_id) and owner_user_id = auth.uid());

drop policy if exists "couple_nicknames_delete_own" on public.couple_nicknames;
create policy "couple_nicknames_delete_own"
  on public.couple_nicknames
  for delete
  using (is_couple_member(couple_id) and owner_user_id = auth.uid());
