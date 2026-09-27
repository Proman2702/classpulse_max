-- Use only in a disposable database with the original schema already installed.
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/upgrade.sql
insert into auth.users (id, email, raw_user_meta_data) values
 ('30000000-0000-0000-0000-000000000001', 'legacy@example.test', '{"nickname":"legacy-student","role":"student"}');
alter table public.student_checkins alter column checkin_date drop not null;
insert into public.student_checkins (student_id, mood, comment, checkin_date, created_at)
select id, 4, 'Current old answer', '2026-09-25', '2026-09-25T17:00:00+03:00' from public.users where nickname = 'legacy-student';
insert into public.student_checkins (student_id, mood, comment, checkin_date, created_at)
select id, 2, 'Legacy duplicate', null, '2026-09-25T16:00:00+03:00' from public.users where nickname = 'legacy-student';
insert into public.student_checkins (student_id, mood, comment, checkin_date, created_at)
select id, 3, 'Legacy missing date', null, '2026-09-24T16:00:00+03:00' from public.users where nickname = 'legacy-student';
create temporary table saved_checkins as select id, student_id, mood, reasons, comment, created_at from public.student_checkins;
create temporary table saved_users as select id, auth_user_id, nickname, role, created_at from public.users;
\ir ../schema.sql
\ir ../schema.sql
do $$ begin
  if exists (select * from saved_checkins except select id, student_id, mood, reasons, comment, created_at from public.student_checkins)
  or (select count(*) from saved_checkins) <> (select count(*) from public.student_checkins) then raise exception 'FAIL: checkin loss'; end if;
  if exists (select * from saved_users except select id, auth_user_id, nickname, role, created_at from public.users) then raise exception 'FAIL: profile loss'; end if;
  if not exists (select 1 from public.student_checkins where comment = 'Legacy missing date' and checkin_date = '2026-09-24') then raise exception 'FAIL: date not recovered'; end if;
  if not exists (select 1 from public.student_checkins where comment = 'Legacy duplicate' and checkin_date is null) then raise exception 'FAIL: duplicate not retained'; end if;
end $$;
\echo 'PASS: applying original -> new schema twice preserves every old profile and answer'
\ir rls.sql
