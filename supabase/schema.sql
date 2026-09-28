-- ClassPulse — схема базы данных.
-- Скрипт идемпотентный: его можно выполнять повторно в Supabase SQL Editor,
-- в том числе поверх предыдущей версии схемы.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Профили
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  nickname text not null,
  role text not null,
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists max_link text;
alter table public.users add column if not exists max_user_id bigint;
alter table public.users add column if not exists max_linked boolean
  generated always as (max_user_id is not null) stored;
create unique index if not exists users_max_user_id_key
  on public.users (max_user_id) where max_user_id is not null;
alter table public.users add column if not exists auth_user_id uuid references auth.users (id) on delete cascade;
create unique index if not exists users_auth_user_id_key
  on public.users (auth_user_id) where auth_user_id is not null;

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('student', 'teacher', 'psychologist'));

alter table public.users drop constraint if exists users_nickname_length_check;
alter table public.users add constraint users_nickname_length_check
  check (char_length(trim(nickname)) between 2 and 40);

alter table public.users drop constraint if exists users_max_link_check;
alter table public.users add constraint users_max_link_check
  check (max_link is null or (max_link like 'https://max.ru/%' and char_length(max_link) <= 200));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_nickname_role_key') then
    alter table public.users add constraint users_nickname_role_key unique (nickname, role);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Ежедневные ответы учеников
-- ---------------------------------------------------------------------------

create table if not exists public.student_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  mood integer not null check (mood between 1 and 5),
  reasons text[] not null default '{}',
  comment text check (comment is null or char_length(comment) <= 1000),
  checkin_date date not null default (timezone('Europe/Moscow', now()))::date,
  created_at timestamptz not null default now()
);

-- Старые повторные ответы сохраняем целиком. Дату восстанавливаем только для
-- последнего ответа за день, если за этот день ещё нет актуального ответа.
alter table public.student_checkins add column if not exists checkin_date date;
alter table public.student_checkins alter column checkin_date
  set default (timezone('Europe/Moscow', now()))::date;
with ranked as (
  select id, student_id, (timezone('Europe/Moscow', created_at))::date as day,
    row_number() over (
      partition by student_id, (timezone('Europe/Moscow', created_at))::date
      order by created_at desc, id desc
    ) as position
  from public.student_checkins where checkin_date is null
)
update public.student_checkins as checkin
set checkin_date = ranked.day
from ranked
where checkin.id = ranked.id and ranked.position = 1
  and not exists (
    select 1 from public.student_checkins existing
    where existing.student_id = ranked.student_id and existing.checkin_date = ranked.day
  );

create unique index if not exists student_checkins_student_date_key
  on public.student_checkins (student_id, checkin_date);
create index if not exists student_checkins_student_created_idx
  on public.student_checkins (student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Связи учитель — ученик
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint teacher_students_teacher_student_key unique (teacher_id, student_id),
  constraint teacher_students_different_users_check check (teacher_id <> student_id)
);

-- «Особенный» ученик, за которым учитель наблюдает внимательнее.
alter table public.teacher_students
  add column if not exists is_watched boolean not null default false;

create index if not exists teacher_students_student_id_idx
  on public.teacher_students (student_id);

-- ---------------------------------------------------------------------------
-- Вспомогательные функции для RLS
-- ---------------------------------------------------------------------------

create or replace function private.current_profile_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select id from public.users where auth_user_id = (select auth.uid())
$$;

create or replace function private.current_user_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select role from public.users where auth_user_id = (select auth.uid())
$$;

create or replace function private.is_linked_teacher(target_student_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teacher_students
    where teacher_id = private.current_profile_id()
      and student_id = target_student_id
  )
$$;

create or replace function private.is_specialist(profile_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = profile_id and role in ('teacher', 'psychologist')
  )
$$;

