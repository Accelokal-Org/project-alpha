begin;
create table public.grading_schemes (
 id uuid primary key default gen_random_uuid(), school_id uuid not null, school_year_id uuid not null,
 name text not null check(length(btrim(name)) between 1 and 100), version integer not null default 1,
 approved_at timestamptz, approved_by uuid references auth.users(id) on delete set null,
 unique(id,school_id), unique(school_year_id,name),
 foreign key(school_year_id,school_id) references public.school_years(id,school_id)
);
create table public.grading_periods (
 id uuid primary key default gen_random_uuid(), scheme_id uuid not null references public.grading_schemes(id),
 name text not null check(length(btrim(name)) between 1 and 60), starts_on date not null, ends_on date not null,
 check(ends_on>=starts_on), unique(id,scheme_id), unique(scheme_id,name)
);
create table public.grading_components (
 id uuid primary key default gen_random_uuid(), scheme_id uuid not null references public.grading_schemes(id),
 name text not null check(length(btrim(name)) between 1 and 60),
 weight numeric not null check(weight>0 and weight<=100 and weight=round(weight,2)),
 unique(id,scheme_id), unique(scheme_id,name)
);
create table public.assessment_grading (
 assessment_id uuid primary key, school_id uuid not null, offering_id uuid not null,
 scheme_id uuid not null, period_id uuid not null, component_id uuid not null,
 foreign key(assessment_id,school_id,offering_id) references public.assessments(id,school_id,offering_id),
 foreign key(scheme_id,school_id) references public.grading_schemes(id,school_id),
 foreign key(period_id,scheme_id) references public.grading_periods(id,scheme_id),
 foreign key(component_id,scheme_id) references public.grading_components(id,scheme_id)
);
alter table public.grading_schemes enable row level security;
alter table public.grading_periods enable row level security;
alter table public.grading_components enable row level security;
alter table public.assessment_grading enable row level security;
revoke all on public.grading_schemes,public.grading_periods,public.grading_components,public.assessment_grading from public,anon,authenticated;
grant select on public.grading_schemes,public.grading_periods,public.grading_components,public.assessment_grading to authenticated;
create policy grading_read on public.grading_schemes for select to authenticated using(private.is_head(school_id) or (approved_at is not null and private.has_role(school_id,array['TEACHER','ADVISER']::public.school_role[])));
create policy grading_periods_read on public.grading_periods for select to authenticated using(exists(select 1 from public.grading_schemes s where s.id=scheme_id));
create policy grading_components_read on public.grading_components for select to authenticated using(exists(select 1 from public.grading_schemes s where s.id=scheme_id));
create policy assessment_grading_read on public.assessment_grading for select to authenticated using(private.staff_offering(offering_id));
create function public.can_configure_grading(target_school uuid) returns boolean language sql stable security invoker set search_path='' as $$select private.is_head(target_school);$$;
create function public.save_grading_scheme(target_school uuid,year_id uuid,target uuid,expected_version integer,scheme_name text,periods jsonb,components jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare s public.grading_schemes; y public.school_years; prior jsonb; e jsonb; sid uuid;
begin
 if not private.is_head(target_school) then raise exception 'School head access required' using errcode='42501'; end if;
 select * into y from public.school_years where id=year_id and school_id=target_school for share;
 if not found then raise exception 'School year not available' using errcode='22023'; end if;
 if expected_version is null or expected_version<0 then raise exception 'Invalid version' using errcode='22023'; end if;
 if periods is null or jsonb_typeof(periods)<>'array' or components is null or jsonb_typeof(components)<>'array' then raise exception 'Invalid grading entries' using errcode='22023'; end if;
 if jsonb_array_length(periods) not between 1 and 12 or jsonb_array_length(components) not between 1 and 20 then raise exception 'Use 1–12 periods and 1–20 components' using errcode='22023'; end if;
 if target is null then
  perform 1 from public.schools where id=target_school for update;
  if (select count(*) from public.grading_schemes where school_id=target_school)>=50 then raise exception 'School scheme limit reached' using errcode='22023'; end if;
  if expected_version<>0 then raise exception 'Invalid new scheme version' using errcode='22023'; end if;
  insert into public.grading_schemes(school_id,school_year_id,name) values(target_school,year_id,btrim(scheme_name)) returning * into s;
 else
  select * into s from public.grading_schemes where id=target and school_id=target_school for update;
  if not found then raise exception 'Scheme not available' using errcode='42501'; end if;
  if s.approved_at is not null then raise exception 'Approved scheme is locked' using errcode='22023'; end if;
  if s.version<>expected_version then raise exception 'Scheme changed; refresh before saving' using errcode='40001'; end if;
  select jsonb_build_object('scheme',to_jsonb(s),'periods',(select jsonb_agg(p) from public.grading_periods p where p.scheme_id=s.id),'components',(select jsonb_agg(c) from public.grading_components c where c.scheme_id=s.id)) into prior;
  update public.grading_schemes set school_year_id=year_id,name=btrim(scheme_name),version=version+1 where id=s.id;
  delete from public.grading_periods where scheme_id=s.id;
  delete from public.grading_components where scheme_id=s.id;
 end if;
 sid:=s.id;
 for e in select * from jsonb_array_elements(periods) loop
  if jsonb_typeof(e->'name') is distinct from 'string' or jsonb_typeof(e->'starts_on') is distinct from 'string' or jsonb_typeof(e->'ends_on') is distinct from 'string' then raise exception 'Invalid period' using errcode='22023'; end if;
  if (e->>'starts_on')::date<y.starts_on or (e->>'ends_on')::date>y.ends_on then raise exception 'Period must fit the school year' using errcode='22023'; end if;
  insert into public.grading_periods(scheme_id,name,starts_on,ends_on) values(sid,btrim(e->>'name'),(e->>'starts_on')::date,(e->>'ends_on')::date);
 end loop;
 if exists(select 1 from public.grading_periods a join public.grading_periods b on a.scheme_id=b.scheme_id and a.id<b.id where a.scheme_id=sid and a.starts_on<=b.ends_on and b.starts_on<=a.ends_on) then raise exception 'Grading periods cannot overlap' using errcode='22023'; end if;
 for e in select * from jsonb_array_elements(components) loop
  if jsonb_typeof(e->'name') is distinct from 'string' or jsonb_typeof(e->'weight') is distinct from 'number' then raise exception 'Invalid component' using errcode='22023'; end if;
  insert into public.grading_components(scheme_id,name,weight) values(sid,btrim(e->>'name'),(e->>'weight')::numeric);
 end loop;
 insert into public.admin_audit_log(school_id,actor_id,action,entity_id,before_value,after_value)
 select target_school,auth.uid(),'save_grading_scheme',sid,prior,jsonb_build_object('scheme',to_jsonb(g),'periods',periods,'components',components) from public.grading_schemes g where g.id=sid;
 return sid;
end;$$;
create function public.approve_grading_scheme(target uuid,expected_version integer) returns void language plpgsql security definer set search_path='' as $$
declare s public.grading_schemes;
begin
 select * into s from public.grading_schemes where id=target for update;
 if not found or not private.is_head(s.school_id) then raise exception 'School head access required' using errcode='42501'; end if;
 if expected_version is null or expected_version<>s.version then raise exception 'Scheme changed; refresh before approving' using errcode='40001'; end if;
 if s.approved_at is not null then raise exception 'Already approved' using errcode='22023'; end if;
 if (select coalesce(sum(weight),0) from public.grading_components where scheme_id=s.id)<>100 then raise exception 'Weights must total exactly 100 percent' using errcode='22023'; end if;
 if not exists(select 1 from public.grading_periods where scheme_id=s.id) then raise exception 'Add grading periods' using errcode='22023'; end if;
 update public.grading_schemes set approved_at=now(),approved_by=auth.uid(),version=version+1 where id=s.id;
 insert into public.admin_audit_log(school_id,actor_id,action,entity_id,before_value,after_value) select s.school_id,auth.uid(),'approve_grading_scheme',s.id,to_jsonb(s),to_jsonb(g) from public.grading_schemes g where g.id=s.id;
end;$$;
create function public.assign_assessment_grading(target uuid,expected_version integer,scheme uuid,period uuid,component uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.assessments; prior jsonb;
begin
 select * into a from public.assessments where id=target for update;
 if not found or not private.teaches_offering(a.offering_id) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 if expected_version is null or expected_version<>a.version then raise exception 'Assessment changed; refresh before saving' using errcode='40001'; end if;
 if a.published_at is not null then raise exception 'Published assessment is read-only' using errcode='22023'; end if;
 select to_jsonb(g) into prior from public.assessment_grading g where g.assessment_id=a.id;
 if scheme is null and period is null and component is null then
  delete from public.assessment_grading where assessment_id=a.id;
 else
  if not exists(select 1 from public.grading_schemes s join public.subject_offerings o on o.id=a.offering_id join public.classes c on c.id=o.class_id join public.grading_periods p on p.scheme_id=s.id and p.id=period join public.grading_components g on g.scheme_id=s.id and g.id=component where s.id=scheme and s.school_id=a.school_id and s.school_year_id=c.school_year_id and s.approved_at is not null and a.assessment_date between p.starts_on and p.ends_on) then raise exception 'Select approved grading settings for this school year and assessment date' using errcode='22023'; end if;
  insert into public.assessment_grading values(a.id,a.school_id,a.offering_id,scheme,period,component) on conflict(assessment_id) do update set scheme_id=excluded.scheme_id,period_id=excluded.period_id,component_id=excluded.component_id;
 end if;
 update public.assessments set version=version+1 where id=a.id;
 insert into public.assessment_events(assessment_id,actor_id,action,details) values(a.id,auth.uid(),'assign_grading',jsonb_build_object('before',prior,'scheme',scheme,'period',period,'component',component));
end;$$;
revoke all on function public.can_configure_grading(uuid),public.save_grading_scheme(uuid,uuid,uuid,integer,text,jsonb,jsonb),public.approve_grading_scheme(uuid,integer),public.assign_assessment_grading(uuid,integer,uuid,uuid,uuid) from public,anon;
grant execute on function public.can_configure_grading(uuid),public.save_grading_scheme(uuid,uuid,uuid,integer,text,jsonb,jsonb),public.approve_grading_scheme(uuid,integer),public.assign_assessment_grading(uuid,integer,uuid,uuid,uuid) to authenticated;
commit;
