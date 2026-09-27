-- Run with psql -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql against a test DB.
-- All fixtures are rolled back, including auth accounts.
begin;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAIL: %', message; end if;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001', 'rls-student1@example.test', '{"nickname":"rls-student1","role":"student"}'),
 ('10000000-0000-0000-0000-000000000002', 'rls-student2@example.test', '{"nickname":"rls-student2","role":"student"}'),
 ('10000000-0000-0000-0000-000000000003', 'rls-teacher1@example.test', '{"nickname":"rls-teacher1","role":"teacher"}'),
 ('10000000-0000-0000-0000-000000000004', 'rls-teacher2@example.test', '{"nickname":"rls-teacher2","role":"teacher"}'),
 ('10000000-0000-0000-0000-000000000005', 'rls-psychologist1@example.test', '{"nickname":"rls-psychologist1","role":"psychologist"}'),
 ('10000000-0000-0000-0000-000000000006', 'rls-psychologist2@example.test', '{"nickname":"rls-psychologist2","role":"psychologist"}');

update public.users set id = ('20000000' || substring(auth_user_id::text from 9))::uuid
where auth_user_id::text like '10000000-%';

insert into public.teacher_students (teacher_id, student_id) values
 ('20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002');
insert into public.student_checkins (student_id, mood) values
 ('20000000-0000-0000-0000-000000000001', 2),
 ('20000000-0000-0000-0000-000000000002', 4);
insert into public.student_notes (teacher_id, student_id, body) values
 ('20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Private test note');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true((select count(*) = 1 from public.student_checkins), 'Student sees only own checkins');
select pg_temp.assert_true((select count(*) = 0 from public.student_notes), 'Student cannot read notes');

insert into public.appointments (student_id, specialist_id, topic) values
 ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Teacher appointment'),
 ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'Psychologist appointment');
insert into public.reports (recipient_id, subject_kind, message) values
 ('20000000-0000-0000-0000-000000000003', 'other', 'Teacher report'),
 ('20000000-0000-0000-0000-000000000005', 'other', 'Psychologist report');
select pg_temp.assert_true((select count(id) = 2 from public.reports), 'Author sees own reports without author column');

do $$ begin
  begin
    insert into public.appointments (student_id, specialist_id, topic, status)
    values ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Forged status', 'accepted');
    raise exception 'FAIL: student assigned accepted status';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.student_checkins (student_id, mood)
    values ('20000000-0000-0000-0000-000000000002', 1);
    raise exception 'FAIL: student impersonated another student';
  exception when insufficient_privilege then null; end;
  begin
    update public.users set role = 'teacher' where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: student changed role';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.student_checkins (student_id, mood, checkin_date)
    values ('20000000-0000-0000-0000-000000000001', 1, '2001-01-01');
    raise exception 'FAIL: student forged a past checkin';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true((select count(id) = 0 from public.reports), 'Another student cannot read reports');
select pg_temp.assert_true((select count(*) = 0 from public.appointments), 'Another student cannot read appointments');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true((select count(*) = 1 from public.student_checkins), 'Teacher sees only linked student checkins');
select pg_temp.assert_true((select count(*) = 1 from public.student_notes), 'Teacher sees own notes');
select pg_temp.assert_true((select count(*) = 1 from public.appointments), 'Teacher sees only addressed appointment');
select pg_temp.assert_true((select count(id) = 1 from public.reports), 'Teacher sees only addressed report');
update public.appointments set status = 'accepted';
update public.reports set status = 'resolved';
update public.teacher_students set is_watched = true;
select pg_temp.assert_true((select bool_and(is_watched) from public.teacher_students), 'Teacher can watch own students');

do $$ begin
  begin
    perform author_id from public.reports;
    raise exception 'FAIL: recipient read report author';
  exception when insufficient_privilege then null; end;
  begin
    perform id from public.reports where author_id = '20000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: recipient inferred author using a filter';
  exception when insufficient_privilege then null; end;
  begin
    perform u.nickname from public.reports r join public.users u on u.id = r.author_id;
    raise exception 'FAIL: recipient inferred author using a join';
  exception when insufficient_privilege then null; end;
  begin
    update public.reports set recipient_id = '20000000-0000-0000-0000-000000000004';
    raise exception 'FAIL: recipient reassigned report';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select pg_temp.assert_true((select count(id) = 0 from public.reports), 'Unrelated teacher cannot read report');
select pg_temp.assert_true((select count(*) = 0 from public.student_notes), 'Other teacher cannot read notes');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select pg_temp.assert_true((select count(*) = 0 from public.student_checkins), 'Psychologist cannot read checkins');
select pg_temp.assert_true((select count(*) = 0 from public.student_notes), 'Psychologist cannot read teacher notes');
select pg_temp.assert_true((select count(*) = 1 from public.appointments), 'Psychologist sees only own appointment');
select pg_temp.assert_true((select count(id) = 1 from public.reports), 'Psychologist sees only own report');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000006', true);
select pg_temp.assert_true((select count(*) = 0 from public.appointments), 'Unrelated psychologist cannot read appointment');
select pg_temp.assert_true((select count(id) = 0 from public.reports), 'Unrelated psychologist cannot read report');

reset role;
select pg_temp.assert_true((select status = 'accepted' from public.appointments where topic = 'Teacher appointment'), 'Appointment status saved');
select pg_temp.assert_true((select status = 'resolved' from public.reports where message = 'Teacher report'), 'Report status saved');
select pg_temp.assert_true(not has_column_privilege('authenticated', 'public.reports', 'author_id', 'SELECT'), 'Author column not granted');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.reports', 'SELECT'), 'Anonymous visitors cannot read reports');

rollback;
\echo 'PASS: role isolation, appointment status, notes, watch flag and report anonymity'
