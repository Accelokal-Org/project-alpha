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

async function assignAdviser(){await db.exec(`update public.teachers set user_id='${uid(6)}' where employee_code='T-002';update public.classes set adviser_teacher_id='40000000-0000-4000-8000-000000000002' where id='50000000-0000-4000-8000-000000000001'`);}
async function submitted(){const s=await setup();const a=await assessment(s,s.components[0],10,5);await assessment(s,s.components[1],10,5);const p=await preview(s.period);const id=(await submit(s.period,p.token)).rows[0].id as string;return {...s,a,id};}
const review=(id:string,version:number,decision:string,reason:string,n=6)=>actor(n,"select public.review_period_grades($1,$2,$3,$4)",[id,version,decision,reason]);
it("allows only the assigned adviser to return a current revision with a reason",async()=>{
 await assignAdviser();const s=await submitted();
 for(const n of [1,2,3,4,5])await expect(review(s.id,1,"returned","Fix score",n)).rejects.toThrow(/Assigned adviser/);
 await expect(review(s.id,1,"returned"," ")).rejects.toThrow(/reason/);
 await review(s.id,1,"reviewed","");await expect(review(s.id,1,"returned","Fix score")).rejects.toThrow(/changed/);
 await review(s.id,2,"returned","Check assessment score");
 expect((await actor(6,"select status,revision,review_version from public.grade_submissions where id=$1",[s.id])).rows[0]).toEqual({status:"returned",revision:1,review_version:3});
 expect((await actor(6,"select * from public.class_grade_review($1)",["50000000-0000-4000-8000-000000000001"])).rows.some(r=>r.status==="returned")).toBe(true);
 await db.exec(`delete from public.school_memberships where user_id='${uid(6)}'`);
 expect((await actor(6,"select public.can_review_grades($1) allowed",[offering])).rows[0].allowed).toBe(false);
});
it("preserves original snapshots and reasons through return, published-score correction and resubmission",async()=>{
 await assignAdviser();const s=await submitted();
 await actor(1,"select public.publish_assessment($1,3)",[s.a]);
 await expect(actor(1,"select public.correct_returned_assessment_scores($1,4,$2,'Fix')",[s.a,JSON.stringify([{student_id:student,score:10}])])).rejects.toThrow(/return/);
 await review(s.id,1,"returned","Verify written score");
 await actor(1,"select public.correct_returned_assessment_scores($1,4,$2,'Checked original paper')",[s.a,JSON.stringify([{student_id:student,score:10}])]);
 const fresh=await preview(s.period);
 await expect(actor(1,"select public.resubmit_period_grades($1,1,$2,'Correction')",[s.id,fresh.token])).rejects.toThrow(/changed/);
 await expect(actor(1,"select public.resubmit_period_grades($1,2,$2,'')",[s.id,fresh.token])).rejects.toThrow(/Describe/);
 await actor(1,"select public.resubmit_period_grades($1,2,$2,'Verified and corrected written score')",[s.id,fresh.token]);
 const versions=(await actor(6,"select revision,snapshot,correction_note from public.grade_submission_versions where submission_id=$1 order by revision",[s.id])).rows;
 expect(versions).toHaveLength(2);expect((versions[0].snapshot as GradePreview).students[0].grade).toBe(50);expect((versions[1].snapshot as GradePreview).students[0].grade).toBe(70);
 expect(versions[1].correction_note).toContain("Verified");
 await expect(actor(1,"select public.correct_returned_assessment_scores($1,5,$2,'Again')",[s.a,JSON.stringify([{student_id:student,score:8}])])).rejects.toThrow(/return/);
 expect((await actor(3,"select * from public.grade_submission_versions")).rows).toHaveLength(0);expect((await actor(3,"select * from public.grade_review_events")).rows).toHaveLength(0);
 expect((await actor(6,"select action from public.grade_review_events where submission_id=$1 order by created_at",[s.id])).rows.map(e=>e.action)).toEqual(["submitted","returned","resubmitted"]);
 await expect(actor(1,"update public.grade_submission_versions set correction_note='overwrite'")).rejects.toThrow(/permission denied/);
});
it("rejects resubmission without return, unauthorized corrections and stale recalculation tokens",async()=>{
 await assignAdviser();const s=await submitted();const initial=await preview(s.period);
 await expect(actor(1,"select public.resubmit_period_grades($1,1,$2,'Fix')",[s.id,initial.token])).rejects.toThrow(/returned/);
 await review(s.id,1,"returned","Check totals");
 for(const n of [2,3,4,5,6])await expect(actor(n,"select public.resubmit_period_grades($1,2,$2,'Fix')",[s.id,initial.token])).rejects.toThrow(/Assigned teacher/);
 await actor(1,"select public.correct_returned_assessment_scores($1,3,$2,'Fix')",[s.a,JSON.stringify([{student_id:student,score:8}])]);
 await expect(actor(1,"select public.resubmit_period_grades($1,2,$2,'Fix')",[s.id,initial.token])).rejects.toThrow(/changed/);
 expect((await db.query("select count(*)::integer n from public.grade_submission_versions where submission_id=$1",[s.id])).rows[0]).toEqual({n:1});
});

