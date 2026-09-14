import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createTestDatabase } from "./database";
it("removes sample tenants and proven sample logins while preserving real records and platform access", async () => {
 const db = await createTestDatabase(true);
 try {
  const admin = "91000000-0000-4000-8000-000000000091";
  const sample = "91000000-0000-4000-8000-000000000092";
  const shared = "91000000-0000-4000-8000-000000000093";
  const legacy = "91000000-0000-4000-8000-000000000094";
  await db.exec(`insert into auth.users values ('${admin}','owner@example.test'),('${sample}','generated@example.test'),('${shared}','shared@example.test'),('${legacy}','manager@example.test');
   insert into public.platform_admins(user_id) values ('${admin}');
   insert into public.school_memberships values ('10000000-0000-4000-8000-000000000001','${legacy}','APP_MANAGER');
   set request.jwt.claim.sub='${admin}';`);
  const school = async (op: string) => (await db.query<{result:{school_id:string}}>("select public.admin_setup($1,$2) result", [op, JSON.stringify({name:"School",timezone:"UTC"})])).rows[0].result.school_id;
  const real = await school("create_school");
  const fake = await school("create_test_school");
  await db.query("select public.admin_record_test_account($1,$2)",[fake,sample]);
  await db.query("select public.admin_record_test_account($1,$2)",[fake,shared]);
  await db.query("insert into public.school_memberships values($1,$2,'TEACHER')",[real,shared]);
  await db.exec(await readFile(new URL("../../supabase/migrations/202609140003_remove_sample_data.sql", import.meta.url),"utf8"));
  expect((await db.query("select id from public.schools")).rows).toEqual([{id:real}]);
  expect((await db.query("select * from auth.users where id=$1",[sample])).rows).toHaveLength(0);
  expect((await db.query("select * from auth.users")).rows).toHaveLength(3);
  expect((await db.query("select user_id from public.platform_admins where user_id=$1",[legacy])).rows).toHaveLength(1);
  expect((await db.query("select * from public.school_memberships where school_id=$1",[real])).rows).toHaveLength(1);
  expect((await db.query("select * from public.students")).rows).toHaveLength(0);
  expect((await db.query("select * from public.admin_audit_log where school_id=$1",[real])).rows).toHaveLength(1);
  await expect(db.query("select public.admin_record_test_account($1,$2)",[real,shared])).rejects.toThrow(/does not exist/);
 } finally { await db.close(); }
});
