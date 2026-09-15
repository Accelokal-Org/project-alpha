import {it,expect} from "vitest";
import {readFile} from "node:fs/promises";
import {createTestDatabase} from "./database";
it("archives pre-existing submissions without changing their grades or timestamps",async()=>{
 const db=await createTestDatabase(false,["202609160001_grade_review.sql","202609160002_grade_locks.sql"]);
 try{
 await db.exec(`insert into public.grading_schemes(id,school_id,school_year_id,name) values('97000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Migration check');
 insert into public.grading_periods(id,scheme_id,name,starts_on,ends_on) values('97000000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000001','Period','2026-06-01','2026-10-31');
 insert into public.subject_gradebooks values('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000001');
 insert into public.grade_submissions(offering_id,scheme_id,period_id,snapshot,submitted_at) values('70000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','{"grade":87.25}','2026-09-15T00:00:00Z');`);
 await db.exec(await readFile(new URL("../../supabase/migrations/202609160001_grade_review.sql",import.meta.url),"utf8"));
 expect((await db.query("select v.snapshot=s.snapshot as identical,v.submitted_at=s.submitted_at as same_time,s.status,v.revision from public.grade_submissions s join public.grade_submission_versions v on v.submission_id=s.id")).rows[0]).toEqual({identical:true,same_time:true,status:"submitted",revision:1});
 }finally{await db.close();}
});
