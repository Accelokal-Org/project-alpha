begin;
create table public.school_account_imports (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 username text not null, first_name text not null, last_name text not null, email text not null,
 role public.school_role not null check(role in ('TEACHER','ADVISER','STUDENT')),
 profile_id uuid not null, batch_id uuid not null, status text not null default 'pending' check(status in ('pending','processing','sent','retry','review')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), user_id uuid references auth.users(id) on delete set null,
 unique(school_id,username), unique(school_id,email)
);
alter table public.school_account_imports enable row level security;
revoke all on public.school_account_imports from public,anon,authenticated;
grant select on public.school_account_imports to authenticated;
create policy school_imports_read on public.school_account_imports for select to authenticated using(private.is_head(school_id));
create function public.prepare_school_accounts(target_school uuid, entries jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare e jsonb; p uuid; b uuid:=gen_random_uuid(); u text; mail text; first_n text; last_n text; account_role public.school_role;
begin
 if not private.is_head(target_school) then raise exception 'School head access required' using errcode='42501';end if;
 if entries is null or jsonb_typeof(entries)<>'array' then raise exception 'Invalid import' using errcode='22023';end if;
 if jsonb_array_length(entries) not between 1 and 100 then raise exception 'Import 1 to 100 users' using errcode='22023';end if;
 perform 1 from public.schools where id=target_school for update;
 for e in select value from jsonb_array_elements(entries) loop
  if e->>'role' is null or e->>'role' not in ('TEACHER','ADVISER','STUDENT') then raise exception 'Choose teacher, adviser or student' using errcode='22023';end if;
  account_role:=(e->>'role')::public.school_role;
  u:=lower(btrim(e->>'username'));mail:=lower(btrim(e->>'email'));first_n:=btrim(e->>'first_name');last_n:=btrim(e->>'last_name');
  if u is null or u !~ '^[a-z0-9][a-z0-9._-]{2,49}$' or mail is null or length(mail)>254 or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or first_n is null or length(first_n) not between 1 and 100 or last_n is null or length(last_n) not between 1 and 100 then raise exception 'Invalid import row' using errcode='22023';end if;
  if exists(select 1 from auth.users where lower(email)=mail) or exists(select 1 from public.school_account_imports where school_id=target_school and (username=u or email=mail)) or exists(select 1 from public.teachers where school_id=target_school and lower(employee_code)=u) or exists(select 1 from public.students where school_id=target_school and lower(student_code)=u) then raise exception 'Email or username already exists; review existing accounts before importing' using errcode='23505';end if;
  if account_role='STUDENT' then
   insert into public.students(school_id,student_code,display_name) values(target_school,u,first_n||' '||last_n) returning id into p;
  else
   insert into public.teachers(school_id,employee_code,display_name) values(target_school,u,first_n||' '||last_n) returning id into p;
  end if;
  insert into public.school_account_imports(school_id,username,first_name,last_name,email,role,profile_id,batch_id,created_by) values(target_school,u,first_n,last_n,mail,account_role,p,b,auth.uid());
 end loop;
 insert into public.admin_audit_log(actor_id,school_id,action,entity_id,after_value) values(auth.uid(),target_school,'prepare_account_import',b,jsonb_build_object('count',jsonb_array_length(entries)));
 return b;
end;$$;
create function public.claim_school_invitation(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.school_account_imports;
begin
 select * into r from public.school_account_imports where id=target for update;
 if not found or not private.is_head(r.school_id) then raise exception 'School head access required' using errcode='42501';end if;
 if r.status not in ('pending','retry') then raise exception 'Invitation already processed or needs review' using errcode='22023';end if;
 if exists(select 1 from auth.users where lower(email)=r.email) then
  update public.school_account_imports set status='review',updated_at=now() where id=target;
  return jsonb_build_object('review',true);
 end if;
 update public.school_account_imports set status='processing',updated_at=now() where id=target;
 return jsonb_build_object('email',r.email,'first_name',r.first_name,'last_name',r.last_name);
end;$$;
-- Completion can only be called by the trusted delivery server, after a caller-JWT claim.
create function public.finish_school_invitation(target uuid, actor uuid, outcome text, invited_user uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.school_account_imports;
begin
 select * into r from public.school_account_imports where id=target for update;
 if not found or r.status<>'processing' then raise exception 'No active delivery' using errcode='22023';end if;
 if not exists(select 1 from public.platform_admins where user_id=actor) and not exists(select 1 from public.school_memberships where user_id=actor and (role='APP_MANAGER' or (school_id=r.school_id and role='SCHOOL_HEAD'))) then raise exception 'School head access revoked' using errcode='42501';end if;
 if outcome not in ('sent','retry','review') or outcome is null then raise exception 'Invalid outcome' using errcode='22023';end if;
 if outcome='sent' then
  if invited_user is null or not exists(select 1 from auth.users where id=invited_user and lower(email)=r.email) then raise exception 'Invited account mismatch' using errcode='22023';end if;
  if r.role='STUDENT' then
   update public.students set user_id=invited_user where id=r.profile_id and school_id=r.school_id and user_id is null;
  else
   update public.teachers set user_id=invited_user where id=r.profile_id and school_id=r.school_id and user_id is null;
  end if;
  if not found then raise exception 'Profile linking requires review' using errcode='22023';end if;
  insert into public.school_memberships(school_id,user_id,role) values(r.school_id,invited_user,r.role) on conflict do nothing;
 end if;
 update public.school_account_imports set status=outcome,user_id=invited_user,updated_at=now() where id=target;
 insert into public.admin_audit_log(actor_id,school_id,action,entity_id,after_value) values(actor,r.school_id,'import_invitation_'||outcome,r.id,jsonb_build_object('role',r.role));
end;$$;
revoke all on function public.prepare_school_accounts(uuid,jsonb),public.claim_school_invitation(uuid) from public,anon;
grant execute on function public.prepare_school_accounts(uuid,jsonb),public.claim_school_invitation(uuid) to authenticated;
revoke all on function public.finish_school_invitation(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.finish_school_invitation(uuid,uuid,text,uuid) to service_role;
commit;
