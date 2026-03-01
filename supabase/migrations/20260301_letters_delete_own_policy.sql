drop policy if exists "letters_delete_own_member" on public.letters;

create policy "letters_delete_own_member"
  on public.letters
  for delete
  using (is_couple_member(couple_id) and created_by = auth.uid());
