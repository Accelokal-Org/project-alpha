-- Preflight and atomic role assignment use the administrator's JWT, never a service key.
create function public.admin_invite_access(target_school uuid, account_email text, account_roles public.school_role[], profile uuid default null, invited_user uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.school_role; linked uuid;
begin
 if not private.is_manager() then raise exception 'App manager access required' using errcode='42501'; end if;
 if not exists(select 1 from public.schools where id=target_school) then raise exception 'School not found' using errcode='P0002'; end if;
 if account_email is null or length(btrim(account_email))=0 or length(account_email)>254 then raise exception 'Invalid email' using errcode='22023'; end if;
 if account_roles is null or cardinality(account_roles)=0 or cardinality(account_roles)>4 or array_position(account_roles,null) is not null
 or 'APP_MANAGER'=any(account_roles) then raise exception 'Choose school roles only' using errcode='22023'; end if;
 if 'STUDENT'=any(account_roles) and cardinality(account_roles)>1 then raise exception 'Student must be invited separately from staff roles' using errcode='22023'; end if;
 if 'TEACHER'=any(account_roles) or 'ADVISER'=any(account_roles) then
  select user_id into linked from public.teachers where id=profile and school_id=target_school for update;
  if not found then raise exception 'Teacher profile not found' using errcode='P0002'; end if;
 elsif 'STUDENT'=any(account_roles) then
  select user_id into linked from public.students where id=profile and school_id=target_school for update;
  if not found then raise exception 'Student profile not found' using errcode='P0002'; end if;
 elsif profile is not null then raise exception 'School head does not need a profile' using errcode='22023';
 end if;
 if linked is not null and (invited_user is null or linked<>invited_user) then raise exception 'Profile already linked' using errcode='22023'; end if;
 if invited_user is null then
  if exists(select 1 from auth.users where lower(email)=lower(btrim(account_email))) then raise exception 'Account already exists; connect the existing login' using errcode='23505'; end if;
  return;
 end if;
 if not exists(select 1 from auth.users where id=invited_user and lower(email)=lower(btrim(account_email))) then raise exception 'Account not found' using errcode='P0002'; end if;
 foreach r in array account_roles loop
  perform public.admin_setup('link_account',jsonb_build_object('school_id',target_school,'email',account_email,'role',r,'profile_id',coalesce(profile::text,'')));
 end loop;
 insert into public.admin_audit_log(actor_id,school_id,action,entity_id,after_value)
 values(auth.uid(),target_school,'invite_account',invited_user,jsonb_build_object('roles',account_roles));
end;
$$;
revoke all on function public.admin_invite_access(uuid,text,public.school_role[],uuid,uuid) from public,anon;
grant execute on function public.admin_invite_access(uuid,text,public.school_role[],uuid,uuid) to authenticated;