const changeLock=(id:string,version:number,locked:boolean,reason="",n=6)=>actor(n,"select public.set_grade_lock($1,$2,$3,$4)",[id,version,locked,reason]);
it("locks only reviewed grades and requires reasoned adviser unlock before return",async()=>{
 await assignAdviser();const s=await submitted();
 await expect(changeLock(s.id,1,true)).rejects.toThrow(/Only reviewed/);
 await review(s.id,1,"reviewed","");
 for(const n of [1,2,3,4,5])await expect(changeLock(s.id,2,true,"",n)).rejects.toThrow(/Assigned adviser/);
 await changeLock(s.id,2,true);await expect(review(s.id,3,"returned","Fix")).rejects.toThrow(/not awaiting/);
 const p=await preview(s.period);await expect(actor(1,"select public.resubmit_period_grades($1,3,$2,'Fix')",[s.id,p.token])).rejects.toThrow(/returned/);
 await expect(changeLock(s.id,2,false,"Fix")).rejects.toThrow(/changed/);
 await expect(changeLock(s.id,3,false," ")).rejects.toThrow(/reason/);
 await changeLock(s.id,3,false,"Recheck assessment evidence");
 expect((await db.query("select status,review_version,revision from public.grade_submissions where id=$1",[s.id])).rows[0]).toEqual({status:"reviewed",review_version:4,revision:1});
 await review(s.id,4,"returned","Please correct scores");
 expect((await actor(6,"select action,reason from public.grade_review_events where submission_id=$1 and action='unlocked'",[s.id])).rows[0]).toEqual({action:"unlocked",reason:"Recheck assessment evidence"});
 expect((await db.query("select count(*)::integer n from public.grade_submission_versions where submission_id=$1",[s.id])).rows[0]).toEqual({n:1});
});
it("revoked adviser assignment cannot unlock and locked corrections remain blocked",async()=>{
 await assignAdviser();const s=await submitted();await review(s.id,1,"reviewed","");await changeLock(s.id,2,true);
 await expect(actor(1,"select public.correct_returned_assessment_scores($1,3,$2,'Fix')",[s.a,JSON.stringify([{student_id:student,score:8}])])).rejects.toThrow(/return/);
 await db.exec("update public.classes set adviser_teacher_id=null where id='50000000-0000-4000-8000-000000000001'");
 await expect(changeLock(s.id,3,false,"Recheck")).rejects.toThrow(/Assigned adviser/);
});
it("shows school-wide counts without treating unknown periods as complete and enforces head access",async()=>{
 await assignAdviser();const s=await submitted();await review(s.id,1,"reviewed","");await changeLock(s.id,2,true);
 const result=(await actor(4,"select public.school_grade_completion($1,$2,0,'') report",[school,year])).rows[0].report as {counts:Record<string,number>;total:number;unconfigured_subjects:number;ready:boolean};
 expect(result.counts.locked).toBe(1);expect(result.total).toBe(3);expect(result.unconfigured_subjects).toBe(1);expect(result.ready).toBe(false);
 for(const n of [1,2,3,6])await expect(actor(n,"select public.school_grade_completion($1,$2,0,'')",[school,year])).rejects.toThrow(/School head/);
 await expect(actor(4,"select public.school_grade_completion($1,$2,0,'')",[school,"20000000-0000-4000-8000-000000000099"])).rejects.toThrow(/year not available/);
 const filtered=(await actor(5,"select public.school_grade_completion($1,$2,0,'locked') report",[school,year])).rows[0].report as {filtered_total:number;rows:unknown[];total:number};
 expect(filtered.filtered_total).toBe(1);expect(filtered.rows).toHaveLength(1);expect(filtered.total).toBe(3);
});
it("paginates dashboard rows while retaining full counts and flags classes without offerings",async()=>{
 await db.exec(`insert into public.subjects(id,school_id,code,name) select ('98000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${school}','C'||n,'Subject '||n from generate_series(1,60)n;
 insert into public.subject_offerings(school_id,class_id,subject_id) select '${school}','50000000-0000-4000-8000-000000000001',id from public.subjects where code like 'C%';
 insert into public.classes(school_id,school_year_id,grade_level_id,name) values('${school}','${year}','30000000-0000-4000-8000-000000000001','Empty class');`);
 const first=(await actor(4,"select public.school_grade_completion($1,$2,0,'') report",[school,year])).rows[0].report as {total:number;rows:{offering_id:string}[];empty_classes:number;ready:boolean};
 const second=(await actor(4,"select public.school_grade_completion($1,$2,1,'') report",[school,year])).rows[0].report as typeof first;
 expect(first.total).toBe(62);expect(first.rows).toHaveLength(50);expect(second.rows).toHaveLength(12);expect(first.empty_classes).toBe(1);expect(first.ready).toBe(false);
 expect(new Set([...first.rows,...second.rows].map(r=>r.offering_id)).size).toBe(62);
});

