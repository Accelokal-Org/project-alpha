-- Milestone 1: school structure and read access. Academic mutations follow in later slices.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.school_role as enum ('APP_MANAGER', 'SCHOOL_HEAD', 'TEACHER', 'ADVISER', 'STUDENT');
create table public.schools (
 id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 200),
 timezone text not null default 'UTC', created_at timestamptz not null default now()
);
create table public.school_memberships (
 school_id uuid not null references public.schools(id), user_id uuid not null references auth.users(id) on delete cascade,
 role public.school_role not null, primary key (school_id, user_id, role)
);
create index memberships_user_idx on public.school_memberships(user_id);
create table public.school_years (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 name text not null, starts_on date not null, ends_on date not null, is_active boolean not null default false,
 unique(id, school_id), unique(school_id, name), check(ends_on > starts_on)
);
create unique index one_active_year on public.school_years(school_id) where is_active;
create table public.grade_levels (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 name text not null, sort_order integer not null default 0, unique(id, school_id), unique(school_id, name)
);
create table public.teachers (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 user_id uuid references auth.users(id) on delete set null, employee_code text not null, display_name text not null,
 unique(id, school_id), unique(school_id, user_id), unique(school_id, employee_code)
);
create table public.classes (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 school_year_id uuid not null, grade_level_id uuid not null, name text not null, adviser_teacher_id uuid,
 unique(id, school_id), unique(school_year_id, name),
 foreign key(school_year_id, school_id) references public.school_years(id, school_id),
 foreign key(grade_level_id, school_id) references public.grade_levels(id, school_id),
 foreign key(adviser_teacher_id, school_id) references public.teachers(id, school_id)
);
create table public.students (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 user_id uuid references auth.users(id) on delete set null, student_code text not null, display_name text not null,
 created_at timestamptz not null default now(), unique(id, school_id), unique(school_id, user_id), unique(school_id, student_code)
);
create table public.class_enrollments (
 school_id uuid not null references public.schools(id), class_id uuid not null, student_id uuid not null,
 primary key(class_id, student_id),
 foreign key(class_id, school_id) references public.classes(id, school_id),
 foreign key(student_id, school_id) references public.students(id, school_id)
);
create index class_enrollment_student_idx on public.class_enrollments(student_id);
create table public.subjects (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 code text not null, name text not null, unique(id, school_id), unique(school_id, code)
);
create table public.subject_offerings (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 class_id uuid not null, subject_id uuid not null, unique(id, school_id), unique(class_id, subject_id),
 foreign key(class_id, school_id) references public.classes(id, school_id),
 foreign key(subject_id, school_id) references public.subjects(id, school_id)
);
create table public.teacher_assignments (
 school_id uuid not null references public.schools(id), offering_id uuid not null, teacher_id uuid not null,
 primary key(offering_id, teacher_id),
 foreign key(offering_id, school_id) references public.subject_offerings(id, school_id),
 foreign key(teacher_id, school_id) references public.teachers(id, school_id)
);
create index teacher_assignments_teacher_idx on public.teacher_assignments(teacher_id);
create table public.subject_enrollments (
 school_id uuid not null references public.schools(id), offering_id uuid not null, student_id uuid not null,
 primary key(offering_id, student_id),
 foreign key(offering_id, school_id) references public.subject_offerings(id, school_id),
 foreign key(student_id, school_id) references public.students(id, school_id)
);
create index subject_enrollment_student_idx on public.subject_enrollments(student_id);

