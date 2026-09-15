-- Shared authorization helper is defined here as well for independent attendance setup.
create or replace function private.teaches_offering(oid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.teacher_assignments a join public.teachers t on t.id=a.teacher_id
 where a.offering_id=oid and t.user_id=auth.uid() and private.has_role(a.school_id,array['TEACHER']::public.school_role[]));
$$;
revoke all on function private.teaches_offering(uuid) from public,anon;
grant execute on function private.teaches_offering(uuid) to authenticated;
create table public.attendance_statuses (
 school_id uuid not null references public.schools(id), code text not null check(code ~ '^[A-Z][A-Z0-9_]{0,19}$'),
 label text not null check(length(btrim(label)) between 1 and 60), active boolean not null default true,
 primary key(school_id,code)
);
create table public.attendance_days (
 id uuid primary key default gen_random_uuid(),school_id uuid not null,offering_id uuid not null,attendance_date date not null,
 version integer not null default 0,updated_at timestamptz not null default now(),unique(offering_id,attendance_date),unique(id,school_id,offering_id),
 foreign key(offering_id,school_id) references public.subject_offerings(id,school_id)
);
create table public.attendance_records (
 day_id uuid not null,school_id uuid not null,offering_id uuid not null,student_id uuid not null,status_code text not null,status_label text not null,
 primary key(day_id,student_id),foreign key(day_id,school_id,offering_id) references public.attendance_days(id,school_id,offering_id),
 foreign key(offering_id,student_id) references public.subject_enrollments(offering_id,student_id),
 foreign key(student_id,school_id) references public.students(id,school_id),foreign key(school_id,status_code) references public.attendance_statuses(school_id,code)
);
create table public.attendance_events (
 id uuid primary key default gen_random_uuid(),day_id uuid not null references public.attendance_days(id),actor_id uuid references auth.users(id) on delete set null,
 reason text not null,before_value jsonb not null,after_value jsonb not null,created_at timestamptz not null default now()
);
alter table public.attendance_statuses enable row level security;
alter table public.attendance_days enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_events enable row level security;
revoke all on public.attendance_statuses,public.attendance_days,public.attendance_records,public.attendance_events from public,anon,authenticated;
grant select on public.attendance_statuses,public.attendance_days,public.attendance_records,public.attendance_events to authenticated;
create policy attendance_status_read on public.attendance_statuses for select to authenticated using(private.is_manager() or private.has_role(school_id,enum_range(null::public.school_role)));
create policy attendance_days_staff on public.attendance_days for select to authenticated using(private.staff_offering(offering_id));
create policy attendance_records_staff on public.attendance_records for select to authenticated using(private.staff_offering(offering_id));
create policy attendance_events_staff on public.attendance_events for select to authenticated using(exists(select 1 from public.attendance_days d where d.id=day_id and private.staff_offering(d.offering_id)));
create function public.configure_attendance_status(target_school uuid,status_code text,status_label text,enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare previous jsonb;
begin
 if not private.is_manager() then raise exception 'App manager access required' using errcode='42501'; end if;
 perform 1 from public.schools where id=target_school for update;
 if not found then raise exception 'School not found' using errcode='P0002'; end if;
 if not exists(select 1 from public.attendance_statuses where school_id=target_school and code=status_code) and (select count(*) from public.attendance_statuses where school_id=target_school)>=50 then raise exception 'Status limit reached' using errcode='22023'; end if;
 select to_jsonb(s) into previous from public.attendance_statuses s where school_id=target_school and code=status_code for update;
 insert into public.attendance_statuses values(target_school,status_code,btrim(status_label),enabled)
 on conflict(school_id,code) do update set label=excluded.label,active=excluded.active;
 insert into public.admin_audit_log(actor_id,school_id,action,before_value,after_value)
 values(auth.uid(),target_school,'configure_attendance_status',previous,jsonb_build_object('code',status_code,'label',btrim(status_label),'active',enabled));
end;$$;
create function public.save_attendance(offering uuid,day date,expected_version integer,entries jsonb,reason text default '') returns void
language plpgsql security definer set search_path='' as $$
declare sid uuid;tz text;d public.attendance_days;e jsonb;student uuid;v_code text;v_label text;enabled boolean;old_code text;before_rows jsonb;
begin
 if not private.teaches_offering(offering) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 select o.school_id,s.timezone into sid,tz from public.subject_offerings o join public.schools s on s.id=o.school_id where o.id=offering;
 if day is null or day>(now() at time zone tz)::date then raise exception 'Choose today or an earlier date' using errcode='22023'; end if;
 if expected_version is null or expected_version<0 then raise exception 'Invalid version' using errcode='22023'; end if;
 if entries is null or jsonb_typeof(entries)<>'array' then raise exception 'Invalid entries' using errcode='22023'; end if;
 if jsonb_array_length(entries) not between 1 and 500 then raise exception 'Choose 1 to 500 students' using errcode='22023'; end if;
 if (select count(*)<>count(distinct x->>'student_id') from jsonb_array_elements(entries)x) then raise exception 'Duplicate or missing student' using errcode='22023'; end if;
 if reason is null or length(reason)>500 then raise exception 'Invalid reason' using errcode='22023'; end if;
 insert into public.attendance_days(school_id,offering_id,attendance_date) values(sid,offering,day) on conflict(offering_id,attendance_date) do nothing;
 select * into d from public.attendance_days where offering_id=offering and attendance_date=day for update;
 if d.version<>expected_version then raise exception 'Attendance changed; refresh before saving' using errcode='40001'; end if;
 if d.version>0 and length(btrim(reason))=0 then raise exception 'Give a reason for updating attendance' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into before_rows from public.attendance_records r where day_id=d.id;
 for e in select * from jsonb_array_elements(entries) loop
  student:=(e->>'student_id')::uuid;
  if student is null or not exists(select 1 from public.subject_enrollments where offering_id=offering and student_id=student and school_id=sid) then raise exception 'Student not enrolled in subject' using errcode='22023'; end if;
  if not(e ? 'status_code') or jsonb_typeof(e->'status_code') not in ('string','null') then raise exception 'Invalid status' using errcode='22023'; end if;
  if e->'status_code'='null'::jsonb then delete from public.attendance_records where day_id=d.id and student_id=student;
  else
   v_code:=e->>'status_code';
   select s.label,s.active into v_label,enabled from public.attendance_statuses s where s.school_id=sid and s.code=v_code for share;
   if not found then raise exception 'Unknown school status' using errcode='22023'; end if;
   select status_code into old_code from public.attendance_records where day_id=d.id and student_id=student;
   if not enabled and old_code is distinct from v_code then raise exception 'Status is inactive' using errcode='22023'; end if;
   -- An unchanged code retains its historical label, even after configuration edits.
   insert into public.attendance_records values(d.id,sid,offering,student,v_code,v_label)
   on conflict(day_id,student_id) do update set status_code=excluded.status_code,status_label=case when attendance_records.status_code=excluded.status_code then attendance_records.status_label else excluded.status_label end;
  end if;
 end loop;
 update public.attendance_days set version=version+1,updated_at=now() where id=d.id;
 insert into public.attendance_events(day_id,actor_id,reason,before_value,after_value)
 select d.id,auth.uid(),btrim(reason),before_rows,coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.attendance_records r where day_id=d.id;
end;$$;
create function public.my_attendance() returns table(day_id uuid,attendance_date date,subject text,class_name text,school text,status text)
language sql stable security definer set search_path='' as $$
 select d.id,d.attendance_date,su.name,c.name,sc.name,r.status_label from public.attendance_records r
 join public.attendance_days d on d.id=r.day_id join public.subject_offerings o on o.id=d.offering_id
 join public.subjects su on su.id=o.subject_id join public.classes c on c.id=o.class_id join public.schools sc on sc.id=d.school_id
 where private.own_student(r.student_id) order by d.attendance_date desc,d.id;
$$;
revoke all on function public.configure_attendance_status(uuid,text,text,boolean),public.save_attendance(uuid,date,integer,jsonb,text),public.my_attendance() from public,anon;
grant execute on function public.configure_attendance_status(uuid,text,text,boolean),public.save_attendance(uuid,date,integer,jsonb,text),public.my_attendance() to authenticated;
create index attendance_days_date_idx on public.attendance_days(offering_id,attendance_date desc);
create index attendance_student_idx on public.attendance_records(student_id);
create index attendance_events_day_idx on public.attendance_events(day_id,created_at desc);

create function public.can_manage_attendance(offering uuid) returns boolean language sql stable security invoker set search_path='' as $$select private.teaches_offering(offering);$$;
revoke all on function public.can_manage_attendance(uuid) from public,anon;
grant execute on function public.can_manage_attendance(uuid) to authenticated;
