import {beforeAll,afterAll,it,expect} from "vitest";
import type {PGlite} from "@electric-sql/pglite";
import {createTestDatabase} from "./database";
import {previewSchema,type GradePreview} from "@/features/grades/schema";
let db:PGlite;let sequence=0;
const school="10000000-0000-4000-8000-000000000001",year="20000000-0000-4000-8000-000000000001",offering="70000000-0000-4000-8000-000000000001";
const uid=(n:number)=>`96000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const student="80000000-0000-4000-8000-000000000001";
async function actor(n:number,sql:string,args:unknown[]=[]){await db.exec(`set role authenticated;set request.jwt.claim.sub='${uid(n)}'`);try{return await db.query<Record<string,unknown>>(sql,args);}finally{await db.exec("reset role;reset request.jwt.claim.sub");}}
async function setup(method="total_points",missing="block",decimals=2,weights=[40,60]){
 const scheme=(await actor(4,"select public.save_grading_scheme($1,$2,null,0,$3,$4,$5) id",[school,year,`Grades ${++sequence}`,JSON.stringify([{name:"P1",starts_on:"2026-06-01",ends_on:"2026-10-31"},{name:"P2",starts_on:"2026-11-01",ends_on:"2027-04-30"}]),JSON.stringify(weights.map((weight,i)=>({name:`C${i}`,weight})))])).rows[0].id as string;
 await actor(4,"select public.approve_grading_scheme($1,1)",[scheme]);
 await actor(4,"select public.approve_grade_calculation($1,$2,$3,$4)",[scheme,method,missing,decimals]);
 const period=(await db.query<{id:string}>("select id from public.grading_periods where scheme_id=$1 order by starts_on",[scheme])).rows[0].id;
 const components=(await db.query<{id:string}>("select id from public.grading_components where scheme_id=$1 order by name",[scheme])).rows.map(c=>c.id);
 return {scheme,period,components};
}
async function assessment(s:{scheme:string;period:string},component:string,max:number,score:number|null){
 const id=(await actor(1,"select public.create_assessment($1,'Assessment','2026-09-15',$2) id",[offering,max])).rows[0].id as string;
 await actor(1,"select public.assign_assessment_grading($1,1,$2,$3,$4)",[id,s.scheme,s.period,component]);
 if(score!==null)await actor(1,"select public.save_assessment_scores($1,2,$2)",[id,JSON.stringify([{student_id:student,score}])]);
 return id;
}
async function preview(period:string,n=1):Promise<GradePreview>{return previewSchema.parse((await actor(n,"select public.preview_period_grades($1,$2) value",[offering,period])).rows[0].value);}
async function submit(period:string,token:string,n=1){return actor(n,"select public.submit_period_grades($1,$2,$3) id",[offering,period,token]);}
// Restore an embedded database snapshot after each test; no hosted writes.
import {beforeEach,afterEach} from "vitest";
beforeAll(async()=>{db=await createTestDatabase();await db.exec(`insert into auth.users(id) select ('96000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.school_memberships values('${school}','${uid(1)}','TEACHER'),('${school}','${uid(2)}','TEACHER'),('${school}','${uid(3)}','STUDENT'),('${school}','${uid(4)}','SCHOOL_HEAD'),('${school}','${uid(6)}','ADVISER');
insert into public.platform_admins(user_id) values('${uid(5)}');update public.teachers set user_id='${uid(1)}' where employee_code='T-001';update public.teachers set user_id='${uid(2)}' where employee_code='T-002';
delete from public.subject_enrollments where offering_id='${offering}' and student_id<>'${student}';`);});
afterAll(async()=>{await db.close();});
// Snapshot/restore via an isolated database per test avoids aborted-transaction coupling after expected SQL failures.
let backup:Awaited<ReturnType<PGlite["dumpDataDir"]>>;
beforeEach(async()=>{backup=await db.dumpDataDir();});
afterEach(async()=>{await db.close();const {PGlite}=await import("@electric-sql/pglite");db=new PGlite({loadDataDir:backup});await db.waitReady;});
it("calculates total-points weighting with full precision and includes a reproducible breakdown",async()=>{
 const s=await setup();await assessment(s,s.components[0],10,10);await assessment(s,s.components[0],90,0);await assessment(s,s.components[1],3,2);
 const p=await preview(s.period);expect(p.ready).toBe(true);expect(p.students[0].grade).toBe(44);
 expect(p.students[0].components.reduce((n,c)=>n+c.scores.length,0)).toBe(3);
});
it("honors school average-percentage method and final rounding",async()=>{
 const s=await setup("average_percentages","block",1);await assessment(s,s.components[0],10,10);await assessment(s,s.components[0],90,0);await assessment(s,s.components[1],7,4);
 const p=await preview(s.period);expect(p.students[0].grade).toBe(54.3);
});
it("blocks missing scores and empty components without treating recorded zero as missing",async()=>{
 const s=await setup();await assessment(s,s.components[0],10,0);const absent=await assessment(s,s.components[1],10,null);
 const p=await preview(s.period);expect(p.ready).toBe(false);expect(p.students[0].grade).toBeNull();
 expect(p.students[0].components.find(c=>c.id===s.components[0])?.missing).toBe(0);
 await expect(submit(s.period,p.token)).rejects.toThrow(/Resolve missing/);
 await actor(1,"select public.save_assessment_scores($1,2,$2)",[absent,JSON.stringify([{student_id:student,score:5}])]);expect((await preview(s.period)).ready).toBe(true);
});
it("uses zero only under approved school policy and still blocks components without assessments",async()=>{
 const s=await setup("total_points","zero",0);await assessment(s,s.components[0],10,null);
 expect((await preview(s.period)).ready).toBe(false);
 await assessment(s,s.components[1],10,5);const p=await preview(s.period);expect(p.ready).toBe(true);expect(p.students[0].grade).toBe(30);
});
it("requires school approval and locks calculation rules",async()=>{
 const s=await setup();for(const n of [1,2,3,6])await expect(actor(n,"select public.approve_grade_calculation($1,'total_points','block',2)",[s.scheme])).rejects.toThrow(/School head/);
 await expect(actor(4,"select public.approve_grade_calculation($1,'total_points','zero',0)",[s.scheme])).rejects.toThrow(/locked/);
 await expect(actor(4,"update public.grade_calculation_rules set decimal_places=0")).rejects.toThrow(/permission denied/);
});
it("blocks unclassified assessments and rejects stale scores or enrollment changes",async()=>{
 const s=await setup();const a=await assessment(s,s.components[0],10,5);await assessment(s,s.components[1],10,5);const p=await preview(s.period);
 await actor(1,"select public.save_assessment_scores($1,3,$2)",[a,JSON.stringify([{student_id:student,score:6}])]);await expect(submit(s.period,p.token)).rejects.toThrow(/changed/);
 const fresh=await preview(s.period);
 await db.exec(`insert into public.subject_enrollments values('${school}','${offering}','80000000-0000-4000-8000-000000000002')`);
 await expect(submit(s.period,fresh.token)).rejects.toThrow(/changed/);
 await actor(1,"select public.create_assessment($1,'Unclassified','2026-09-15',10)",[offering]);expect((await preview(s.period)).unclassified).toBe(1);
});
it("submits an immutable snapshot, binds the subject scheme, and preserves student privacy",async()=>{
 const s=await setup();const a=await assessment(s,s.components[0],10,5);await assessment(s,s.components[1],10,5);const p=await preview(s.period);
 for(const n of [2,3,4,5,6])await expect(submit(s.period,p.token,n)).rejects.toThrow(/Assigned teacher/);
 await submit(s.period,p.token);await expect(submit(s.period,p.token)).rejects.toThrow(/already submitted/);
 await actor(1,"select public.save_assessment_scores($1,3,$2)",[a,JSON.stringify([{student_id:student,score:10}])]);
 const stored=(await actor(1,"select snapshot from public.grade_submissions")).rows[0].snapshot as GradePreview;expect(stored.students[0].grade).toBe(50);
 for(const n of [2,3]){expect((await actor(n,"select * from public.grade_submissions")).rows).toHaveLength(0);await expect(preview(s.period,n)).rejects.toThrow(/staff/);}
 expect((await actor(4,"select * from public.grade_submissions")).rows).toHaveLength(1);
 await expect(actor(1,"update public.grade_submissions set snapshot='{}'")).rejects.toThrow(/permission denied/);
 const other=await setup();await expect(preview(other.period)).rejects.toThrow(/another submitted scheme/);
 await expect(actor(1,"select public.assign_assessment_grading($1,4,$2,$3,$4)",[a,other.scheme,other.period,other.components[0]])).rejects.toThrow(/another submitted scheme/);
 expect((await actor(1,"select * from public.grade_period_options($1)",[offering])).rows.every(r=>r.scheme_id===s.scheme)).toBe(true);
 expect((await db.query("select * from public.admin_audit_log where action='submit_period_grades'")).rows).toHaveLength(1);
});
it("honors revoked teacher access and rejects unrelated periods",async()=>{
 const s=await setup();await assessment(s,s.components[0],10,5);await assessment(s,s.components[1],10,5);const p=await preview(s.period);
 await db.exec(`delete from public.school_memberships where user_id='${uid(1)}'`);await expect(submit(s.period,p.token)).rejects.toThrow(/Assigned teacher/);
 await expect(preview("00000000-0000-4000-8000-000000000000",4)).rejects.toThrow(/not available/);
 await db.exec("set role anon");try{await expect(db.query("select public.preview_period_grades($1,$2)",[offering,s.period])).rejects.toThrow(/permission denied/);}finally{await db.exec("reset role");}
});
