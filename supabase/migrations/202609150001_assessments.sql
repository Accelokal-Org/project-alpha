create table public.assessments (
 id uuid primary key default gen_random_uuid(), school_id uuid not null, offering_id uuid not null,
 title text not null check(length(btrim(title)) between 1 and 200), assessment_date date not null,
 max_score numeric not null check(max_score>0 and max_score<=100000 and max_score=round(max_score,2)),
 published_at timestamptz, version integer not null default 1, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), unique(id,school_id,offering_id),
 foreign key(offering_id,school_id) references public.subject_offerings(id,school_id)
);
create table public.assessment_scores (
 assessment_id uuid not null,school_id uuid not null,offering_id uuid not null,student_id uuid not null,
 score numeric not null check(score>=0 and score<=100000 and score=round(score,2)),
 primary key(assessment_id,student_id),
 foreign key(assessment_id,school_id,offering_id) references public.assessments(id,school_id,offering_id),
 foreign key(offering_id,student_id) references public.subject_enrollments(offering_id,student_id),
 foreign key(student_id,school_id) references public.students(id,school_id)
);
create table public.assessment_events (
 id uuid primary key default gen_random_uuid(),assessment_id uuid not null references public.assessments(id),
 actor_id uuid references auth.users(id) on delete set null,action text not null,details jsonb not null,
 created_at timestamptz not null default now()
);
create or replace function private.teaches_offering(oid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.teacher_assignments a join public.teachers t on t.id=a.teacher_id
 where a.offering_id=oid and t.user_id=auth.uid() and private.has_role(a.school_id,array['TEACHER']::public.school_role[]));
$$;
revoke all on function private.teaches_offering(uuid) from public,anon;
grant execute on function private.teaches_offering(uuid) to authenticated;
alter table public.assessments enable row level security;
alter table public.assessment_scores enable row level security;
alter table public.assessment_events enable row level security;
revoke all on public.assessments,public.assessment_scores,public.assessment_events from public,anon,authenticated;
grant select on public.assessments,public.assessment_scores,public.assessment_events to authenticated;
create policy assessment_staff_read on public.assessments for select to authenticated using(private.staff_offering(offering_id));
create policy scores_staff_read on public.assessment_scores for select to authenticated using(private.staff_offering(offering_id));
create policy assessment_events_read on public.assessment_events for select to authenticated using(exists(select 1 from public.assessments a where a.id=assessment_id and private.staff_offering(a.offering_id)));

create function public.can_manage_assessments(offering uuid) returns boolean language sql stable security invoker set search_path='' as $$select private.teaches_offering(offering);$$;
create function public.create_assessment(offering uuid,title text,assessment_date date,max_score numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.assessments;
begin
 if not private.teaches_offering(offering) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 insert into public.assessments(school_id,offering_id,title,assessment_date,max_score,created_by)
 select o.school_id,o.id,btrim(title),assessment_date,max_score,auth.uid() from public.subject_offerings o where o.id=offering returning * into a;
 insert into public.assessment_events(assessment_id,actor_id,action,details) values(a.id,auth.uid(),'create',jsonb_build_object('title',a.title,'max_score',a.max_score));
 return a.id;
end;$$;
create function public.save_assessment_scores(target uuid,expected_version integer,entries jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare a public.assessments; e jsonb; sid uuid; value numeric;
begin
 select * into a from public.assessments where id=target for update;
 if not found or not private.teaches_offering(a.offering_id) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 if a.published_at is not null then raise exception 'Published assessment is read-only' using errcode='22023'; end if;
 if expected_version is null or a.version<>expected_version then raise exception 'Assessment changed; refresh before saving' using errcode='40001'; end if;
 if entries is null or jsonb_typeof(entries)<>'array' then raise exception 'Invalid scores' using errcode='22023'; end if;
 if jsonb_array_length(entries)>500 then raise exception 'Too many scores' using errcode='22023'; end if;
 if (select count(*)<>count(distinct x->>'student_id') from jsonb_array_elements(entries) x) then raise exception 'Duplicate student' using errcode='22023'; end if;
 for e in select * from jsonb_array_elements(entries) loop
  sid:=(e->>'student_id')::uuid;
  if sid is null or not exists(select 1 from public.subject_enrollments where offering_id=a.offering_id and student_id=sid and school_id=a.school_id) then raise exception 'Student not enrolled in subject' using errcode='22023'; end if;
  if not(e ? 'score') or jsonb_typeof(e->'score') not in ('number','null') then raise exception 'Invalid score' using errcode='22023'; end if;
  if e->'score'='null'::jsonb then
   delete from public.assessment_scores where assessment_id=a.id and student_id=sid;
  else
   value:=(e->>'score')::numeric;
   if value<0 or value>a.max_score or value<>round(value,2) then raise exception 'Score out of range' using errcode='22023'; end if;
   insert into public.assessment_scores values(a.id,a.school_id,a.offering_id,sid,value)
   on conflict(assessment_id,student_id) do update set score=excluded.score;
  end if;
 end loop;
 update public.assessments set version=version+1 where id=a.id;
 insert into public.assessment_events(assessment_id,actor_id,action,details) values(a.id,auth.uid(),'save_scores',jsonb_build_object('version',a.version+1,'entries',entries));
end;$$;
create function public.publish_assessment(target uuid,expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare a public.assessments;
begin
 select * into a from public.assessments where id=target for update;
 if not found or not private.teaches_offering(a.offering_id) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 if a.published_at is not null then raise exception 'Already published' using errcode='22023'; end if;
 if expected_version is null or a.version<>expected_version then raise exception 'Assessment changed; refresh before publishing' using errcode='40001'; end if;
 if not exists(select 1 from public.assessment_scores where assessment_id=a.id) then raise exception 'Save at least one score before publishing' using errcode='22023'; end if;
 update public.assessments set published_at=now(),version=version+1 where id=a.id;
 insert into public.assessment_events(assessment_id,actor_id,action,details) values(a.id,auth.uid(),'publish',jsonb_build_object('version',a.version+1));
end;$$;
-- A separate projection always restricts by the caller's student identity, even for mixed-role users.
create function public.my_published_scores() returns table(assessment_id uuid,title text,assessment_date date,subject text,class_name text,school text,score numeric,max_score numeric,published_at timestamptz)
language sql stable security definer set search_path='' as $$
 select a.id,a.title,a.assessment_date,su.name,c.name,sc.name,s.score,a.max_score,a.published_at
 from public.assessment_scores s join public.assessments a on a.id=s.assessment_id
 join public.subject_offerings o on o.id=a.offering_id join public.subjects su on su.id=o.subject_id
 join public.classes c on c.id=o.class_id join public.schools sc on sc.id=a.school_id
 where a.published_at is not null and private.own_student(s.student_id)
 order by a.assessment_date desc,a.created_at desc;
$$;
revoke all on function public.can_manage_assessments(uuid),public.create_assessment(uuid,text,date,numeric),public.save_assessment_scores(uuid,integer,jsonb),public.publish_assessment(uuid,integer),public.my_published_scores() from public,anon;
grant execute on function public.can_manage_assessments(uuid),public.create_assessment(uuid,text,date,numeric),public.save_assessment_scores(uuid,integer,jsonb),public.publish_assessment(uuid,integer),public.my_published_scores() to authenticated;
create index assessments_offering_created_idx on public.assessments(offering_id,created_at desc);
create index assessment_scores_student_idx on public.assessment_scores(student_id);
create index assessment_events_assessment_idx on public.assessment_events(assessment_id,created_at);
