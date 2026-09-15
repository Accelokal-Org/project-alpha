import {beforeAll,afterAll,it,expect} from "vitest";
import type {PGlite} from "@electric-sql/pglite";
import {createTestDatabase} from "./database";
let db:PGlite;
const school="10000000-0000-4000-8000-000000000001",offering="70000000-0000-4000-8000-000000000001";
const uid=(n:number)=>`92000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const sid=(n:number)=>`80000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
async function actor(n:number,sql:string,args:unknown[]=[]){await db.exec(`set role authenticated;set request.jwt.claim.sub='${uid(n)}'`);try{return await db.query<Record<string,unknown>>(sql,args);}finally{await db.exec("reset role;reset request.jwt.claim.sub");}}
async function create(){return (await actor(1,"select public.create_assessment($1,'Quiz','2026-09-15',20) id",[offering])).rows[0].id as string;}
const save=(id:string,version:number,entries:{student_id:string;score:number|null}[],actorId=1)=>actor(actorId,"select public.save_assessment_scores($1,$2,$3::jsonb)",[id,version,JSON.stringify(entries)]);
beforeAll(async()=>{db=await createTestDatabase();await db.exec(`insert into auth.users(id) select ('92000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.school_memberships values('${school}','${uid(1)}','TEACHER'),('${school}','${uid(2)}','TEACHER'),('${school}','${uid(3)}','STUDENT'),('${school}','${uid(4)}','STUDENT'),('${school}','${uid(5)}','SCHOOL_HEAD'),('${school}','${uid(6)}','ADVISER');
update public.teachers set user_id='${uid(1)}' where employee_code='T-001';update public.teachers set user_id='${uid(2)}' where employee_code='T-002';
update public.students set user_id='${uid(3)}' where id='${sid(1)}';update public.students set user_id='${uid(4)}' where id='${sid(2)}';`);});
afterAll(async()=>{await db.close();});
it("keeps drafts private and publishes only each student's own result",async()=>{
 const id=await create();await save(id,1,[{student_id:sid(1),score:0},{student_id:sid(2),score:18.5}]);
 expect((await actor(3,"select * from public.assessments")).rows).toHaveLength(0);
 expect((await actor(3,"select * from public.assessment_scores")).rows).toHaveLength(0);
 expect((await actor(3,"select * from public.my_published_scores() where assessment_id=$1",[id])).rows).toHaveLength(0);
 await actor(1,"select public.publish_assessment($1,2)",[id]);
 const one=(await actor(3,"select * from public.my_published_scores() where assessment_id=$1",[id])).rows;
 const two=(await actor(4,"select * from public.my_published_scores() where assessment_id=$1",[id])).rows;
 expect(one).toHaveLength(1);expect(Number(one[0].score)).toBe(0);expect(Number(two[0].score)).toBe(18.5);
 expect(one[0]).not.toHaveProperty("student_id");
 await expect(save(id,3,[{student_id:sid(1),score:19}])).rejects.toThrow(/read-only/);
 expect((await actor(3,"select * from public.assessment_events")).rows).toHaveLength(0);
});
it("requires subject assignment even for school heads and rejects direct writes",async()=>{
 const id=await create();for(const n of [2,3,5,6]){await expect(actor(n,"select public.create_assessment($1,'Bad','2026-09-15',10)",[offering])).rejects.toThrow(/Assigned teacher/);await expect(save(id,1,[],n)).rejects.toThrow(/Assigned teacher/);await expect(actor(n,"select public.publish_assessment($1,1)",[id])).rejects.toThrow(/Assigned teacher/);}
 expect((await actor(2,"select * from public.assessments where id=$1",[id])).rows).toHaveLength(0);
 await expect(actor(1,"update public.assessment_scores set score=0")).rejects.toThrow(/permission denied/);
 await db.exec("set role anon");try{await expect(db.query("select * from public.my_published_scores()")).rejects.toThrow(/permission denied/);}finally{await db.exec("reset role");}
});
it("rolls back invalid batches, rejects unenrolled students and prevents stale writes",async()=>{
 const id=await create();await expect(save(id,1,[{student_id:sid(1),score:10},{student_id:sid(2),score:21}])).rejects.toThrow(/out of range/);
 expect((await db.query("select * from public.assessment_scores where assessment_id=$1",[id])).rows).toHaveLength(0);
 await expect(save(id,1,[{student_id:sid(7),score:10}])).rejects.toThrow(/not enrolled/);
 await expect(save(id,1,[{student_id:sid(1),score:1.001}])).rejects.toThrow(/out of range/);
 await expect(save(id,1,[{student_id:sid(1),score:1},{student_id:sid(1),score:2}])).rejects.toThrow(/Duplicate/);
 await save(id,1,[{student_id:sid(1),score:10}]);
 await expect(save(id,1,[{student_id:sid(1),score:15}])).rejects.toThrow(/changed/);
 await expect(actor(1,"select public.publish_assessment($1,1)",[id])).rejects.toThrow(/changed/);
 await save(id,2,[{student_id:sid(1),score:null}]);
 await expect(actor(1,"select public.publish_assessment($1,3)",[id])).rejects.toThrow(/at least one/);
});
it("revocation takes effect and a mixed student role still gets an own-only projection",async()=>{
 const id=await create();await save(id,1,[{student_id:sid(1),score:12},{student_id:sid(2),score:10}]);await actor(1,"select public.publish_assessment($1,2)",[id]);
 await db.exec(`insert into public.school_memberships values('${school}','${uid(3)}','SCHOOL_HEAD')`);
 try{expect((await actor(3,"select * from public.my_published_scores() where assessment_id=$1",[id])).rows).toHaveLength(1);}finally{await db.exec(`delete from public.school_memberships where user_id='${uid(3)}' and role='SCHOOL_HEAD'`);}
 await db.exec(`delete from public.school_memberships where user_id='${uid(1)}'`);
 try{await expect(create()).rejects.toThrow(/Assigned teacher/);}finally{await db.exec(`insert into public.school_memberships values('${school}','${uid(1)}','TEACHER')`);}
});
