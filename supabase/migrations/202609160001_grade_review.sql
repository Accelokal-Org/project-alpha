begin;
alter table public.grade_submissions add column status text not null default 'submitted' check(status in ('submitted','returned','reviewed'));
alter table public.grade_submissions add column revision integer not null default 1;
alter table public.grade_submissions add column review_version integer not null default 1;
alter table public.grade_submissions add column return_reason text;
create table public.grade_submission_versions (
 submission_id uuid not null references public.grade_submissions(id), revision integer not null,
 snapshot jsonb not null, submitted_by uuid references auth.users(id) on delete set null,
 submitted_at timestamptz not null, correction_note text,
 primary key(submission_id,revision)
);
create table public.grade_review_events (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.grade_submissions(id),
 revision integer not null, action text not null, reason text,
 actor_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
alter table public.grade_submission_versions enable row level security;
alter table public.grade_review_events enable row level security;
revoke all on public.grade_submission_versions,public.grade_review_events from public,anon,authenticated;
grant select on public.grade_submission_versions,public.grade_review_events to authenticated;
create policy submission_versions_staff_read on public.grade_submission_versions for select to authenticated using(exists(select 1 from public.grade_submissions s where s.id=submission_id and private.staff_offering(s.offering_id)));
create policy review_events_staff_read on public.grade_review_events for select to authenticated using(exists(select 1 from public.grade_submissions s where s.id=submission_id and private.staff_offering(s.offering_id)));
-- Preserve existing real submissions as revision one, with their original authors and timestamps.
insert into public.grade_submission_versions(submission_id,revision,snapshot,submitted_by,submitted_at) select id,revision,snapshot,submitted_by,submitted_at from public.grade_submissions;
create function private.archive_initial_grade_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.grade_submission_versions(submission_id,revision,snapshot,submitted_by,submitted_at) values(new.id,new.revision,new.snapshot,new.submitted_by,new.submitted_at);
 insert into public.grade_review_events(submission_id,revision,action,actor_id) values(new.id,new.revision,'submitted',new.submitted_by);
 return new;
end;$$;
revoke all on function private.archive_initial_grade_submission() from public,anon,authenticated;
create trigger archive_initial_grade_submission after insert on public.grade_submissions for each row execute function private.archive_initial_grade_submission();
create function public.can_review_grades(offering uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.subject_offerings o where o.id=offering and private.advises(o.class_id));
$$;
create function public.review_period_grades(target uuid,expected_version integer,decision text,reason text) returns void language plpgsql security definer set search_path='' as $$
declare s public.grade_submissions;
begin
 select * into s from public.grade_submissions where id=target for update;
 if not found or not public.can_review_grades(s.offering_id) then raise exception 'Assigned adviser access required' using errcode='42501'; end if;
 if expected_version is null or s.review_version<>expected_version then raise exception 'Submission changed; refresh before review' using errcode='40001'; end if;
 if decision is null or decision not in ('returned','reviewed') then raise exception 'Invalid review decision' using errcode='22023'; end if;
 if s.status='returned' or (decision='reviewed' and s.status<>'submitted') then raise exception 'Submission is not awaiting this review' using errcode='22023'; end if;
 if reason is null or length(reason)>1000 or (decision='returned' and length(btrim(reason))=0) then raise exception 'A return reason is required, at most 1000 characters' using errcode='22023'; end if;
 update public.grade_submissions set status=decision,review_version=review_version+1,return_reason=case when decision='returned' then btrim(reason) else null end where id=s.id;
 insert into public.grade_review_events(submission_id,revision,action,reason,actor_id) values(s.id,s.revision,decision,nullif(btrim(reason),''),auth.uid());
end;$$;
create function public.resubmit_period_grades(target uuid,expected_version integer,expected_token text,correction_note text) returns void language plpgsql security definer set search_path='' as $$
declare s public.grade_submissions; oid uuid; calculated jsonb;
begin
 select offering_id into oid from public.grade_submissions where id=target;
 if not found or not private.teaches_offering(oid) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 perform 1 from public.subject_offerings where id=oid for update;
 select * into s from public.grade_submissions where id=target for update;
 if expected_version is null or s.review_version<>expected_version then raise exception 'Submission changed; refresh before resubmitting' using errcode='40001'; end if;
 if s.status<>'returned' then raise exception 'Submission must be returned by its adviser first' using errcode='22023'; end if;
 if correction_note is null or length(btrim(correction_note)) not between 1 and 1000 then raise exception 'Describe the correction in 1–1000 characters' using errcode='22023'; end if;
 calculated:=public.preview_period_grades(s.offering_id,s.period_id);
 if expected_token is null or expected_token is distinct from calculated->>'token' then raise exception 'Grade inputs changed; refresh and review again' using errcode='40001'; end if;
 if not (calculated->>'ready')::boolean then raise exception 'Resolve incomplete grading inputs before resubmitting' using errcode='22023'; end if;
 update public.grade_submissions set snapshot=calculated,revision=revision+1,review_version=review_version+1,status='submitted',return_reason=null,submitted_at=now(),submitted_by=auth.uid() where id=s.id;
 insert into public.grade_submission_versions(submission_id,revision,snapshot,submitted_by,submitted_at,correction_note) values(s.id,s.revision+1,calculated,auth.uid(),now(),btrim(correction_note));
 insert into public.grade_review_events(submission_id,revision,action,reason,actor_id) values(s.id,s.revision+1,'resubmitted',btrim(correction_note),auth.uid());
end;$$;
revoke all on function public.can_review_grades(uuid),public.review_period_grades(uuid,integer,text,text),public.resubmit_period_grades(uuid,integer,text,text) from public,anon;
grant execute on function public.can_review_grades(uuid),public.review_period_grades(uuid,integer,text,text),public.resubmit_period_grades(uuid,integer,text,text) to authenticated;
create index grade_review_events_submission_idx on public.grade_review_events(submission_id,created_at desc);
create function public.correct_returned_assessment_scores(target uuid,expected_version integer,entries jsonb,reason text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.assessments; e jsonb; sid uuid; value numeric; returned public.grade_submissions; prior jsonb;
begin
 select * into a from public.assessments where id=target for update;
 if not found or not private.teaches_offering(a.offering_id) then raise exception 'Assigned teacher access required' using errcode='42501'; end if;
 perform 1 from public.subject_offerings where id=a.offering_id for update;
 select s.* into returned from public.grade_submissions s join public.assessment_grading g on g.assessment_id=a.id and g.period_id=s.period_id and g.scheme_id=s.scheme_id where s.offering_id=a.offering_id for update of s;
 if not found or returned.status<>'returned' then raise exception 'Adviser must return the linked period before correction' using errcode='22023'; end if;
 if reason is null or length(btrim(reason)) not between 1 and 1000 then raise exception 'Correction reason required' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(sc) order by sc.student_id),'[]'::jsonb) into prior from public.assessment_scores sc where sc.assessment_id=a.id;
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
 insert into public.assessment_events(assessment_id,actor_id,action,details) values(a.id,auth.uid(),'correct_returned_scores',jsonb_build_object('version',a.version+1,'entries',entries,'before',prior,'reason',btrim(reason),'submission_id',returned.id));
end;$$;

revoke all on function public.correct_returned_assessment_scores(uuid,integer,jsonb,text) from public,anon;
grant execute on function public.correct_returned_assessment_scores(uuid,integer,jsonb,text) to authenticated;
create function public.class_grade_review(target_class uuid) returns table(offering_id uuid,subject text,period_id uuid,period_name text,status text,revision integer)
language sql stable security invoker set search_path='' as $$
 select o.id,su.name,p.id,p.name,coalesce(s.status,'not submitted'),s.revision
 from public.subject_offerings o join public.subjects su on su.id=o.subject_id join public.classes c on c.id=o.class_id
 left join public.subject_gradebooks b on b.offering_id=o.id left join public.grading_periods p on p.scheme_id=b.scheme_id
 left join public.grade_submissions s on s.offering_id=o.id and s.period_id=p.id
 where o.class_id=target_class and (private.advises(c.id) or private.is_head(c.school_id))
 order by su.name,p.starts_on,o.id;
$$;
revoke all on function public.class_grade_review(uuid) from public,anon;
grant execute on function public.class_grade_review(uuid) to authenticated;
commit;
