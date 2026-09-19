begin;
create table public.report_cards (
 id uuid primary key default gen_random_uuid(), school_id uuid not null, class_id uuid not null, student_id uuid not null,
 current_version integer not null default 0, unique(class_id,student_id),
 foreign key(class_id,school_id) references public.classes(id,school_id),
 foreign key(student_id,school_id) references public.students(id,school_id)
);
create table public.report_card_versions (
 report_id uuid not null references public.report_cards(id), version integer not null,
 snapshot jsonb not null, source_token text not null,
 saved_by uuid references auth.users(id) on delete set null, saved_at timestamptz not null default now(),
 approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz,
 primary key(report_id,version)
);
create table public.report_card_events (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.report_cards(id), version integer not null,
 action text not null, actor_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
alter table public.report_cards enable row level security;
alter table public.report_card_versions enable row level security;
alter table public.report_card_events enable row level security;
revoke all on public.report_cards,public.report_card_versions,public.report_card_events from public,anon,authenticated;
grant select on public.report_cards,public.report_card_versions,public.report_card_events to authenticated;
create policy reports_staff_read on public.report_cards for select to authenticated using(private.advises(class_id) or private.is_head(school_id));
create policy report_versions_staff_read on public.report_card_versions for select to authenticated using(exists(select 1 from public.report_cards r where r.id=report_id));
create policy report_events_staff_read on public.report_card_events for select to authenticated using(exists(select 1 from public.report_cards r where r.id=report_id));
create function public.report_card_source(target_class uuid,target_student uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare source jsonb;
begin
 source:=public.preview_report_card(target_class,target_student);
 return jsonb_build_object('snapshot',source,'token',md5(source::text));
end;$$;
create function public.save_report_card(target_class uuid,target_student uuid,expected_version integer,expected_token text) returns integer language plpgsql security definer set search_path='' as $$
declare c public.classes; r public.report_cards; source jsonb; next_version integer;
begin
 select * into c from public.classes where id=target_class for update;
 if not found or not(private.advises(c.id) or private.is_head(c.school_id)) then raise exception 'Class adviser or school head access required' using errcode='42501'; end if;
 source:=public.report_card_source(target_class,target_student);
 if expected_token is null or expected_token is distinct from source->>'token' then raise exception 'Report source changed; refresh and review again' using errcode='40001'; end if;
 insert into public.report_cards(school_id,class_id,student_id) values(c.school_id,c.id,target_student) on conflict(class_id,student_id) do nothing;
 select * into r from public.report_cards where class_id=c.id and student_id=target_student for update;
 if expected_version is null or expected_version<>r.current_version then raise exception 'Report version changed; refresh before saving' using errcode='40001'; end if;
 if exists(select 1 from public.report_card_versions v where v.report_id=r.id and v.version=r.current_version and v.source_token=source->>'token') then raise exception 'Current source is already saved' using errcode='22023'; end if;
 next_version:=r.current_version+1;
 insert into public.report_card_versions(report_id,version,snapshot,source_token,saved_by) values(r.id,next_version,source->'snapshot',source->>'token',auth.uid());
 update public.report_cards set current_version=next_version where id=r.id;
 insert into public.report_card_events(report_id,version,action,actor_id) values(r.id,next_version,'saved',auth.uid());
 return next_version;
end;$$;
create function public.approve_report_card(target uuid,expected_version integer,expected_token text) returns void language plpgsql security definer set search_path='' as $$
declare r public.report_cards; v public.report_card_versions; source jsonb;
begin
 select * into r from public.report_cards where id=target for update;
 if not found or not private.is_head(r.school_id) then raise exception 'School head access required' using errcode='42501'; end if;
 if expected_version is null or r.current_version<>expected_version then raise exception 'Report version changed; refresh before approval' using errcode='40001'; end if;
 select * into v from public.report_card_versions where report_id=r.id and version=r.current_version for update;
 if not found or v.approved_at is not null then raise exception 'Current draft is not available for approval' using errcode='22023'; end if;
 source:=public.report_card_source(r.class_id,r.student_id);
 if expected_token is null or expected_token is distinct from v.source_token or v.source_token is distinct from source->>'token' then raise exception 'Report source changed; save and review a new version' using errcode='40001'; end if;
 if not coalesce((v.snapshot->>'ready')::boolean,false) then raise exception 'Resolve report completeness checks before approval' using errcode='22023'; end if;
 update public.report_card_versions set approved_at=now(),approved_by=auth.uid() where report_id=r.id and version=v.version;
 insert into public.report_card_events(report_id,version,action,actor_id) values(r.id,v.version,'approved',auth.uid());
end;$$;
revoke all on function public.report_card_source(uuid,uuid),public.save_report_card(uuid,uuid,integer,text),public.approve_report_card(uuid,integer,text) from public,anon;
grant execute on function public.report_card_source(uuid,uuid),public.save_report_card(uuid,uuid,integer,text),public.approve_report_card(uuid,integer,text) to authenticated;
commit;