-- SECURITY DEFINER helpers intentionally inspect membership without recursive RLS.
-- They never accept a caller-supplied user ID; identity comes only from auth.uid().
create function private.is_manager() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.school_memberships where user_id = auth.uid() and role = 'APP_MANAGER');
$$;
create function private.has_role(sid uuid, roles public.school_role[]) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.school_memberships where school_id = sid and user_id = auth.uid() and role = any(roles));
$$;
create function private.is_head(sid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.is_manager() or private.has_role(sid, array['SCHOOL_HEAD']::public.school_role[]);
$$;
create function private.advises(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.classes c join public.teachers t on t.id = c.adviser_teacher_id
 where c.id = cid and t.user_id = auth.uid() and private.has_role(c.school_id, array['ADVISER']::public.school_role[]));
$$;
create function private.staff_offering(oid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.subject_offerings o where o.id = oid and (
 private.is_head(o.school_id) or private.advises(o.class_id) or
 (private.has_role(o.school_id, array['TEACHER']::public.school_role[]) and exists(
 select 1 from public.teacher_assignments a join public.teachers t on t.id = a.teacher_id
 where a.offering_id = o.id and t.user_id = auth.uid()))));
$$;
create function private.own_student(sid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.students s where s.id = sid and s.user_id = auth.uid()
 and private.has_role(s.school_id, array['STUDENT']::public.school_role[]));
$$;
create function private.student_offering(oid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.subject_enrollments e where e.offering_id = oid and private.own_student(e.student_id));
$$;
create function private.visible_class(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.classes c where c.id = cid and (private.is_head(c.school_id) or private.advises(c.id)
 or exists(select 1 from public.subject_offerings o where o.class_id = c.id and private.staff_offering(o.id))
 or exists(select 1 from public.class_enrollments e where e.class_id = c.id and private.own_student(e.student_id))
 or exists(select 1 from public.subject_offerings o where o.class_id = c.id and private.student_offering(o.id))));
$$;
create function private.visible_student(sid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.students s where s.id = sid and (private.is_head(s.school_id) or private.own_student(s.id)
 or exists(select 1 from public.class_enrollments e where e.student_id = s.id and private.advises(e.class_id))
 or exists(select 1 from public.subject_enrollments e where e.student_id = s.id and private.staff_offering(e.offering_id))));
$$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;
alter table public.school_years enable row level security;
alter table public.grade_levels enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_offerings enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.subject_enrollments enable row level security;

create policy school_read on public.schools for select to authenticated using (
 private.is_manager() or exists(select 1 from public.school_memberships m where m.school_id = id and m.user_id = auth.uid()));
create policy memberships_read on public.school_memberships for select to authenticated using(user_id = auth.uid() or private.is_head(school_id));
create policy years_read on public.school_years for select to authenticated using(private.is_manager() or private.has_role(school_id, enum_range(null::public.school_role)));
create policy levels_read on public.grade_levels for select to authenticated using(private.is_manager() or private.has_role(school_id, enum_range(null::public.school_role)));
create policy teachers_read on public.teachers for select to authenticated using(user_id = auth.uid() or private.is_head(school_id));
create policy classes_read on public.classes for select to authenticated using(private.visible_class(id));
create policy students_read on public.students for select to authenticated using(private.visible_student(id));
create policy class_enrollments_read on public.class_enrollments for select to authenticated using(private.is_head(school_id) or private.advises(class_id) or private.own_student(student_id));
create policy subjects_read on public.subjects for select to authenticated using(private.is_head(school_id) or exists(
 select 1 from public.subject_offerings o where o.subject_id = subjects.id and (private.staff_offering(o.id) or private.student_offering(o.id))));
create policy offerings_read on public.subject_offerings for select to authenticated using(private.staff_offering(id) or private.student_offering(id));
create policy teacher_assignments_read on public.teacher_assignments for select to authenticated using(private.staff_offering(offering_id));
create policy subject_enrollments_read on public.subject_enrollments for select to authenticated using(private.staff_offering(offering_id) or private.own_student(student_id));

-- No client write grants or write policies in this read-only vertical slice.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.schools, public.school_memberships, public.school_years, public.grade_levels,
 public.teachers, public.classes, public.students, public.class_enrollments, public.subjects,
 public.subject_offerings, public.teacher_assignments, public.subject_enrollments to authenticated;
grant all on all tables in schema public to service_role;

-- Staff queries cannot accidentally use a second, student role to list an offering.
create function public.staff_offerings() returns setof public.subject_offerings
language sql stable security invoker set search_path = '' as $$
 select o.* from public.subject_offerings o where private.staff_offering(o.id);
$$;
revoke all on function public.staff_offerings() from public, anon;
grant execute on function public.staff_offerings() to authenticated;
