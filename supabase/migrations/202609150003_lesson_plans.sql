begin;
create table public.lesson_plans (
 id uuid primary key default gen_random_uuid(), school_id uuid not null, offering_id uuid not null,
 title text not null check(length(btrim(title)) between 1 and 200),
 objectives text not null check(length(objectives)<=10000),
 activities text not null check(length(activities)<=20000),
 resources text not null check(length(resources)<=10000),
 lesson_date date, is_template boolean not null default false,
 version integer not null default 1,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(offering_id,school_id) references public.subject_offerings(id,school_id),
 check((is_template and lesson_date is null) or (not is_template and lesson_date is not null))
);
create table public.lesson_plan_events (
 id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.lesson_plans(id),
 actor_id uuid references auth.users(id) on delete set null,
 before_value jsonb, after_value jsonb not null, created_at timestamptz not null default now()
);
alter table public.lesson_plans enable row level security;
alter table public.lesson_plan_events enable row level security;
revoke all on public.lesson_plans,public.lesson_plan_events from public,anon,authenticated;
grant select on public.lesson_plans,public.lesson_plan_events to authenticated;
create policy lesson_staff_read on public.lesson_plans for select to authenticated using(private.staff_offering(offering_id));
create policy lesson_events_read on public.lesson_plan_events for select to authenticated using(exists(select 1 from public.lesson_plans p where p.id=plan_id and private.staff_offering(p.offering_id)));
create function public.can_manage_lessons(offering uuid) returns boolean language sql stable security invoker set search_path='' as $$select private.teaches_offering(offering);$$;
create function public.save_lesson_plan(offering uuid,target uuid,expected_version integer,title text,objectives text,activities text,resources text,lesson_date date,is_template boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare prior public.lesson_plans; saved public.lesson_plans;
begin
 if not private.teaches_offering(offering) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 if expected_version is null or expected_version<0 then raise exception 'Invalid version' using errcode='22023'; end if;
 if target is null then
  if expected_version<>0 then raise exception 'Invalid new plan version' using errcode='22023'; end if;
  insert into public.lesson_plans(school_id,offering_id,title,objectives,activities,resources,lesson_date,is_template,created_by)
  select o.school_id,o.id,btrim(title),objectives,activities,resources,lesson_date,is_template,auth.uid() from public.subject_offerings o where o.id=offering returning * into saved;
 else
  select * into prior from public.lesson_plans p where p.id=target and p.offering_id=offering for update;
  if not found then raise exception 'Plan not available' using errcode='42501'; end if;
  if prior.version<>expected_version then raise exception 'Plan changed; refresh before saving' using errcode='40001'; end if;
  update public.lesson_plans p set title=btrim(save_lesson_plan.title),objectives=save_lesson_plan.objectives,activities=save_lesson_plan.activities,resources=save_lesson_plan.resources,lesson_date=save_lesson_plan.lesson_date,is_template=save_lesson_plan.is_template,version=p.version+1,updated_at=now() where p.id=target returning * into saved;
 end if;
 insert into public.lesson_plan_events(plan_id,actor_id,before_value,after_value) values(saved.id,auth.uid(),case when target is null then null else to_jsonb(prior) end,to_jsonb(saved));
 return saved.id;
end;$$;
create function public.my_upcoming_lessons() returns setof public.lesson_plans language sql stable security invoker set search_path='' as $$
 select p.* from public.lesson_plans p join public.schools s on s.id=p.school_id
 where not p.is_template and private.teaches_offering(p.offering_id) and p.lesson_date >= (now() at time zone s.timezone)::date
 order by p.lesson_date,p.id limit 20;
$$;
revoke all on function public.can_manage_lessons(uuid),public.save_lesson_plan(uuid,uuid,integer,text,text,text,text,date,boolean),public.my_upcoming_lessons() from public,anon;
grant execute on function public.can_manage_lessons(uuid),public.save_lesson_plan(uuid,uuid,integer,text,text,text,text,date,boolean),public.my_upcoming_lessons() to authenticated;
create index lesson_plans_offering_date_idx on public.lesson_plans(offering_id,lesson_date,id);
create index lesson_plan_events_plan_idx on public.lesson_plan_events(plan_id,created_at);
commit;
