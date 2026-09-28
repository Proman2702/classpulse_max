-- Local test DB only: pg_net is replaced by a recorder, never sends HTTP.
begin;
create schema net;
create table net.test_requests (id bigserial primary key, body jsonb);
create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds integer)
returns bigint language plpgsql as $$ declare request_id bigint; begin
  insert into net.test_requests(body) values(body) returning id into request_id;
  return request_id;
end $$;
create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$ begin
  if condition is distinct from true then raise exception 'FAIL: %', message; end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
('30000000-0000-0000-0000-000000000001','notify-student@example.test','{"nickname":"notify-student","role":"student"}'),
('30000000-0000-0000-0000-000000000002','notify-teacher@example.test','{"nickname":"notify-teacher","role":"teacher"}');
update public.users set id=auth_user_id where auth_user_id::text like '30000000-%';
select public.link_max_account('30000000-0000-0000-0000-000000000001',42);
select public.link_max_account('30000000-0000-0000-0000-000000000002',42);
select pg_temp.assert_true((select max_linked=false from public.users where id='30000000-0000-0000-0000-000000000001'),'Old MAX link cleared');
select pg_temp.assert_true((select max_linked=true from public.users where id='30000000-0000-0000-0000-000000000002'),'New MAX link set');

set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
do $$ begin
  begin
    perform max_user_id from public.users;
    raise exception 'FAIL: raw MAX id accessible';
  exception when insufficient_privilege then null; end;
  begin
    perform public.link_max_account('30000000-0000-0000-0000-000000000001',42);
    raise exception 'FAIL: MAX signature can be bypassed';
  exception when insufficient_privilege then null; end;
  begin
    update public.users set max_user_id=42;
    raise exception 'FAIL: client can assign MAX id';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into private.app_config(key,value) values('notify_url','https://example.test/notify'),('notify_secret','test');
insert into public.student_checkins(student_id,mood) values('30000000-0000-0000-0000-000000000001',2);
select pg_temp.assert_true((select count(*)=1 from net.test_requests),'Low mood notification queued');
update public.student_checkins set mood=2 where student_id='30000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select count(*)=1 from net.test_requests),'Same mood does not spam');
update public.student_checkins set mood=4 where student_id='30000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select count(*)=1 from net.test_requests),'Good mood does not notify');
update public.student_checkins set mood=1 where student_id='30000000-0000-0000-0000-000000000001';
insert into public.appointments(student_id,specialist_id,topic) values('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','Test');
update public.appointments set status='new';
select pg_temp.assert_true((select count(*)=3 from net.test_requests),'Unchanged appointment status does not spam');
update public.appointments set status='accepted';
select pg_temp.assert_true((select count(*)=4 from net.test_requests),'Changed status queued');
select pg_temp.assert_true((select bool_and(body::text not like '%notify-student%' and body::text not like '%30000000-0000-0000-0000-000000000001%') from net.test_requests),'Queue does not reveal identities');
select pg_temp.assert_true((select bool_and(body->>'signature'=encode(public.hmac(body->>'payload','test','sha256'),'hex')) from net.test_requests),'Events signed without putting the secret in the queue');
select pg_temp.assert_true(public.claim_notification((select id from private.notification_events limit 1)),'First delivery claimed');
select pg_temp.assert_true(not public.claim_notification((select id from private.notification_events where claimed limit 1)),'Replays ignored');
rollback;