revoke all on function private.current_profile_id() from public;
revoke all on function private.current_user_role() from public;
revoke all on function private.is_linked_teacher(uuid) from public;
revoke all on function private.is_specialist(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_linked_teacher(uuid) to authenticated;
grant execute on function private.is_specialist(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Заметки учителя о состоянии ученика
-- ---------------------------------------------------------------------------

create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists student_notes_teacher_student_idx
  on public.student_notes (teacher_id, student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Запись к психологу или учителю
-- ---------------------------------------------------------------------------

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  specialist_id uuid not null references public.users (id) on delete cascade,
  topic text not null check (char_length(trim(topic)) between 1 and 500),
  preferred_time text check (preferred_time is null or char_length(preferred_time) <= 100),
  status text not null default 'new' check (status in ('new', 'accepted', 'declined', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists appointments_specialist_idx
  on public.appointments (specialist_id, created_at desc);
create index if not exists appointments_student_idx
  on public.appointments (student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Анонимные жалобы
-- Автор хранится только для того, чтобы он видел свои жалобы. Колонка author_id
-- закрыта привилегиями (см. ниже), поэтому получатель не может узнать автора.
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default private.current_profile_id() references public.users (id) on delete cascade,
  recipient_id uuid not null references public.users (id) on delete cascade,
  subject_kind text not null check (subject_kind in ('teacher', 'student', 'other')),
  subject_name text check (subject_name is null or char_length(subject_name) <= 80),
  message text not null check (char_length(trim(message)) between 1 and 2000),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists reports_recipient_idx
  on public.reports (recipient_id, created_at desc);
create index if not exists reports_author_idx
  on public.reports (author_id);

-- ---------------------------------------------------------------------------
-- Создание профиля при регистрации
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.users (auth_user_id, nickname, role)
  values (
    new.id,
    trim(new.raw_user_meta_data ->> 'nickname'),
    case when requested_role in ('student', 'teacher', 'psychologist') then requested_role else 'student' end
  );
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Привилегии
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.student_checkins enable row level security;
alter table public.teacher_students enable row level security;
alter table public.student_notes enable row level security;
alter table public.appointments enable row level security;
alter table public.reports enable row level security;

revoke all on table
  public.users, public.student_checkins, public.teacher_students,
  public.student_notes, public.appointments, public.reports
from anon, authenticated;

grant select (id, auth_user_id, nickname, role, max_link, max_linked, created_at) on public.users to authenticated;
grant update (nickname, max_link) on public.users to authenticated;

grant select, insert on public.student_checkins to authenticated;
grant update (mood, reasons, comment) on public.student_checkins to authenticated;

grant select, insert, delete on public.teacher_students to authenticated;
grant update (is_watched) on public.teacher_students to authenticated;

grant select, insert, delete on public.student_notes to authenticated;

grant select, insert on public.appointments to authenticated;
grant update (status) on public.appointments to authenticated;

-- author_id намеренно не входит в список читаемых колонок.
grant select (id, recipient_id, subject_kind, subject_name, message, severity, status, created_at)
  on public.reports to authenticated;
grant insert (recipient_id, subject_kind, subject_name, message, severity)
  on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

-- ---------------------------------------------------------------------------
-- Политики RLS
-- ---------------------------------------------------------------------------

-- users
drop policy if exists "Authenticated users can read allowed profiles" on public.users;
drop policy if exists "Read allowed profiles" on public.users;
create policy "Read allowed profiles" on public.users
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  or role in ('teacher', 'psychologist')
  or (select private.current_user_role()) in ('teacher', 'psychologist')
);

drop policy if exists "Update own profile" on public.users;
create policy "Update own profile" on public.users
for update to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

-- student_checkins
drop policy if exists "Students can read their checkins and teachers linked checkins" on public.student_checkins;
drop policy if exists "Read own or linked checkins" on public.student_checkins;
create policy "Read own or linked checkins" on public.student_checkins
for select to authenticated
using (
  student_id = (select private.current_profile_id())
  or (select private.is_linked_teacher(student_id))
);

drop policy if exists "Students can create their own checkins" on public.student_checkins;
drop policy if exists "Students create own checkins" on public.student_checkins;
create policy "Students create own checkins" on public.student_checkins
for insert to authenticated
with check (
  student_id = (select private.current_profile_id())
  and (select private.current_user_role()) = 'student'
  and checkin_date = (timezone('Europe/Moscow', now()))::date
);

drop policy if exists "Students can update their own daily checkin" on public.student_checkins;
drop policy if exists "Students update own checkins" on public.student_checkins;
create policy "Students update own checkins" on public.student_checkins
for update to authenticated
using (
  student_id = (select private.current_profile_id())
  and checkin_date = (timezone('Europe/Moscow', now()))::date
)
with check (
  student_id = (select private.current_profile_id())
  and (select private.current_user_role()) = 'student'
  and checkin_date = (timezone('Europe/Moscow', now()))::date
);

-- teacher_students
drop policy if exists "Users can read their teacher student links" on public.teacher_students;
drop policy if exists "Read own links" on public.teacher_students;
create policy "Read own links" on public.teacher_students
for select to authenticated
using (
  teacher_id = (select private.current_profile_id())
  or student_id = (select private.current_profile_id())
);

drop policy if exists "Teachers can add students" on public.teacher_students;
drop policy if exists "Teachers add students" on public.teacher_students;
create policy "Teachers add students" on public.teacher_students
for insert to authenticated
with check (
  teacher_id = (select private.current_profile_id())
  and (select private.current_user_role()) = 'teacher'
  and exists (select 1 from public.users where id = student_id and role = 'student')
);

drop policy if exists "Teachers manage own links" on public.teacher_students;
create policy "Teachers manage own links" on public.teacher_students
for update to authenticated
using (teacher_id = (select private.current_profile_id()))
with check (teacher_id = (select private.current_profile_id()));

drop policy if exists "Teachers remove own links" on public.teacher_students;
create policy "Teachers remove own links" on public.teacher_students
for delete to authenticated
using (teacher_id = (select private.current_profile_id()));

-- student_notes
drop policy if exists "Teachers read own notes" on public.student_notes;
create policy "Teachers read own notes" on public.student_notes
for select to authenticated
using (teacher_id = (select private.current_profile_id()));

drop policy if exists "Teachers add notes about linked students" on public.student_notes;
create policy "Teachers add notes about linked students" on public.student_notes
for insert to authenticated
with check (
  teacher_id = (select private.current_profile_id())
  and (select private.is_linked_teacher(student_id))
);

drop policy if exists "Teachers delete own notes" on public.student_notes;
create policy "Teachers delete own notes" on public.student_notes
for delete to authenticated
using (teacher_id = (select private.current_profile_id()));

-- appointments
drop policy if exists "Participants read appointments" on public.appointments;
create policy "Participants read appointments" on public.appointments
for select to authenticated
using (
  student_id = (select private.current_profile_id())
  or specialist_id = (select private.current_profile_id())
);

drop policy if exists "Students create appointments" on public.appointments;
create policy "Students create appointments" on public.appointments
for insert to authenticated
with check (
  student_id = (select private.current_profile_id())
  and (select private.current_user_role()) = 'student'
  and (select private.is_specialist(specialist_id))
  and status = 'new'
);

drop policy if exists "Specialists update appointments" on public.appointments;
create policy "Specialists update appointments" on public.appointments
for update to authenticated
using (specialist_id = (select private.current_profile_id()))
with check (specialist_id = (select private.current_profile_id()));

-- reports
drop policy if exists "Author and recipient read reports" on public.reports;
create policy "Author and recipient read reports" on public.reports
for select to authenticated
using (
  author_id = (select private.current_profile_id())
  or recipient_id = (select private.current_profile_id())
);

drop policy if exists "Students create reports" on public.reports;
create policy "Students create reports" on public.reports
for insert to authenticated
with check (
  author_id = (select private.current_profile_id())
  and (select private.current_user_role()) = 'student'
  and (select private.is_specialist(recipient_id))
  and status = 'new'
);

drop policy if exists "Recipients update reports" on public.reports;
create policy "Recipients update reports" on public.reports
for update to authenticated
using (recipient_id = (select private.current_profile_id()))
with check (recipient_id = (select private.current_profile_id()));

-- Таблица student_requests из первой версии больше не используется
-- (её заменили appointments и reports). Удалите её вручную, если она не нужна:
-- drop table if exists public.student_requests;

-- Уведомления в MAX
-- Триггеры отправляют изменения в Edge Function notify через pg_net.
-- Чтобы включить, один раз заполните настройки (значения — ваши):
--   insert into private.app_config (key, value) values
--     ('notify_url', 'https://<project-ref>.supabase.co/functions/v1/notify'),
--     ('notify_secret', '<тот же секрет, что NOTIFY_SECRET у функции>')
--   on conflict (key) do update set value = excluded.value;
-- Пока настройки не заданы, триггеры ничего не делают.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end $$;

create table if not exists private.app_config (
  key text primary key,
  value text not null
);
-- Managed pg_net queues can be readable by other roles. Never put credentials
-- or report authors there: use a signed envelope with only event ids and status.
revoke all on table private.app_config from public, anon, authenticated;
alter table private.app_config enable row level security;

create table if not exists private.notification_events (
  id uuid primary key,
  created_at timestamptz not null default now(),
  claimed boolean not null default false
);
alter table private.notification_events enable row level security;
revoke all on table private.notification_events from public, anon, authenticated;
grant select, update on private.notification_events to service_role;
grant usage on schema private to service_role;
create or replace function public.claim_notification(event_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update private.notification_events set claimed = true where id = event_id and not claimed;
  return found;
end;
$$;
revoke all on function public.claim_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_notification(uuid) to service_role;

create or replace function private.notify_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  notify_url text := (select value from private.app_config where key = 'notify_url');
  notify_secret text := (select value from private.app_config where key = 'notify_secret');
  event_id uuid := gen_random_uuid();
  payload text;
  signature text;
  crypto_schema text := (select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto');
begin
  if tg_op = 'UPDATE' then
    if tg_table_name = 'student_checkins' then
      if new.mood = old.mood then return new; end if;
    else
      if new.status = old.status then return new; end if;
    end if;
  end if;
  if notify_url is null or notify_secret is null then
    return new;
  end if;

  payload := jsonb_build_object(
    'event_id', event_id, 'timestamp', extract(epoch from now()),
    'table', tg_table_name, 'type', tg_op,
    'record', jsonb_build_object('id', new.id, 'mood', to_jsonb(new)->'mood', 'status', to_jsonb(new)->'status'),
    'old_record', case when tg_op = 'UPDATE' then jsonb_build_object('mood', to_jsonb(old)->'mood', 'status', to_jsonb(old)->'status') end
  )::text;
  execute format('select encode(%I.hmac($1,$2,''sha256''),''hex'')', crypto_schema)
    into signature using payload, notify_secret;
  insert into private.notification_events(id) values(event_id);
  perform net.http_post(
    url := notify_url,
    body := jsonb_build_object('payload', payload, 'signature', signature),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  -- Уведомление не должно мешать сохранению данных.
  raise warning 'notify_change failed: %', sqlerrm;
  return new;
end;
$$;

revoke all on function private.notify_change() from public, anon, authenticated;

-- Only link-max can call this transaction after checking the MAX signature.
create or replace function public.link_max_account(profile_id uuid, verified_max_id bigint)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if verified_max_id <= 0 or verified_max_id is null then raise exception 'Invalid MAX id'; end if;
  perform pg_catalog.pg_advisory_xact_lock(verified_max_id);
  perform id from public.users where id = profile_id for update;
  if not found then raise exception 'Profile not found'; end if;
  update public.users set max_user_id = null where max_user_id = verified_max_id and id <> profile_id;
  update public.users set max_user_id = verified_max_id where id = profile_id;
end;
$$;
revoke all on function public.link_max_account(uuid, bigint) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.link_max_account(uuid, bigint) to service_role;
  end if;
end $$;

drop trigger if exists notify_low_mood on public.student_checkins;
create trigger notify_low_mood
  after insert or update of mood on public.student_checkins
  for each row when (new.mood <= 2)
  execute function private.notify_change();

drop trigger if exists notify_appointment on public.appointments;
create trigger notify_appointment
  after insert or update of status on public.appointments
  for each row execute function private.notify_change();

drop trigger if exists notify_report on public.reports;
create trigger notify_report
  after insert or update of status on public.reports
  for each row execute function private.notify_change();


commit;
