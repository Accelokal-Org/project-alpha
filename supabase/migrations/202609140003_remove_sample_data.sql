-- Remove retired sample-data features and only explicitly identified sample tenants.
-- Run against the application's Supabase project as a single transaction.
begin;
create temporary table deskonekt_sample_schools on commit drop as
 select id from public.schools where is_test
 or (id = '10000000-0000-4000-8000-000000000001' and name = 'Mabini Community High School');

-- Only generated logins with provenance are eligible; an email suffix alone is insufficient.
create temporary table deskonekt_sample_users on commit drop as
 select distinct u.id from auth.users u where lower(u.email) like '%@example.test'
 and (
  exists(select 1 from public.admin_audit_log a where a.action='create_test_account'
   and a.entity_id=u.id and a.school_id in (select id from deskonekt_sample_schools))
  or (lower(u.email) in ('andrea@example.test','daniel@example.test','sofia@example.test',
   'miguel@example.test','head@example.test','manager@example.test')
   and exists(select 1 from public.school_memberships m where m.user_id=u.id
    and m.school_id='10000000-0000-4000-8000-000000000001'
    and m.school_id in (select id from deskonekt_sample_schools)))
 )
 and not exists(select 1 from public.platform_admins p where p.user_id=u.id)
 and not exists(select 1 from public.school_memberships m where m.user_id=u.id and m.role='APP_MANAGER')
 and not exists(select 1 from public.school_memberships m where m.user_id=u.id and m.school_id not in (select id from deskonekt_sample_schools))
 and not exists(select 1 from public.teachers t where t.user_id=u.id and t.school_id not in (select id from deskonekt_sample_schools))
 and not exists(select 1 from public.students s where s.user_id=u.id and s.school_id not in (select id from deskonekt_sample_schools))
 and not exists(select 1 from public.admin_audit_log a where a.actor_id=u.id and (a.school_id is null or a.school_id not in (select id from deskonekt_sample_schools)));

-- Preserve legacy platform authority before removing its sample-school membership.
insert into public.platform_admins(user_id)
 select distinct user_id from public.school_memberships
 where role='APP_MANAGER' and school_id in (select id from deskonekt_sample_schools)
 on conflict (user_id) do nothing;
delete from public.subject_enrollments where school_id in (select id from deskonekt_sample_schools);
delete from public.teacher_assignments where school_id in (select id from deskonekt_sample_schools);
delete from public.class_enrollments where school_id in (select id from deskonekt_sample_schools);
delete from public.subject_offerings where school_id in (select id from deskonekt_sample_schools);
delete from public.classes where school_id in (select id from deskonekt_sample_schools);
delete from public.students where school_id in (select id from deskonekt_sample_schools);
delete from public.teachers where school_id in (select id from deskonekt_sample_schools);
delete from public.subjects where school_id in (select id from deskonekt_sample_schools);
delete from public.school_years where school_id in (select id from deskonekt_sample_schools);
delete from public.grade_levels where school_id in (select id from deskonekt_sample_schools);
delete from public.school_memberships where school_id in (select id from deskonekt_sample_schools);
delete from public.admin_audit_log where school_id in (select id from deskonekt_sample_schools);
delete from public.schools where id in (select id from deskonekt_sample_schools);
delete from auth.users where id in (select id from deskonekt_sample_users);
drop function public.admin_record_test_account(uuid,uuid);
create or replace function public.admin_setup(operation text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 sid uuid; eid uuid; before_row jsonb; after_row jsonb; vname text; vcode text; tz text;
 cid uuid; tid uuid; uid uuid; rid uuid; oid uuid;
 role_value public.school_role; changed integer;
begin
 if not private.is_manager() then raise exception 'App manager access required' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Invalid payload' using errcode='22023'; end if;
 if operation in ('create_school','update_school') then
  vname := private.admin_text(payload,'name'); tz := private.admin_text(payload,'timezone',100);
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then raise exception 'Invalid timezone' using errcode='22023'; end if;
  if operation='update_school' then
   sid := (payload->>'school_id')::uuid;
   select to_jsonb(s) into before_row from public.schools s where id=sid for update;
   if before_row is null then raise exception 'School not found' using errcode='P0002'; end if;
   update public.schools set name=vname, timezone=tz where id=sid returning to_jsonb(schools.*) into after_row;
  else
   insert into public.schools(name,timezone) values(vname,tz) returning id,to_jsonb(schools.*) into sid,after_row;
  end if;
  eid := sid;

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


alter table public.schools drop column is_test;
commit;
