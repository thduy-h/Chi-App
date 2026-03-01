drop policy if exists "couple_nicknames_select_own" on public.couple_nicknames;
drop policy if exists "couple_nicknames_select_member" on public.couple_nicknames;

create policy "couple_nicknames_select_member"
  on public.couple_nicknames
  for select
  using (is_couple_member(couple_id));

create index if not exists couple_nicknames_latest_idx
  on public.couple_nicknames (couple_id, target_user_id, updated_at desc);
