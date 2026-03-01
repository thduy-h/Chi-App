create extension if not exists pgcrypto;

create table if not exists public.letter_reads (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  letter_id uuid not null references public.letters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now(),
  unique (letter_id, user_id)
);

create index if not exists letter_reads_couple_idx
  on public.letter_reads (couple_id, letter_id);

alter table public.letter_reads enable row level security;

drop policy if exists "letter_reads_select_member" on public.letter_reads;
create policy "letter_reads_select_member"
  on public.letter_reads
  for select
  using (is_couple_member(couple_id));

drop policy if exists "letter_reads_insert_own" on public.letter_reads;
create policy "letter_reads_insert_own"
  on public.letter_reads
  for insert
  with check (is_couple_member(couple_id) and user_id = auth.uid());
