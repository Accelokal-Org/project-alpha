-- Fictional development fixtures only. Auth accounts are provisioned separately.
insert into public.schools(id,name,timezone) values ('10000000-0000-4000-8000-000000000001','Mabini Community High School','Asia/Manila');
insert into public.school_years(id,school_id,name,starts_on,ends_on,is_active) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2026–2027','2026-06-01','2027-04-30',true);
insert into public.grade_levels(id,school_id,name,sort_order) values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Grade 8',8);
insert into public.teachers(id,school_id,employee_code,display_name) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','T-001','Andrea Reyes'),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','T-002','Daniel Santos');
insert into public.classes(id,school_id,school_year_id,grade_level_id,name,adviser_teacher_id) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Grade 8 · Acacia','40000000-0000-4000-8000-000000000001'),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Grade 8 · Narra','40000000-0000-4000-8000-000000000002');
insert into public.subjects(id,school_id,code,name) values
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','MAT','Mathematics'),
('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','SCI','Science');
insert into public.subject_offerings(id,school_id,class_id,subject_id) values
('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001'),
('70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002');
insert into public.teacher_assignments(school_id,offering_id,teacher_id) values
('10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002');
insert into public.students(id,school_id,student_code,display_name)
select ('80000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
'10000000-0000-4000-8000-000000000001', 'STU-2026-' || lpad(n::text,4,'0'), name
from unnest(array['Alonzo, Sofia','Bautista, Miguel','Cruz, Isabella','Dela Rosa, Gabriel','Garcia, Amara','Lim, Rafael','Mendoza, Chloe','Navarro, Lucas','Ramos, Elena','Reyes, Mateo','Santos, Lucia','Villanueva, Noah']) with ordinality as names(name,n);
insert into public.class_enrollments(school_id,class_id,student_id)
select school_id, case when student_code <= 'STU-2026-0006' then '50000000-0000-4000-8000-000000000001'::uuid else '50000000-0000-4000-8000-000000000002'::uuid end, id from public.students;
insert into public.subject_enrollments(school_id,offering_id,student_id)
select e.school_id,o.id,e.student_id from public.class_enrollments e join public.subject_offerings o on o.class_id=e.class_id;
