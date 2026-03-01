-- Quick commands for user_home_modes
-- Replace the placeholder values before running.

-- =========================================================
-- 1) ADD / UPDATE MODE BY EMAIL
-- =========================================================
-- Allowed mode values: 'a' | 'b' | 'c'
with target_user as (
  select id
  from auth.users
  where lower(email) = lower('your-email@example.com')
  limit 1
)
insert into public.user_home_modes (user_id, mode)
select id, 'b'
from target_user
on conflict (user_id)
do update set
  mode = excluded.mode,
  updated_at = now();

-- =========================================================
-- 2) CHECK MODE BY EMAIL
-- =========================================================
select
  u.id as user_id,
  u.email,
  m.mode,
  m.updated_at
from auth.users u
left join public.user_home_modes m on m.user_id = u.id
where lower(u.email) = lower('your-email@example.com');

-- =========================================================
-- 3) DELETE MODE BY EMAIL
-- =========================================================
delete from public.user_home_modes m
using auth.users u
where m.user_id = u.id
  and lower(u.email) = lower('your-email@example.com');

-- =========================================================
-- 4) OPTIONAL: CHECK ALL MODE ROWS
-- =========================================================
select
  m.user_id,
  u.email,
  m.mode,
  m.updated_at
from public.user_home_modes m
left join auth.users u on u.id = m.user_id
order by m.updated_at desc;

-- =========================================================
-- 5) OPTIONAL: ADD / UPDATE MODE BY USER_ID
-- =========================================================
insert into public.user_home_modes (user_id, mode)
values ('00000000-0000-0000-0000-000000000000', 'b')
on conflict (user_id)
do update set
  mode = excluded.mode,
  updated_at = now();

-- =========================================================
-- 6) OPTIONAL: DELETE MODE BY USER_ID
-- =========================================================
delete from public.user_home_modes
where user_id = '00000000-0000-0000-0000-000000000000';
