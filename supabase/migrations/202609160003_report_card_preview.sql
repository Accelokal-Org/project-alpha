begin;
create function public.preview_report_card(target_class uuid,target_student uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.classes; st public.students; result jsonb; offering_count integer;
begin
 select * into c from public.classes where id=target_class;
 if not found or not (private.advises(c.id) or private.is_head(c.school_id)) then raise exception 'Class adviser or school head access required' using errcode='42501'; end if;
 select s.* into st from public.students s join public.class_enrollments e on e.student_id=s.id and e.class_id=c.id where s.id=target_student and s.school_id=c.school_id;
 if not found then raise exception 'Student is not enrolled in this class' using errcode='42501'; end if;
 select count(*) into offering_count from public.subject_offerings o join public.classes oc on oc.id=o.class_id
 where o.school_id=c.school_id and oc.school_year_id=c.school_year_id and (o.class_id=c.id or exists(select 1 from public.subject_enrollments e where e.offering_id=o.id and e.student_id=st.id));
 if offering_count>200 then raise exception 'Report preview supports up to 200 subject offerings per student' using errcode='22023'; end if;
 with offerings as (
  select o.id,su.name subject,su.code,oc.name subject_class,
   exists(select 1 from public.subject_enrollments e where e.offering_id=o.id and e.student_id=st.id) enrolled
  from public.subject_offerings o join public.classes oc on oc.id=o.class_id join public.subjects su on su.id=o.subject_id
  where o.school_id=c.school_id and oc.school_year_id=c.school_year_id and (o.class_id=c.id or exists(select 1 from public.subject_enrollments e where e.offering_id=o.id and e.student_id=st.id))
 ), records as (
  select o.*,p.id period_id,p.name period_name,p.starts_on,p.ends_on,g.name scheme_name,
   s.id submission_id,s.revision,s.review_version,s.status submission_status,
   case when jsonb_typeof(m.student->'grade')='number' then (m.student->>'grade')::numeric else null end recorded_grade,
   m.matches,
   case when not o.enrolled then 'enrollment_review'
    when b.scheme_id is null then 'scheme_missing'
    when p.id is null then 'period_missing'
    when s.id is null then 'submission_missing'
    when s.status<>'locked' then 'not_locked'
    when m.matches<>1 or jsonb_typeof(m.student->'grade') is distinct from 'number' then 'grade_missing'
    when (m.student->>'grade')::numeric not between 0 and 100 then 'grade_invalid'
    else 'complete' end check_status
  from offerings o left join public.subject_gradebooks b on b.offering_id=o.id
  left join public.grading_schemes g on g.id=b.scheme_id
  left join public.grading_periods p on p.scheme_id=b.scheme_id
  left join public.grade_submissions s on s.offering_id=o.id and s.period_id=p.id
  left join lateral (
   select count(*) matches,(jsonb_agg(v)->0) student
   from jsonb_array_elements(case when jsonb_typeof(s.snapshot->'students')='array' then s.snapshot->'students' else '[]'::jsonb end) v
   where v->>'id'=st.id::text
  ) m on true
 ), visible as (
  select id offering_id,subject,code,subject_class,enrolled,period_id,period_name,starts_on,ends_on,scheme_name,submission_id,revision,review_version,submission_status,check_status,
   case when check_status='complete' then recorded_grade else null end grade
  from records
 )
 select jsonb_build_object(
  'student',jsonb_build_object('id',st.id,'name',st.display_name,'code',st.student_code),
  'class',jsonb_build_object('id',c.id,'name',c.name),
  'school',(select name from public.schools where id=c.school_id),
  'school_year',(select name from public.school_years where id=c.school_year_id),
  'ready',exists(select 1 from visible) and not exists(select 1 from visible where check_status<>'complete'),
  'total',(select count(*) from visible),'incomplete',(select count(*) from visible where check_status<>'complete'),
  'rows',coalesce((select jsonb_agg(to_jsonb(v) order by v.subject,v.offering_id,v.starts_on,v.period_id) from visible v),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function public.preview_report_card(uuid,uuid) from public,anon;
grant execute on function public.preview_report_card(uuid,uuid) to authenticated;
commit;
