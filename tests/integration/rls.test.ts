import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "./database";
let db: PGlite;
const school = "10000000-0000-4000-8000-000000000001";
const secondSchool = "10000000-0000-4000-8000-000000000002";
const uid = (n:number) => `90000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const sid = (n:number) => `80000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const oid = (n:number) => `70000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
async function asUser<T>(n:number, sql:string) {
 await db.exec(`set role authenticated; set request.jwt.claim.sub = '${uid(n)}'`);
 try { return (await db.query<T>(sql)).rows; } finally { await db.exec("reset role; reset request.jwt.claim.sub"); }
}
beforeAll(async () => {
 db = await createTestDatabase();
 await db.exec(`insert into auth.users(id) select ('90000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,8) n;
 insert into public.school_memberships values
 ('${school}','${uid(1)}','TEACHER'), ('${school}','${uid(2)}','TEACHER'),
 ('${school}','${uid(3)}','STUDENT'), ('${school}','${uid(4)}','STUDENT'),
 ('${school}','${uid(5)}','SCHOOL_HEAD'), ('${school}','${uid(6)}','APP_MANAGER'),
 ('${school}','${uid(7)}','ADVISER');
 update public.teachers set user_id='${uid(1)}' where employee_code='T-001';
 update public.teachers set user_id='${uid(2)}' where employee_code='T-002';
 update public.students set user_id='${uid(3)}' where id='${sid(1)}';
 update public.students set user_id='${uid(4)}' where id='${sid(2)}';
 insert into public.teachers(id,school_id,user_id,employee_code,display_name) values
 ('40000000-0000-4000-8000-000000000003','${school}','${uid(7)}','T-003','Adviser Fixture');
 update public.classes set adviser_teacher_id='40000000-0000-4000-8000-000000000003' where id='50000000-0000-4000-8000-000000000001';
 insert into public.schools(id,name) values ('${secondSchool}','Other school');
 insert into public.students(id,school_id,student_code,display_name) values ('${sid(99)}','${secondSchool}','OTHER-001','Other school student');`);
});
afterAll(async () => { await db?.close(); });
describe("PostgreSQL row-level security", () => {
 it("limits a teacher to students enrolled in assigned subjects", async () => {
  const rows = await asUser<{id:string}>(1,"select id from public.students");
  expect(rows).toHaveLength(6); expect(rows.some(r => r.id === sid(7))).toBe(false);
  expect(await asUser(1,`select * from public.subject_offerings where id='${oid(2)}'`)).toHaveLength(0);
 });
 it("isolates each student's own profile and enrollment", async () => {
  expect(await asUser(3,"select id from public.students")).toEqual([{id:sid(1)}]);
  expect(await asUser(3,`select * from public.students where id='${sid(2)}'`)).toHaveLength(0);
  expect(await asUser(3,"select * from public.class_enrollments")).toHaveLength(1);
  expect(await asUser(3,"select * from public.subject_enrollments")).toHaveLength(1);
  expect(await asUser(3,"select * from public.teacher_assignments")).toHaveLength(0);
 });
 it("limits advisers to their class, including students not in a subject", async () => {
  expect(await asUser(7,"select * from public.students")).toHaveLength(6);
  expect(await asUser(7,"select * from public.class_enrollments")).toHaveLength(6);
  expect(await asUser(7,`select * from public.students where id='${sid(7)}'`)).toHaveLength(0);
 });
 it("limits school heads to their school and preserves manager access", async () => {
  expect(await asUser(5,"select * from public.students")).toHaveLength(12);
  expect(await asUser(5,`select * from public.schools where id='${secondSchool}'`)).toHaveLength(0);
  expect(await asUser(6,"select * from public.students")).toHaveLength(13);
 });
 it("denies users with no school memberships", async () => {
  expect(await asUser(8,"select * from public.students")).toHaveLength(0);
  expect(await asUser(8,"select * from public.schools")).toHaveLength(0);
 });
 it("denies anonymous queries", async () => {
  await db.exec("set role anon");
  try { await expect(db.query("select * from public.students")).rejects.toThrow(/permission denied/); }
  finally { await db.exec("reset role"); }
 });
 it("prevents self-promotion and direct roster changes", async () => {
  await expect(asUser(3,`insert into public.school_memberships values('${school}','${uid(3)}','SCHOOL_HEAD')`)).rejects.toThrow(/permission denied/);
  await expect(asUser(1,`update public.students set display_name='Changed' where id='${sid(1)}'`)).rejects.toThrow(/permission denied/);
 });
 it("enforces tenant integrity with composite foreign keys", async () => {
  await expect(db.exec(`insert into public.subject_enrollments values ('${school}','${oid(1)}','${sid(99)}')`)).rejects.toThrow(/foreign key/);
 });
 it("honors individual subject exceptions independently of class membership", async () => {
  await db.exec(`delete from public.subject_enrollments where student_id='${sid(6)}'`);
  try {
   expect(await asUser(1,`select * from public.students where id='${sid(6)}'`)).toHaveLength(0);
   expect(await asUser(7,`select * from public.students where id='${sid(6)}'`)).toHaveLength(1);
  } finally { await db.exec(`insert into public.subject_enrollments values('${school}','${oid(1)}','${sid(6)}')`); }
 });
 it("does not turn student enrollment into staff access for dual-role accounts", async () => {
  await db.exec(`insert into public.school_memberships values('${school}','${uid(3)}','TEACHER')`);
  try { expect(await asUser(3,"select * from public.staff_offerings()")).toHaveLength(0); }
  finally { await db.exec(`delete from public.school_memberships where user_id='${uid(3)}' and role='TEACHER'`); }
 });
 it("revokes assignment access immediately when a membership is removed", async () => {
  await db.exec(`delete from public.school_memberships where user_id='${uid(1)}'`);
  try { expect(await asUser(1,"select * from public.students")).toHaveLength(0); }
  finally { await db.exec(`insert into public.school_memberships values('${school}','${uid(1)}','TEACHER')`); }
 });
});
