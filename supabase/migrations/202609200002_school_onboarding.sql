begin;
create table public.school_onboarding (
 id uuid primary key, school_id uuid not null unique references public.schools(id),
 school_name text not null, head_email text not null, first_name text not null, last_name text not null,
 status text not null default 'pending' check(status in ('pending','processing','invited','linked','retry','review')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index school_onboarding_identity on public.school_onboarding(lower(school_name),head_email);
alter table public.school_onboarding enable row level security;
revoke all on public.school_onboarding from public,anon,authenticated;
grant select on public.school_onboarding to authenticated;
create policy school_onboarding_managers on public.school_onboarding for select to authenticated using(private.is_manager());
create function public.prepare_school_onboarding(request_id uuid, school_name text, head_email text, first_name text, last_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.school_onboarding; s uuid; n text:=btrim(school_name); mail text:=lower(btrim(head_email)); f text:=btrim(first_name); l text:=btrim(last_name);
begin
 if not private.is_manager() then raise exception 'Superadmin access required' using errcode='42501';end if;
 if request_id is null or n is null or length(n) not between 1 and 200 or mail is null or length(mail)>254 or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or f is null or length(f) not between 1 and 100 or l is null or length(l) not between 1 and 100 then raise exception 'Check school and head details' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(n)||':'||mail,0));
 select * into r from public.school_onboarding o where o.id=request_id or (lower(o.school_name)=lower(n) and o.head_email=mail) order by o.created_at limit 1;
 if found then
  if lower(r.school_name)<>lower(n) or r.head_email<>mail or r.first_name<>f or r.last_name<>l then raise exception 'Setup already saved; open the existing school to make changes' using errcode='22023';end if;
  return jsonb_build_object('id',r.id,'school_id',r.school_id,'status',r.status);
 end if;
 s:=(public.admin_setup('create_school',jsonb_build_object('name',n,'timezone','Asia/Manila'))->>'school_id')::uuid;
 insert into public.school_onboarding(id,school_id,school_name,head_email,first_name,last_name,created_by) values(request_id,s,n,mail,f,l,auth.uid());
 insert into public.admin_audit_log(actor_id,school_id,action,entity_id,after_value) values(auth.uid(),s,'prepare_school_onboarding',request_id,jsonb_build_object('role','SCHOOL_HEAD'));
 return jsonb_build_object('id',request_id,'school_id',s,'status','pending');
end;$$;
create function public.claim_school_onboarding(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.school_onboarding; existing_user uuid;
begin
 if not private.is_manager() then raise exception 'Superadmin access required' using errcode='42501';end if;
 select * into r from public.school_onboarding where id=target for update;
 if not found then raise exception 'Setup not found' using errcode='P0002';end if;
 if r.status not in ('pending','retry') then return jsonb_build_object('status',r.status);end if;
 select id into existing_user from auth.users where lower(email)=r.head_email;
 if existing_user is not null then
  perform public.admin_invite_access(r.school_id,r.head_email,array['SCHOOL_HEAD']::public.school_role[],null,existing_user);
  update public.school_onboarding set status='linked',updated_at=now() where id=target;
  insert into public.admin_audit_log(actor_id,school_id,action,entity_id,after_value) values(auth.uid(),r.school_id,'onboarding_existing_head_linked',target,jsonb_build_object('user_id',existing_user));
  return jsonb_build_object('status','linked');
 end if;
 update public.school_onboarding set status='processing',updated_at=now() where id=target;
 return jsonb_build_object('status','claimed','email',r.head_email,'first_name',r.first_name,'last_name',r.last_name);
end;$$;
create function public.finish_school_onboarding(target uuid, outcome text, invited_user uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.school_onboarding;
begin
 if not private.is_manager() then raise exception 'Superadmin access required' using errcode='42501';end if;
 select * into r from public.school_onboarding where id=target for update;
 if not found or r.status<>'processing' then raise exception 'No active setup delivery' using errcode='22023';end if;
 if outcome is null or outcome not in ('invited','retry','review') then raise exception 'Invalid result' using errcode='22023';end if;
 if outcome='invited' then
  if invited_user is null then raise exception 'Invited user required' using errcode='22023';end if;
  perform public.admin_invite_access(r.school_id,r.head_email,array['SCHOOL_HEAD']::public.school_role[],null,invited_user);
 end if;
 update public.school_onboarding set status=outcome,updated_at=now() where id=target;
 insert into public.admin_audit_log(actor_id,school_id,action,entity_id,after_value) values(auth.uid(),r.school_id,'onboarding_'||outcome,target,jsonb_build_object('role','SCHOOL_HEAD'));
end;$$;
revoke all on function public.prepare_school_onboarding(uuid,text,text,text,text),public.claim_school_onboarding(uuid),public.finish_school_onboarding(uuid,text,uuid) from public,anon;
grant execute on function public.prepare_school_onboarding(uuid,text,text,text,text),public.claim_school_onboarding(uuid),public.finish_school_onboarding(uuid,text,uuid) to authenticated;
commit;
