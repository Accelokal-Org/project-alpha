begin;
create table public.grade_calculation_rules (
 scheme_id uuid primary key references public.grading_schemes(id),
 method text not null check(method in ('total_points','average_percentages')),
 missing_scores text not null check(missing_scores in ('block','zero')),
 decimal_places integer not null check(decimal_places between 0 and 2),
 approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz not null default now()
);
alter table public.grade_calculation_rules enable row level security;
revoke all on public.grade_calculation_rules from public,anon,authenticated;
grant select on public.grade_calculation_rules to authenticated;
create policy calculation_rules_read on public.grade_calculation_rules for select to authenticated using(exists(select 1 from public.grading_schemes s where s.id=scheme_id));
create function public.approve_grade_calculation(scheme uuid,method text,missing_scores text,decimal_places integer) returns void language plpgsql security definer set search_path='' as $$
declare s public.grading_schemes;
begin
 select * into s from public.grading_schemes where id=scheme for update;
 if not found or not private.is_head(s.school_id) then raise exception 'School head access required' using errcode='42501'; end if;
 if s.approved_at is null then raise exception 'Approve the grading scheme first' using errcode='22023'; end if;
 if exists(select 1 from public.grade_calculation_rules r where r.scheme_id=scheme) then raise exception 'Calculation rule already approved and locked' using errcode='22023'; end if;
 insert into public.grade_calculation_rules values(scheme,method,missing_scores,decimal_places,auth.uid(),now());
 insert into public.admin_audit_log(school_id,actor_id,action,entity_id,after_value) values(s.school_id,auth.uid(),'approve_grade_calculation',scheme,jsonb_build_object('method',method,'missing_scores',missing_scores,'decimal_places',decimal_places));
end;$$;
-- A subject uses one approved scheme once its first period is submitted.
create table public.subject_gradebooks (
 offering_id uuid primary key, school_id uuid not null, scheme_id uuid not null,
 unique(offering_id,scheme_id),
 foreign key(offering_id,school_id) references public.subject_offerings(id,school_id),
 foreign key(scheme_id,school_id) references public.grading_schemes(id,school_id)
);
create table public.grade_submissions (
 id uuid primary key default gen_random_uuid(), offering_id uuid not null, scheme_id uuid not null, period_id uuid not null,
 snapshot jsonb not null, submitted_by uuid references auth.users(id) on delete set null,
 submitted_at timestamptz not null default now(), unique(offering_id,period_id),
 foreign key(offering_id,scheme_id) references public.subject_gradebooks(offering_id,scheme_id),
 foreign key(period_id,scheme_id) references public.grading_periods(id,scheme_id)
);
alter table public.subject_gradebooks enable row level security;
alter table public.grade_submissions enable row level security;
revoke all on public.subject_gradebooks,public.grade_submissions from public,anon,authenticated;
grant select on public.subject_gradebooks,public.grade_submissions to authenticated;
create policy gradebooks_staff_read on public.subject_gradebooks for select to authenticated using(private.staff_offering(offering_id));
create policy submissions_staff_read on public.grade_submissions for select to authenticated using(private.staff_offering(offering_id));
create function public.grade_period_options(offering uuid) returns table(id uuid,name text,scheme_id uuid,scheme_name text,starts_on date,ends_on date)
language sql stable security invoker set search_path='' as $$
 select p.id,p.name,s.id,s.name,p.starts_on,p.ends_on from public.grading_periods p join public.grading_schemes s on s.id=p.scheme_id
 join public.grade_calculation_rules r on r.scheme_id=s.id
 join public.subject_offerings o on o.id=offering join public.classes c on c.id=o.class_id
 where private.staff_offering(o.id) and s.school_id=o.school_id and s.school_year_id=c.school_year_id and s.approved_at is not null
 and not exists(select 1 from public.subject_gradebooks b where b.offering_id=o.id and b.scheme_id<>s.id)
 order by s.name,p.starts_on,p.id;
