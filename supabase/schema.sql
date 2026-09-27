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

grant select on public.users to authenticated;
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

commit;
