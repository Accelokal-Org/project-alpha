-- Safe to run for the missing-helper error; preserves all existing records.
begin;
create or replace function private.teaches_offering(oid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.teacher_assignments a join public.teachers t on t.id=a.teacher_id
 where a.offering_id=oid and t.user_id=auth.uid() and private.has_role(a.school_id,array['TEACHER']::public.school_role[]));
$$;
revoke all on function private.teaches_offering(uuid) from public,anon;
grant execute on function private.teaches_offering(uuid) to authenticated;
create or replace function public.can_manage_attendance(offering uuid) returns boolean language sql stable security invoker set search_path='' as $$select private.teaches_offering(offering);$$;
revoke all on function public.can_manage_attendance(uuid) from public,anon;
grant execute on function public.can_manage_attendance(uuid) to authenticated;
commit;
