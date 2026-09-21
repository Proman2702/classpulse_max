create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  nickname text not null,
  role text not null,
  created_at timestamptz not null default now(),
  constraint users_nickname_length_check check (char_length(trim(nickname)) between 2 and 40),
  constraint users_role_check check (role in ('student', 'teacher')),
  constraint users_nickname_role_key unique (nickname, role)
);

-- Supports projects where the initial MVP schema was already applied.
alter table public.users
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists users_auth_user_id_key
  on public.users (auth_user_id)
  where auth_user_id is not null;

create table if not exists public.student_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  mood integer not null,
  reasons text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now(),
  constraint student_checkins_mood_check check (mood between 1 and 5)
);

create table if not exists public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint teacher_students_teacher_student_key unique (teacher_id, student_id),
  constraint teacher_students_different_users_check check (teacher_id <> student_id)
);

create table if not exists public.student_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  severity text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint student_requests_message_check check (char_length(trim(message)) between 1 and 2000),
  constraint student_requests_severity_check check (severity in ('low', 'medium', 'high', 'critical')),
  constraint student_requests_status_check check (status in ('new', 'read', 'resolved')),
  constraint student_requests_different_users_check check (student_id <> teacher_id)
);

create index if not exists student_checkins_student_created_idx
  on public.student_checkins (student_id, created_at desc);

create index if not exists teacher_students_student_id_idx
  on public.teacher_students (student_id);

create index if not exists student_requests_teacher_created_idx
  on public.student_requests (teacher_id, created_at desc);

create index if not exists student_requests_student_id_idx
  on public.student_requests (student_id);

create or replace function private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.users
  where auth_user_id = (select auth.uid())
$$;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.users
  where auth_user_id = (select auth.uid())
$$;

revoke all on function private.current_profile_id() from public;
revoke all on function private.current_user_role() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';

  insert into public.users (auth_user_id, nickname, role)
  values (
    new.id,
    trim(new.raw_user_meta_data ->> 'nickname'),
    case when requested_role in ('student', 'teacher') then requested_role else 'student' end
  );

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.student_checkins enable row level security;
alter table public.teacher_students enable row level security;
alter table public.student_requests enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.student_checkins from anon, authenticated;
revoke all on table public.teacher_students from anon, authenticated;
revoke all on table public.student_requests from anon, authenticated;

grant select on table public.users to authenticated;
grant select, insert on table public.student_checkins to authenticated;
grant select, insert on table public.teacher_students to authenticated;
grant select, insert on table public.student_requests to authenticated;
grant update (status) on table public.student_requests to authenticated;

drop policy if exists "Authenticated users can read allowed profiles" on public.users;
create policy "Authenticated users can read allowed profiles"
on public.users for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  or role = 'teacher'
  or (select private.current_user_role()) = 'teacher'
);

drop policy if exists "Students can read their checkins and teachers linked checkins" on public.student_checkins;
create policy "Students can read their checkins and teachers linked checkins"
on public.student_checkins for select
to authenticated
using (
  student_id = (select private.current_profile_id())
  or exists (
    select 1
    from public.teacher_students
    where teacher_id = (select private.current_profile_id())
      and student_id = student_checkins.student_id
  )
);

drop policy if exists "Students can create their own checkins" on public.student_checkins;
create policy "Students can create their own checkins"
on public.student_checkins for insert
to authenticated
with check (
  student_id = (select private.current_profile_id())
  and (select private.current_user_role()) = 'student'
);

drop policy if exists "Users can read their teacher student links" on public.teacher_students;
create policy "Users can read their teacher student links"
on public.teacher_students for select
to authenticated
using (
  teacher_id = (select private.current_profile_id())
  or student_id = (select private.current_profile_id())
);

drop policy if exists "Teachers can add students" on public.teacher_students;
create policy "Teachers can add students"
on public.teacher_students for insert
to authenticated
with check (
  teacher_id = (select private.current_profile_id())
  and (select private.current_user_role()) = 'teacher'
  and exists (
    select 1
    from public.users
    where id = student_id and role = 'student'
  )
);

drop policy if exists "Participants can read requests" on public.student_requests;
create policy "Participants can read requests"
on public.student_requests for select
to authenticated
using (
  student_id = (select private.current_profile_id())
  or teacher_id = (select private.current_profile_id())
);

drop policy if exists "Students can create their own requests" on public.student_requests;
create policy "Students can create their own requests"
on public.student_requests for insert
to authenticated
with check (
  student_id = (select private.current_profile_id())
  and (select private.current_user_role()) = 'student'
  and exists (
    select 1
    from public.users
    where id = teacher_id and role = 'teacher'
  )
);

drop policy if exists "Teachers can update requests sent to them" on public.student_requests;
create policy "Teachers can update requests sent to them"
on public.student_requests for update
to authenticated
using (teacher_id = (select private.current_profile_id()))
with check (teacher_id = (select private.current_profile_id()));

-- Recover the test profile created before the application tables existed.
insert into public.users (auth_user_id, nickname, role)
select id, 'chatgpt', 'teacher'
from auth.users
where email = 'test123@gmail.com'
  and raw_user_meta_data ->> 'nickname' = 'chatgpt'
  and raw_user_meta_data ->> 'role' = 'teacher'
  and not exists (select 1 from public.users p where p.auth_user_id = auth.users.id)
on conflict do nothing;
