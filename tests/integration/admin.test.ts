import {beforeAll,afterAll,describe,it,expect} from "vitest";
import type {PGlite} from "@electric-sql/pglite";
import {createTestDatabase} from "./database";
let db:PGlite;
const admin="91000000-0000-4000-8000-000000000001",student="91000000-0000-4000-8000-000000000002",teacher="91000000-0000-4000-8000-000000000003";
const seedSchool="10000000-0000-4000-8000-000000000001";
async function actor<T>(uid:string,run:()=>Promise<T>):Promise<T> {
 await db.exec(`set role authenticated; set request.jwt.claim.sub='${uid}'`);
 try{return await run();}finally{await db.exec("reset role; reset request.jwt.claim.sub");}
}
async function setup(operation:string,payload:Record<string,unknown>,uid=admin) {
 return actor(uid,async()=>{
  const r=await db.query<{result:{id:string;school_id:string}}>("select public.admin_setup($1,$2::jsonb) as result",[operation,JSON.stringify(payload)]);
  return r.rows[0].result;
 });
}
beforeAll(async()=>{
 db=await createTestDatabase();
 await db.exec(`insert into auth.users(id,email) values('${admin}','owner@example.test'),('${student}','student@example.test'),('${teacher}','teacher@example.test');
 insert into public.platform_admins(user_id) values('${admin}');
 insert into public.school_memberships values('${seedSchool}','${student}','STUDENT'),('${seedSchool}','${teacher}','TEACHER');`);
});
afterAll(async()=>{await db.close();});
describe("superadmin setup",()=>{
 it("can create a first school without an existing school membership",async()=>{
  const result=await setup("create_school",{name:"New school",timezone:"Asia/Manila"});
  const schools=await actor(admin,()=>db.query("select * from public.schools where id=$1",[result.school_id]));
  expect(schools.rows).toHaveLength(1);
  const roles=await db.query("select * from public.school_memberships where user_id=$1",[admin]);
  expect(roles.rows).toHaveLength(0);
 });

 it("denies teachers and students direct access to the setup RPC",async()=>{
  for(const uid of [student,teacher]) await expect(setup("create_school",{name:"Unauthorized",timezone:"UTC"},uid)).rejects.toThrow(/App manager/);
 });
 it("denies anonymous RPC calls and privilege escalation",async()=>{
  await db.exec("set role anon");
  try{await expect(db.query("select public.admin_setup('create_school','{}')")).rejects.toThrow(/permission denied/);}finally{await db.exec("reset role");}
  await expect(actor(student,()=>db.query("insert into public.platform_admins(user_id) values($1)",[student]))).rejects.toThrow(/permission denied/);
 });
 it("keeps direct table writes disabled even for the admin JWT",async()=>{
  await expect(actor(admin,()=>db.query("insert into public.schools(name) values('Bypass')"))).rejects.toThrow(/permission denied/);
 });
 it("records previous/new values and actor when editing school details",async()=>{
  const {school_id}=await setup("create_school",{name:"Original",timezone:"UTC"});
  await setup("update_school",{school_id,name:"Renamed",timezone:"Asia/Manila"});
  const {rows}=await actor(admin,()=>db.query<{actor_id:string;before_value:{name:string};after_value:{name:string}}>("select actor_id,before_value,after_value from public.admin_audit_log where school_id=$1 and action='update_school'",[school_id]));
  expect(rows[0].actor_id).toBe(admin);expect(rows[0].before_value.name).toBe("Original");expect(rows[0].after_value.name).toBe("Renamed");
 });
 it("rejects invalid timezone and blank names at the database boundary",async()=>{
  await expect(setup("create_school",{name:"Bad",timezone:"Not/AZone"})).rejects.toThrow(/timezone/);
  await expect(setup("create_school",{name:"   ",timezone:"UTC"})).rejects.toThrow(/Invalid name/);
 });
 it("supports manual setup through all core relationships",async()=>{
  const {school_id}=await setup("create_school",{name:"Manual setup",timezone:"UTC"});
  const year=await setup("create_year",{school_id,name:"Year 1",starts_on:"2026-01-01",ends_on:"2026-12-31",is_active:true});
  const grade=await setup("create_grade",{school_id,name:"Level 1"});
  const t=await setup("create_teacher",{school_id,name:"Teacher Test",code:"T1"});
  const s=await setup("create_student",{school_id,name:"Student Test",code:"S1"});
  const c=await setup("create_class",{school_id,name:"Class One",year_id:year.id,grade_id:grade.id});
  const sub=await setup("create_subject",{school_id,name:"Subject One",code:"SUB"});
  const offer=await setup("create_offering",{school_id,class_id:c.id,subject_id:sub.id});
  await setup("assign_teacher",{school_id,offering_id:offer.id,teacher_id:t.id});
  await setup("assign_adviser",{school_id,class_id:c.id,teacher_id:t.id});
  await setup("enroll_class",{school_id,class_id:c.id,student_id:s.id});
  await setup("enroll_subject",{school_id,offering_id:offer.id,student_id:s.id});
  await setup("enroll_class_subject",{school_id,class_id:c.id,offering_id:offer.id});
  expect((await db.query("select * from public.subject_enrollments where offering_id=$1",[offer.id])).rows).toHaveLength(1);
  await setup("link_account",{school_id,email:"teacher@example.test",role:"TEACHER",profile_id:t.id});
  await setup("link_account",{school_id,email:"teacher@example.test",role:"ADVISER",profile_id:t.id});
  await setup("link_account",{school_id,email:"student@example.test",role:"STUDENT",profile_id:s.id});
  const teacherRoster=await actor(teacher,()=>db.query("select * from public.students where school_id=$1",[school_id]));
  expect(teacherRoster.rows).toHaveLength(1);
  const own=await actor(student,()=>db.query("select * from public.students where school_id=$1",[school_id]));
  expect(own.rows).toHaveLength(1);
 });
 it("rejects cross-school references and leaves no audit entry for failed changes",async()=>{
  const {school_id}=await setup("create_school",{name:"Foreign reference",timezone:"UTC"});
  await expect(setup("create_class",{school_id,name:"Wrong school",year_id:"20000000-0000-4000-8000-000000000001",grade_id:"30000000-0000-4000-8000-000000000001"})).rejects.toThrow(/foreign key/);
  expect((await db.query("select * from public.classes where school_id=$1",[school_id])).rows).toHaveLength(0);
  expect((await db.query("select * from public.admin_audit_log where school_id=$1 and action='create_class'",[school_id])).rows).toHaveLength(0);
 });
 it("cannot grant APP_MANAGER through school account linking",async()=>{
  await expect(setup("link_account",{school_id:seedSchool,email:"student@example.test",role:"APP_MANAGER",profile_id:""})).rejects.toThrow(/Platform access/);
 });
 it("does not silently replace a linked profile's account",async()=>{
  const t=await setup("create_teacher",{school_id:seedSchool,name:"Linked teacher",code:"T-linked"});
  await setup("link_account",{school_id:seedSchool,email:"teacher@example.test",role:"TEACHER",profile_id:t.id});
  await expect(setup("link_account",{school_id:seedSchool,email:"student@example.test",role:"TEACHER",profile_id:t.id})).rejects.toThrow(/already linked/);
 });
 it("restricts the account directory and audit log to admins",async()=>{
  await expect(actor(student,()=>db.query("select * from public.admin_accounts($1)",[seedSchool]))).rejects.toThrow(/App manager/);
  expect((await actor(student,()=>db.query("select * from public.admin_audit_log"))).rows).toHaveLength(0);
  await expect(actor(admin,()=>db.query("delete from public.admin_audit_log"))).rejects.toThrow(/permission denied/);
 });

 it("rejects retired sample-school creation",async()=>{
  await expect(setup("create_test_school",{school_id:seedSchool,name:"Retired",timezone:"UTC"})).rejects.toThrow(/Unknown operation/);
 });
 it("rejects unknown operations",async()=>{
  await expect(setup("run_sql",{school_id:seedSchool,sql:"drop table public.students"})).rejects.toThrow(/Unknown operation/);
 });
 it("revoking platform access immediately blocks subsequent calls",async()=>{
  await db.query("delete from public.platform_admins where user_id=$1",[admin]);
  try{await expect(setup("create_school",{name:"Revoked",timezone:"UTC"})).rejects.toThrow(/App manager/);}finally{await db.query("insert into public.platform_admins(user_id) values($1)",[admin]);}
 });
});
