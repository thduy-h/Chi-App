create or replace function public.cleanup_orphan_couples(p_older_than_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  with orphan_couples as (
    select c.id
    from public.couples c
    left join public.couple_members cm
      on cm.couple_id = c.id
    where cm.couple_id is null
      and coalesce(c.created_at, now() - interval '100 years')
        < now() - make_interval(days => greatest(p_older_than_days, 0))
  ),
  deleted_rows as (
    delete from public.couples c
    using orphan_couples o
    where c.id = o.id
    returning c.id
  )
  select count(*)::integer into deleted_count from deleted_rows;

  return deleted_count;
end;
$$;

revoke all on function public.cleanup_orphan_couples(integer) from public;
grant execute on function public.cleanup_orphan_couples(integer) to service_role;
