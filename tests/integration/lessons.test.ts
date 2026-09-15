import {beforeAll,afterAll,it,expect} from "vitest";
import {readFile} from "node:fs/promises";
import type {PGlite} from "@electric-sql/pglite";
import {createTestDatabase} from "./database";
let db:PGlite;
const school="10000000-0000-4000-8000-000000000001",offering="70000000-0000-4000-8000-000000000001";
const uid=(n:number)=>`94000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
async function actor(n:number,sql:string,args:unknown[]=[]){await db.exec(`set role authenticated;set request.jwt.claim.sub='${uid(n)}'`);try{return await db.query<Record<string,unknown>>(sql,args);}finally{await db.exec("reset role;reset request.jwt.claim.sub");}}
async function save({target=null,version=0,template=false,date="2099-01-01",n=1,title="Lesson",subject=offering}:{target?:string|null;version?:number;template?:boolean;date?:string|null;n?:number;title?:string;subject?:string}={}){
 return (await actor(n,"select public.save_lesson_plan($1,$2,$3,$4,'Objectives','Activities','Resources',$5,$6) id",[subject,target,version,title,date,template])).rows[0].id as string;
}
beforeAll(async()=>{db=await createTestDatabase();await db.exec(`insert into auth.users(id) select ('94000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;
insert into public.school_memberships values('${school}','${uid(1)}','TEACHER'),('${school}','${uid(2)}','TEACHER'),('${school}','${uid(3)}','STUDENT'),('${school}','${uid(4)}','SCHOOL_HEAD');
insert into public.platform_admins(user_id) values('${uid(5)}');
update public.teachers set user_id='${uid(1)}' where employee_code='T-001';update public.teachers set user_id='${uid(2)}' where employee_code='T-002';`);});
afterAll(async()=>{await db.close();});
it("saves plans and edits atomically with history and stale-write protection",async()=>{
 const id=await save();await save({target:id,version:1,title:"Updated"});
 await expect(save({target:id,version:1,title:"Stale"})).rejects.toThrow(/changed/);
 const events=(await actor(1,"select * from public.lesson_plan_events where plan_id=$1 order by created_at",[id])).rows;
 expect(events).toHaveLength(2);expect(events[0].before_value).toBeNull();expect(events[1].before_value).toMatchObject({title:"Lesson",version:1});expect(events[1].after_value).toMatchObject({title:"Updated",version:2});
 await expect(save({target:id,version:2,title:" "})).rejects.toThrow();
 expect((await actor(1,"select title,version from public.lesson_plans where id=$1",[id])).rows[0]).toEqual({title:"Updated",version:2});
});
it("keeps templates undated and copies independent of their source",async()=>{
 const source=await save({template:true,date:null,title:"Template"});
 const copy=await save({title:"Template"});await save({target:copy,version:1,title:"Adapted lesson"});
 expect((await actor(1,"select title,lesson_date from public.lesson_plans where id=$1",[source])).rows[0]).toEqual({title:"Template",lesson_date:null});
 await expect(save({template:true})).rejects.toThrow();await expect(save({date:null})).rejects.toThrow();
});
it("denies students, unassigned teachers, heads and platform admins writes; staff reads remain scoped",async()=>{
 const id=await save();
 for(const n of [2,3,4,5]){await expect(save({n})).rejects.toThrow(/Assigned teacher/);await expect(save({n,target:id,version:1})).rejects.toThrow(/Assigned teacher/);}
 for(const n of [2,3]){
  expect((await actor(n,"select * from public.lesson_plans")).rows).toHaveLength(0);
  expect((await actor(n,"select * from public.lesson_plan_events")).rows).toHaveLength(0);
 }
 expect((await actor(4,"select * from public.lesson_plans where id=$1",[id])).rows).toHaveLength(1);
 await expect(actor(1,"update public.lesson_plans set title='Bypass'")).rejects.toThrow(/permission denied/);
 await db.exec("set role anon");try{await expect(db.query("select * from public.my_upcoming_lessons()")).rejects.toThrow(/permission denied/);}finally{await db.exec("reset role");}
});
it("upcoming lessons exclude templates and past dates and use current teaching authority",async()=>{
 const future=await save(),past=await save({date:"2000-01-01"}),template=await save({template:true,date:null});
 const ids=(await actor(1,"select id from public.my_upcoming_lessons()")).rows.map(p=>p.id);
 expect(ids).toContain(future);expect(ids).not.toContain(past);expect(ids).not.toContain(template);
 for(const n of [2,3,4,5])expect((await actor(n,"select * from public.my_upcoming_lessons()")).rows).toHaveLength(0);
 await db.exec(`delete from public.school_memberships where user_id='${uid(1)}'`);
 try{await expect(save()).rejects.toThrow(/Assigned teacher/);expect((await actor(1,"select * from public.my_upcoming_lessons()")).rows).toHaveLength(0);}finally{await db.exec(`insert into public.school_memberships values('${school}','${uid(1)}','TEACHER')`);}
});
it("rejects cross-offering updates and cross-school creates",async()=>{
 const id=await save();
 await expect(save({target:id,version:1,subject:"70000000-0000-4000-8000-000000000004"})).rejects.toThrow();
 await expect(save({subject:"70000000-0000-4000-8000-000000000004"})).rejects.toThrow(/Assigned teacher/);
});
it("attendance installs without assessments and its repair is repeatable",async()=>{
 const independent=await createTestDatabase(false,["202609150001_assessments.sql","202609150004_grading_setup.sql","202609150005_grade_submission.sql"]);
 try{
  const repair=await readFile(new URL("../../supabase/repairs/attendance_helper.sql",import.meta.url),"utf8");
  await independent.exec(repair);await independent.exec(repair);
  await independent.exec(await readFile(new URL("../../supabase/migrations/202609150001_assessments.sql",import.meta.url),"utf8"));
  expect((await independent.query("select public.can_manage_attendance($1) allowed",[offering])).rows[0]).toEqual({allowed:false});
 }finally{await independent.close();}
});
