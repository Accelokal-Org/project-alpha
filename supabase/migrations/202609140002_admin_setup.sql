-- Platform authority is independent of school membership, allowing an empty installation.
create table public.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;
grant all on public.platform_admins to service_role;
create policy own_admin_record on public.platform_admins for select to authenticated using(user_id = auth.uid());
create or replace function private.is_manager() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.platform_admins where user_id = auth.uid())
 or exists(select 1 from public.school_memberships where user_id = auth.uid() and role = 'APP_MANAGER');
$$;
create function public.is_app_manager() returns boolean language sql stable security invoker set search_path = '' as $$
 select private.is_manager();
$$;
revoke all on function public.is_app_manager() from public, anon;
grant execute on function public.is_app_manager() to authenticated;

alter table public.schools add column is_test boolean not null default false;
create table public.admin_audit_log (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
 school_id uuid references public.schools(id), action text not null, entity_id uuid,
 before_value jsonb, after_value jsonb, created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;
create policy manager_audit_read on public.admin_audit_log for select to authenticated using(private.is_manager());
create index admin_audit_school_created_idx on public.admin_audit_log(school_id, created_at desc);

create function private.admin_text(p jsonb, k text, max_length integer default 200) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := btrim(p->>k);
begin
 if v is null or length(v) < 1 or length(v) > max_length then
  raise exception 'Invalid %', k using errcode = '22023';
 end if;
 return v;
end;
$$;
revoke all on function private.admin_text(jsonb,text,integer) from public, anon, authenticated;

-- All setup writes are explicit, atomic operations. No direct table-write grants are added.
create function public.admin_setup(operation text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 sid uuid; eid uuid; before_row jsonb; after_row jsonb; vname text; vcode text; tz text;
 cid uuid; tid uuid; uid uuid; rid uuid; oid uuid; yrid uuid; gid uuid; aclass uuid; bclass uuid;
 atid uuid; btid uuid; asub uuid; bsub uuid; aoffer uuid; boffer uuid; studentid uuid;
 role_value public.school_role; profile_type text; n integer; changed integer;
begin
 if not private.is_manager() then raise exception 'App manager access required' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Invalid payload' using errcode='22023'; end if;
 if operation in ('create_school','create_test_school','update_school') then
  vname := private.admin_text(payload,'name'); tz := private.admin_text(payload,'timezone',100);
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then raise exception 'Invalid timezone' using errcode='22023'; end if;
  if operation='update_school' then
   sid := (payload->>'school_id')::uuid;
   select to_jsonb(s) into before_row from public.schools s where id=sid for update;
   if before_row is null then raise exception 'School not found' using errcode='P0002'; end if;
   update public.schools set name=vname, timezone=tz where id=sid returning to_jsonb(schools.*) into after_row;
  else
   insert into public.schools(name,timezone,is_test) values(vname,tz,operation='create_test_school') returning id,to_jsonb(schools.*) into sid,after_row;
  end if;
  eid := sid;
  if operation='create_test_school' then
   -- A self-contained fictional school, never mixed into an existing school's records.
   insert into public.school_years(school_id,name,starts_on,ends_on,is_active)
    values(sid,'2026–2027','2026-06-01','2027-04-30',true) returning id into yrid;
   insert into public.grade_levels(school_id,name,sort_order) values(sid,'Grade 8',8) returning id into gid;
   insert into public.teachers(school_id,employee_code,display_name) values(sid,'T-001','Andrea Reyes') returning id into atid;
   insert into public.teachers(school_id,employee_code,display_name) values(sid,'T-002','Daniel Santos') returning id into btid;
   insert into public.classes(school_id,school_year_id,grade_level_id,name,adviser_teacher_id) values(sid,yrid,gid,'Grade 8 · Acacia',atid) returning id into aclass;
   insert into public.classes(school_id,school_year_id,grade_level_id,name,adviser_teacher_id) values(sid,yrid,gid,'Grade 8 · Narra',btid) returning id into bclass;
   insert into public.subjects(school_id,code,name) values(sid,'MAT','Mathematics') returning id into asub;
   insert into public.subjects(school_id,code,name) values(sid,'SCI','Science') returning id into bsub;
   insert into public.subject_offerings(school_id,class_id,subject_id) values(sid,aclass,asub) returning id into aoffer;
   insert into public.subject_offerings(school_id,class_id,subject_id) values(sid,bclass,bsub) returning id into boffer;
   insert into public.teacher_assignments values(sid,aoffer,atid),(sid,boffer,btid);
   for n in 1..12 loop
    insert into public.students(school_id,student_code,display_name) values(sid,'TEST-'||lpad(n::text,3,'0'),
     (array['Alonzo, Sofia','Bautista, Miguel','Cruz, Isabella','Dela Rosa, Gabriel','Garcia, Amara','Lim, Rafael','Mendoza, Chloe','Navarro, Lucas','Ramos, Elena','Reyes, Mateo','Santos, Lucia','Villanueva, Noah'])[n]) returning id into studentid;
    insert into public.class_enrollments values(sid,case when n<=6 then aclass else bclass end,studentid);
    insert into public.subject_enrollments values(sid,case when n<=6 then aoffer else boffer end,studentid);
   end loop;
   after_row := after_row || jsonb_build_object('fixtures',jsonb_build_object('classes',2,'teachers',2,'students',12,'subjects',2));
  end if;
 else
  sid := (payload->>'school_id')::uuid;
  if sid is null or not exists(select 1 from public.schools where id=sid) then raise exception 'School not found' using errcode='P0002'; end if;
  case operation
   when 'create_year' then
    vname := private.admin_text(payload,'name');
    insert into public.school_years(school_id,name,starts_on,ends_on,is_active)
     values(sid,vname,private.admin_text(payload,'starts_on')::date,private.admin_text(payload,'ends_on')::date,coalesce((payload->>'is_active')::boolean,false)) returning id,to_jsonb(school_years.*) into eid,after_row;
   when 'create_grade' then
    insert into public.grade_levels(school_id,name) values(sid,private.admin_text(payload,'name')) returning id,to_jsonb(grade_levels.*) into eid,after_row;
   when 'create_teacher' then
    insert into public.teachers(school_id,employee_code,display_name) values(sid,private.admin_text(payload,'code',50),private.admin_text(payload,'name')) returning id,to_jsonb(teachers.*) into eid,after_row;
   when 'create_student' then
    insert into public.students(school_id,student_code,display_name) values(sid,private.admin_text(payload,'code',50),private.admin_text(payload,'name')) returning id,to_jsonb(students.*) into eid,after_row;
   when 'create_subject' then
    insert into public.subjects(school_id,code,name) values(sid,private.admin_text(payload,'code',50),private.admin_text(payload,'name')) returning id,to_jsonb(subjects.*) into eid,after_row;
   when 'create_class' then
    insert into public.classes(school_id,school_year_id,grade_level_id,name)
     values(sid,(payload->>'year_id')::uuid,(payload->>'grade_id')::uuid,private.admin_text(payload,'name')) returning id,to_jsonb(classes.*) into eid,after_row;
   when 'create_offering' then
    insert into public.subject_offerings(school_id,class_id,subject_id) values(sid,(payload->>'class_id')::uuid,(payload->>'subject_id')::uuid) returning id,to_jsonb(subject_offerings.*) into eid,after_row;
   when 'assign_teacher' then
    oid := (payload->>'offering_id')::uuid;
    insert into public.teacher_assignments values(sid,oid,(payload->>'teacher_id')::uuid) returning to_jsonb(teacher_assignments.*) into after_row; eid := oid;
   when 'assign_adviser' then
    cid := (payload->>'class_id')::uuid; tid := (payload->>'teacher_id')::uuid;
    select to_jsonb(c) into before_row from public.classes c where id=cid and school_id=sid for update;
    if before_row is null or tid is null then raise exception 'Class or adviser not found' using errcode='P0002'; end if;
    update public.classes set adviser_teacher_id=tid where id=cid and school_id=sid returning to_jsonb(classes.*) into after_row; eid:=cid;
   when 'enroll_class' then
    cid := (payload->>'class_id')::uuid;
    insert into public.class_enrollments values(sid,cid,(payload->>'student_id')::uuid) returning to_jsonb(class_enrollments.*) into after_row; eid:=cid;
   when 'enroll_subject' then
    oid := (payload->>'offering_id')::uuid;
    insert into public.subject_enrollments values(sid,oid,(payload->>'student_id')::uuid) returning to_jsonb(subject_enrollments.*) into after_row; eid:=oid;
   when 'enroll_class_subject' then
    cid := (payload->>'class_id')::uuid; oid := (payload->>'offering_id')::uuid;
    if not exists(select 1 from public.classes where id=cid and school_id=sid) or
     not exists(select 1 from public.subject_offerings where id=oid and school_id=sid) then raise exception 'Invalid assignment' using errcode='22023'; end if;
    insert into public.subject_enrollments(school_id,offering_id,student_id)
     select sid,oid,student_id from public.class_enrollments where class_id=cid and school_id=sid on conflict do nothing;
    get diagnostics changed = row_count;
    eid:=oid; after_row:=jsonb_build_object('class_id',cid,'offering_id',oid,'students_added',changed);
   when 'link_account' then
    select id into uid from auth.users where lower(email)=lower(private.admin_text(payload,'email',254));
    if uid is null then raise exception 'Account not found' using errcode='P0002'; end if;
    role_value := private.admin_text(payload,'role')::public.school_role;
    if role_value = 'APP_MANAGER' then raise exception 'Platform access cannot be granted here' using errcode='42501'; end if;
    rid := nullif(payload->>'profile_id','')::uuid;
    if role_value in ('TEACHER','ADVISER') then
     select to_jsonb(t) into before_row from public.teachers t where id=rid and school_id=sid for update;
     if before_row is null then raise exception 'Teacher profile not found' using errcode='P0002'; end if;
     if before_row->>'user_id' is not null and before_row->>'user_id' <> uid::text then raise exception 'Profile already linked' using errcode='22023'; end if;
     update public.teachers set user_id=uid where id=rid and school_id=sid;
    elsif role_value = 'STUDENT' then
     select to_jsonb(s) into before_row from public.students s where id=rid and school_id=sid for update;
     if before_row is null then raise exception 'Student profile not found' using errcode='P0002'; end if;
     if before_row->>'user_id' is not null and before_row->>'user_id' <> uid::text then raise exception 'Profile already linked' using errcode='22023'; end if;
     update public.students set user_id=uid where id=rid and school_id=sid;
    end if;
    insert into public.school_memberships values(sid,uid,role_value) on conflict do nothing;
    eid:=uid; after_row:=jsonb_build_object('user_id',uid,'role',role_value,'profile_id',rid);
   else raise exception 'Unknown operation' using errcode='22023';
  end case;
 end if;
 insert into public.admin_audit_log(actor_id,school_id,action,entity_id,before_value,after_value)
  values(auth.uid(),sid,operation,eid,before_row,after_row);
 return jsonb_build_object('school_id',sid,'id',eid);
end;
$$;
revoke all on function public.admin_setup(text,jsonb) from public, anon;
grant execute on function public.admin_setup(text,jsonb) to authenticated;

create function public.admin_accounts(target_school uuid) returns table(user_id uuid,email text,role public.school_role)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not private.is_manager() then raise exception 'App manager access required' using errcode='42501'; end if;
 return query select m.user_id,u.email::text,m.role from public.school_memberships m join auth.users u on u.id=m.user_id where m.school_id=target_school order by u.email,m.role;
end;
$$;
revoke all on function public.admin_accounts(uuid) from public, anon;
grant execute on function public.admin_accounts(uuid) to authenticated;

create function public.admin_record_test_account(target_school uuid, target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not private.is_manager() then raise exception 'App manager access required' using errcode='42501'; end if;
 if not exists(select 1 from public.schools where id=target_school and is_test) or
  not exists(select 1 from auth.users where id=target_user and lower(email) like '%@example.test') then
  raise exception 'Invalid test account' using errcode='22023';
 end if;
 insert into public.admin_audit_log(actor_id,school_id,action,entity_id,after_value)
  values(auth.uid(),target_school,'create_test_account',target_user,jsonb_build_object('user_id',target_user));
end;
$$;
revoke all on function public.admin_record_test_account(uuid,uuid) from public, anon;
grant execute on function public.admin_record_test_account(uuid,uuid) to authenticated;
