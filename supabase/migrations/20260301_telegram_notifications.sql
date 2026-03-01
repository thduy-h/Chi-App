create extension if not exists pgcrypto;

create table if not exists public.user_integrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_chat_id text,
  telegram_linked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_integrations enable row level security;

drop policy if exists "user_integrations_select_own" on public.user_integrations;
create policy "user_integrations_select_own"
  on public.user_integrations
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_integrations_insert_own" on public.user_integrations;
create policy "user_integrations_insert_own"
  on public.user_integrations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_integrations_update_own" on public.user_integrations;
create policy "user_integrations_update_own"
  on public.user_integrations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_integrations_delete_own" on public.user_integrations;
create policy "user_integrations_delete_own"
  on public.user_integrations
  for delete
  using (auth.uid() = user_id);

create table if not exists public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (event in ('order_created', 'letter_received')),
  channel text not null check (channel in ('telegram', 'email', 'in_app')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (couple_id, user_id, event, channel)
);

create index if not exists notification_prefs_couple_user_idx
  on public.notification_prefs (couple_id, user_id);

alter table public.notification_prefs enable row level security;

drop policy if exists "notification_prefs_select_own_member" on public.notification_prefs;
create policy "notification_prefs_select_own_member"
  on public.notification_prefs
  for select
  using (is_couple_member(couple_id) and user_id = auth.uid());

drop policy if exists "notification_prefs_insert_own_member" on public.notification_prefs;
create policy "notification_prefs_insert_own_member"
  on public.notification_prefs
  for insert
  with check (is_couple_member(couple_id) and user_id = auth.uid());

drop policy if exists "notification_prefs_update_own_member" on public.notification_prefs;
create policy "notification_prefs_update_own_member"
  on public.notification_prefs
  for update
  using (is_couple_member(couple_id) and user_id = auth.uid())
  with check (is_couple_member(couple_id) and user_id = auth.uid());

drop policy if exists "notification_prefs_delete_own_member" on public.notification_prefs;
create policy "notification_prefs_delete_own_member"
  on public.notification_prefs
  for delete
  using (is_couple_member(couple_id) and user_id = auth.uid());

create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_user_idx
  on public.telegram_link_tokens (user_id);

alter table public.telegram_link_tokens enable row level security;

drop policy if exists "telegram_link_tokens_select_own" on public.telegram_link_tokens;
create policy "telegram_link_tokens_select_own"
  on public.telegram_link_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "telegram_link_tokens_insert_own" on public.telegram_link_tokens;
create policy "telegram_link_tokens_insert_own"
  on public.telegram_link_tokens
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "telegram_link_tokens_delete_own" on public.telegram_link_tokens;
create policy "telegram_link_tokens_delete_own"
  on public.telegram_link_tokens
  for delete
  using (auth.uid() = user_id);