const reportClass="50000000-0000-4000-8000-000000000001";
async function report(n=6,target=student,classId=reportClass){return (await actor(n,"select public.preview_report_card($1,$2) report",[classId,target])).rows[0].report as {ready:boolean;incomplete:number;rows:{offering_id:string;period_id:string|null;grade:number|null;check_status:string}[];student:{id:string}};}
it("previews only locked grades and flags missing periods without calculating an annual average",async()=>{
 await assignAdviser();const s=await submitted();await review(s.id,1,"reviewed","");await changeLock(s.id,2,true);
 const p=await report();expect(p.ready).toBe(false);expect(p.rows.find(r=>r.period_id===s.period)?.grade).toBe(50);expect(p.rows.some(r=>r.check_status==="submission_missing")).toBe(true);
 expect(p).not.toHaveProperty("average");expect(p.student.id).toBe(student);
 await changeLock(s.id,3,false,"Review needed");const unlocked=await report();expect(unlocked.rows.find(r=>r.period_id===s.period)).toMatchObject({grade:null,check_status:"not_locked"});
});
it("recognizes complete zero grades but flags a student absent from a locked snapshot",async()=>{
 await assignAdviser();const s=await submitted();await review(s.id,1,"reviewed","");await changeLock(s.id,2,true);
 const second=(await db.query<{id:string}>("select id from public.grading_periods where scheme_id=$1 and id<>$2",[s.scheme,s.period])).rows[0].id;
 await db.query("insert into public.grade_submissions(offering_id,scheme_id,period_id,snapshot,status) values($1,$2,$3,$4,'locked')",[offering,s.scheme,second,JSON.stringify({students:[{id:student,grade:0}]})]);
 const p=await report();expect(p.ready).toBe(true);expect(p.rows.find(r=>r.period_id===second)?.grade).toBe(0);
 await db.exec(`insert into public.subject_enrollments values('${school}','${offering}','80000000-0000-4000-8000-000000000002')`);
 const missing=await report(6,"80000000-0000-4000-8000-000000000002");expect(missing.ready).toBe(false);expect(missing.rows.every(r=>r.check_status==="grade_missing"&&r.grade===null)).toBe(true);
});
it("flags enrollment exceptions and includes independent subject enrollment without exposing peer grades",async()=>{
 await assignAdviser();const s=await submitted();await review(s.id,1,"reviewed","");await changeLock(s.id,2,true);
 const otherOffering="70000000-0000-4000-8000-000000000002";
 await db.exec(`insert into public.subject_enrollments values('${school}','${otherOffering}','${student}');insert into public.subject_gradebooks values('${otherOffering}','${school}','${s.scheme}');`);
 await db.query("insert into public.grade_submissions(offering_id,scheme_id,period_id,snapshot,status) values($1,$2,$3,$4,'locked')",[otherOffering,s.scheme,s.period,JSON.stringify({students:[{id:student,grade:65},{id:"80000000-0000-4000-8000-000000000007",grade:88}]})]);
 const p=await report();expect(p.rows.find(r=>r.offering_id===otherOffering&&r.period_id===s.period)?.grade).toBe(65);expect(JSON.stringify(p)).not.toContain("80000000-0000-4000-8000-000000000007");expect(JSON.stringify(p)).not.toContain('"grade":88');
 expect((await report(6,"80000000-0000-4000-8000-000000000002")).rows.filter(r=>r.offering_id===offering).every(r=>r.check_status==="enrollment_review"&&r.grade===null)).toBe(true);
});
it("restricts reports to assigned advisers and school heads, including revocation and wrong-class requests",async()=>{
 await assignAdviser();for(const n of [1,2,3])await expect(report(n)).rejects.toThrow(/adviser or school head/);
 expect((await report(4)).student.id).toBe(student);expect((await report(5)).student.id).toBe(student);
 await expect(report(6,"80000000-0000-4000-8000-000000000007")).rejects.toThrow(/not enrolled/);
 await expect(report(6,student,"50000000-0000-4000-8000-000000000002")).rejects.toThrow();
 await db.exec(`delete from public.school_memberships where user_id='${uid(6)}'`);await expect(report()).rejects.toThrow(/adviser or school head/);
 await db.exec("set role anon");try{await expect(db.query("select public.preview_report_card($1,$2)",[reportClass,student])).rejects.toThrow(/permission denied/);}finally{await db.exec("reset role");}
});
