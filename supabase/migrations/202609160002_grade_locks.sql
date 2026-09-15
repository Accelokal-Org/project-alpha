begin;
alter table public.grade_submissions drop constraint grade_submissions_status_check;
alter table public.grade_submissions add constraint grade_submissions_status_check check(status in ('submitted','returned','reviewed','locked'));
create or replace function public.review_period_grades(target uuid,expected_version integer,decision text,reason text) returns void language plpgsql security definer set search_path='' as $$
declare s public.grade_submissions;
begin
 select * into s from public.grade_submissions where id=target for update;
 if not found or not public.can_review_grades(s.offering_id) then raise exception 'Assigned adviser access required' using errcode='42501'; end if;
 if expected_version is null or s.review_version<>expected_version then raise exception 'Submission changed; refresh before review' using errcode='40001'; end if;
 if decision is null or decision not in ('returned','reviewed') then raise exception 'Invalid review decision' using errcode='22023'; end if;
 if s.status in ('returned','locked') or (decision='reviewed' and s.status<>'submitted') then raise exception 'Submission is not awaiting this review' using errcode='22023'; end if;
 if reason is null or length(reason)>1000 or (decision='returned' and length(btrim(reason))=0) then raise exception 'A return reason is required, at most 1000 characters' using errcode='22023'; end if;
 update public.grade_submissions set status=decision,review_version=review_version+1,return_reason=case when decision='returned' then btrim(reason) else null end where id=s.id;
 insert into public.grade_review_events(submission_id,revision,action,reason,actor_id) values(s.id,s.revision,decision,nullif(btrim(reason),''),auth.uid());
end;$$;

create function public.set_grade_lock(target uuid,expected_version integer,lock_record boolean,reason text) returns void language plpgsql security definer set search_path='' as $$
declare s public.grade_submissions;
begin
 select * into s from public.grade_submissions where id=target for update;
 if not found or not public.can_review_grades(s.offering_id) then raise exception 'Assigned adviser access required' using errcode='42501'; end if;
 if expected_version is null or expected_version<>s.review_version then raise exception 'Submission changed; refresh before changing its lock' using errcode='40001'; end if;
 if lock_record is null or (lock_record and s.status<>'reviewed') or (not lock_record and s.status<>'locked') then raise exception 'Only reviewed grades can be locked; only locked grades can be unlocked' using errcode='22023'; end if;
 if reason is null or length(reason)>1000 or (not lock_record and length(btrim(reason))=0) then raise exception 'An unlock reason is required (up to 1000 characters)' using errcode='22023'; end if;
 update public.grade_submissions set status=case when lock_record then 'locked' else 'reviewed' end,review_version=review_version+1 where id=s.id;
 insert into public.grade_review_events(submission_id,revision,action,reason,actor_id) values(s.id,s.revision,case when lock_record then 'locked' else 'unlocked' end,nullif(btrim(reason),''),auth.uid());
end;$$;
create function public.school_grade_completion(target_school uuid,target_year uuid,page_number integer default 0,status_filter text default '') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.is_head(target_school) then raise exception 'School head access required' using errcode='42501'; end if;
 if not exists(select 1 from public.school_years y where y.id=target_year and y.school_id=target_school) then raise exception 'School year not available' using errcode='22023'; end if;
 if page_number is null or page_number<0 or page_number>100000 or status_filter is null or status_filter not in ('','not submitted','submitted','returned','reviewed','locked') then raise exception 'Invalid completion filter' using errcode='22023'; end if;
 with entries as (
  select o.id offering_id,c.name class_name,su.name subject,p.id period_id,p.name period_name,
   coalesce(s.status,'not submitted') status,s.revision,b.scheme_id
  from public.classes c join public.subject_offerings o on o.class_id=c.id
  join public.subjects su on su.id=o.subject_id
  left join public.subject_gradebooks b on b.offering_id=o.id
  left join public.grading_periods p on p.scheme_id=b.scheme_id
  left join public.grade_submissions s on s.offering_id=o.id and s.period_id=p.id
  where c.school_id=target_school and c.school_year_id=target_year
 ), filtered as (select * from entries where status_filter='' or status=status_filter),
 empty_classes as (select c.id,c.name from public.classes c where c.school_id=target_school and c.school_year_id=target_year and not exists(select 1 from public.subject_offerings o where o.class_id=c.id))
 select jsonb_build_object(
  'counts',jsonb_build_object('not submitted',(select count(*) from entries where status='not submitted'),'submitted',(select count(*) from entries where status='submitted'),'returned',(select count(*) from entries where status='returned'),'reviewed',(select count(*) from entries where status='reviewed'),'locked',(select count(*) from entries where status='locked')),
  'total',(select count(*) from entries),'filtered_total',(select count(*) from filtered),
  'unconfigured_subjects',(select count(*) from entries where scheme_id is null),
  'empty_classes',(select count(*) from empty_classes),
  'ready',exists(select 1 from entries) and not exists(select 1 from entries where status<>'locked' or scheme_id is null) and not exists(select 1 from empty_classes),
  'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.class_name,r.subject,r.offering_id,r.period_id) from (select * from filtered order by class_name,subject,offering_id,period_id limit 50 offset page_number*50) r),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function public.set_grade_lock(uuid,integer,boolean,text),public.school_grade_completion(uuid,uuid,integer,text) from public,anon;
grant execute on function public.set_grade_lock(uuid,integer,boolean,text),public.school_grade_completion(uuid,uuid,integer,text) to authenticated;
commit;