$$;
create function public.preview_period_grades(offering uuid,period uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.grading_periods; s public.grading_schemes; rule public.grade_calculation_rules; result jsonb; v_student_count integer; v_assessment_count integer;
begin
 if not private.staff_offering(offering) then raise exception 'Subject staff access required' using errcode='42501'; end if;
 select * into p from public.grading_periods where id=period;
 select g.* into s from public.grading_schemes g join public.subject_offerings o on o.id=offering join public.classes c on c.id=o.class_id where g.id=p.scheme_id and g.school_id=o.school_id and g.school_year_id=c.school_year_id and g.approved_at is not null;
 if not found then raise exception 'Approved period not available for this subject' using errcode='22023'; end if;
 select * into rule from public.grade_calculation_rules where scheme_id=s.id;
 if not found then raise exception 'School must approve a calculation rule first' using errcode='22023'; end if;
 if exists(select 1 from public.subject_gradebooks b where b.offering_id=offering and b.scheme_id<>s.id) then raise exception 'Subject already uses another submitted scheme' using errcode='22023'; end if;
 select count(*) into v_student_count from public.subject_enrollments e where e.offering_id=offering;
 select count(*) into v_assessment_count from public.assessments a where a.offering_id=offering and a.assessment_date between p.starts_on and p.ends_on;
 if v_student_count>500 or v_assessment_count>500 or v_student_count::bigint*v_assessment_count>50000 then raise exception 'Grade review supports at most 500 students, 500 assessments and 50000 student-assessment entries per period' using errcode='22023'; end if;
 with sources as (
  select a.id,a.title,a.version,a.max_score,a.assessment_date,g.component_id,
   g.scheme_id=s.id and g.period_id=p.id as included
  from public.assessments a left join public.assessment_grading g on g.assessment_id=a.id
  where a.offering_id=offering and a.assessment_date between p.starts_on and p.ends_on
 ), roster as (
  select st.id,st.display_name,st.student_code from public.subject_enrollments e join public.students st on st.id=e.student_id where e.offering_id=offering
 ), breakdown as (
  select st.id,st.display_name,st.student_code,c.id component_id,c.name,c.weight,
   count(a.id)::integer assessment_count,count(a.id) filter(where sc.score is null)::integer missing_count,
   coalesce(sum(sc.score),0) earned,coalesce(sum(a.max_score),0) possible,
   coalesce(jsonb_agg(jsonb_build_object('assessment_id',a.id,'title',a.title,'score',sc.score,'max_score',a.max_score) order by a.id) filter(where a.id is not null),'[]'::jsonb) scores,
   case when count(a.id)=0 or (rule.missing_scores='block' and count(a.id) filter(where sc.score is null)>0) then null
   when rule.method='total_points' then coalesce(sum(sc.score),0)/sum(a.max_score)*c.weight
   else avg(coalesce(sc.score,0)/a.max_score)*c.weight end weighted
  from roster st cross join public.grading_components c
  left join sources a on a.component_id=c.id and a.included
  left join public.assessment_scores sc on sc.assessment_id=a.id and sc.student_id=st.id
  where c.scheme_id=s.id group by st.id,st.display_name,st.student_code,c.id,c.name,c.weight
 ), student_rows as (
  select id,display_name,student_code,
   case when bool_and(weighted is not null) then round(sum(weighted),rule.decimal_places) else null end grade,
   jsonb_agg(jsonb_build_object('id',component_id,'name',name,'weight',weight,'assessments',assessment_count,'missing',missing_count,'earned',earned,'possible',possible,'weighted',weighted,'scores',scores) order by component_id) components
  from breakdown group by id,display_name,student_code
 )
 select jsonb_build_object(
  'period_id',p.id,'period_name',p.name,'scheme_id',s.id,'scheme_name',s.name,
  'method',rule.method,'missing_scores',rule.missing_scores,'decimal_places',rule.decimal_places,
  'students',coalesce((select jsonb_agg(to_jsonb(st) order by st.student_code,st.id) from student_rows st),'[]'::jsonb),
  'assessments',coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from sources a),'[]'::jsonb),
  'unclassified', (select count(*) from sources where included is distinct from true),
  'ready',exists(select 1 from student_rows) and not exists(select 1 from student_rows where grade is null) and not exists(select 1 from sources where included is distinct from true)
 ) into result;
 return result||jsonb_build_object('token',md5(result::text));
end;$$;
create function public.submit_period_grades(offering uuid,period uuid,expected_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare preview jsonb; sid uuid; school uuid; submission uuid;
begin
 if not private.teaches_offering(offering) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 -- Serialize submissions for an offering, including two first submissions with different schemes.
 select school_id into school from public.subject_offerings where id=offering for update;
 if exists(select 1 from public.grade_submissions g where g.offering_id=offering and g.period_id=period) then raise exception 'Period grades already submitted' using errcode='22023'; end if;
 preview:=public.preview_period_grades(offering,period);
 if expected_token is null or expected_token is distinct from preview->>'token' then raise exception 'Grade inputs changed; refresh and review again' using errcode='40001'; end if;
 if not (preview->>'ready')::boolean then raise exception 'Resolve missing scores, components or classification before submitting' using errcode='22023'; end if;
 sid:=(preview->>'scheme_id')::uuid;
 insert into public.subject_gradebooks(offering_id,school_id,scheme_id) values(offering,school,sid) on conflict(offering_id) do nothing;
 if exists(select 1 from public.subject_gradebooks b where b.offering_id=offering and b.scheme_id<>sid) then raise exception 'Subject already uses another submitted scheme' using errcode='22023'; end if;
 insert into public.grade_submissions(offering_id,scheme_id,period_id,snapshot,submitted_by) values(offering,sid,period,preview,auth.uid()) returning id into submission;
 insert into public.admin_audit_log(school_id,actor_id,action,entity_id,after_value) values(school,auth.uid(),'submit_period_grades',submission,jsonb_build_object('offering',offering,'period',period,'scheme',sid,'token',preview->>'token','student_count',jsonb_array_length(preview->'students')));
 return submission;
end;$$;
revoke all on function public.approve_grade_calculation(uuid,text,text,integer),public.grade_period_options(uuid),public.preview_period_grades(uuid,uuid),public.submit_period_grades(uuid,uuid,text) from public,anon;
grant execute on function public.approve_grade_calculation(uuid,text,text,integer),public.grade_period_options(uuid),public.preview_period_grades(uuid,uuid),public.submit_period_grades(uuid,uuid,text) to authenticated;
-- Preserve the subject scheme chosen at first submission during later classification.
create or replace function public.assign_assessment_grading(target uuid,expected_version integer,scheme uuid,period uuid,component uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.assessments; prior jsonb;
begin
 select * into a from public.assessments where id=target for update;
 if not found or not private.teaches_offering(a.offering_id) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 if expected_version is null or expected_version<>a.version then raise exception 'Assessment changed; refresh before saving' using errcode='40001'; end if;
 if a.published_at is not null then raise exception 'Published assessment is read-only' using errcode='22023'; end if;
 perform 1 from public.subject_offerings where id=a.offering_id for update;
 if scheme is not null and exists(select 1 from public.subject_gradebooks b where b.offering_id=a.offering_id and b.scheme_id<>scheme) then raise exception 'Subject already uses another submitted scheme' using errcode='22023'; end if;
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
commit;
