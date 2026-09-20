import {it,expect} from "vitest";
import {createTestDatabase} from "./database";
const admin="98000000-0000-4000-8000-000000000001",head="98000000-0000-4000-8000-000000000002",request="98000000-0000-4000-8000-000000000003",second="98000000-0000-4000-8000-000000000004";
it("creates one school across retries and links only the matching invited head",async()=>{
 const db=await createTestDatabase();try{
 await db.exec(`insert into auth.users values('${admin}','admin@school.test');insert into platform_admins(user_id) values('${admin}');set role authenticated;set request.jwt.claim.sub='${admin}';`);
 const prepare=(id=request,name="Onboarding School")=>db.query<{prepare_school_onboarding:{id:string;school_id:string}}>('select prepare_school_onboarding($1,$2,$3,$4,$5)',[id,name," HEAD@school.test ","First","Last"]);
 const saved=(await prepare()).rows[0].prepare_school_onboarding;
 expect((await prepare()).rows[0].prepare_school_onboarding.school_id).toBe(saved.school_id);
 expect((await prepare(second,"onboarding school")).rows[0].prepare_school_onboarding.id).toBe(request);
 await expect(prepare(request,"Different school")).rejects.toThrow(/already saved/);
 expect((await db.query("select name,timezone from schools where id=$1",[saved.school_id])).rows).toEqual([{name:"Onboarding School",timezone:"Asia/Manila"}]);
 expect((await db.query('select * from school_onboarding')).rows).toHaveLength(1);
 const claim=()=>db.query<{claim_school_onboarding:{status:string}}>('select claim_school_onboarding($1)',[request]);
 expect((await claim()).rows[0].claim_school_onboarding.status).toBe('claimed');
 expect((await claim()).rows[0].claim_school_onboarding.status).toBe('processing');
 await expect(db.query("select finish_school_onboarding($1,'invited',$2)",[request,admin])).rejects.toThrow(/Account not found/);
 await db.exec(`reset role;insert into auth.users values('${head}','head@school.test');set role authenticated;`);
 await db.query("select finish_school_onboarding($1,'invited',$2)",[request,head]);
 expect((await claim()).rows[0].claim_school_onboarding.status).toBe('invited');
 expect((await db.query('select role from school_memberships where school_id=$1 and user_id=$2',[saved.school_id,head])).rows).toEqual([{role:'SCHOOL_HEAD'}]);
 await expect(db.query("select finish_school_onboarding($1,'invited',$2)",[request,head])).rejects.toThrow(/No active/);
 await expect(db.exec("update school_onboarding set status='pending'")).rejects.toThrow(/permission denied/);
 }finally{await db.close();}
});
it("links an existing account without an email claim and preserves its other roles",async()=>{
 const db=await createTestDatabase();try{
 await db.exec(`insert into auth.users values('${admin}','admin@school.test'),('${head}','head@school.test');insert into platform_admins(user_id) values('${admin}');insert into school_memberships(school_id,user_id,role) values('10000000-0000-4000-8000-000000000001','${head}','TEACHER');set role authenticated;set request.jwt.claim.sub='${admin}';`);
 const saved=await db.query<{prepare_school_onboarding:{school_id:string}}>('select prepare_school_onboarding($1,$2,$3,$4,$5)',[request,'New school','head@school.test','First','Last']);
 const claim=await db.query<{claim_school_onboarding:{status:string}}>('select claim_school_onboarding($1)',[request]);expect(claim.rows[0].claim_school_onboarding.status).toBe('linked');
 expect((await db.query<{role:string}>('select role from school_memberships where user_id=$1 order by role',[head])).rows.map(r=>r.role)).toEqual(['SCHOOL_HEAD','TEACHER']);
 expect((await db.query('select * from teachers where school_id=$1',[saved.rows[0].prepare_school_onboarding.school_id])).rows).toHaveLength(0);
 await db.exec(`set request.jwt.claim.sub='${head}';`);
 expect((await db.query('select * from school_onboarding')).rows).toHaveLength(0);
 await expect(db.query('select claim_school_onboarding($1)',[request])).rejects.toThrow(/Superadmin/);
 await expect(db.query('select prepare_school_onboarding($1,$2,$3,$4,$5)',[second,'Denied','new@school.test','First','Last'])).rejects.toThrow(/Superadmin/);
 }finally{await db.close();}
});
it("permits rate-limit retries but denies uncertain retries and revoked managers",async()=>{
 const db=await createTestDatabase();try{
 await db.exec(`insert into auth.users values('${admin}','admin@school.test');insert into platform_admins(user_id) values('${admin}');set role authenticated;set request.jwt.claim.sub='${admin}';`);
 await expect(db.query('select prepare_school_onboarding($1,$2,$3,$4,$5)',[request,'School','bad-email','First','Last'])).rejects.toThrow(/Check school/);
 expect((await db.query('select * from school_onboarding')).rows).toHaveLength(0);
 await db.query('select prepare_school_onboarding($1,$2,$3,$4,$5)',[request,'School','head@school.test','First','Last']);
 await db.query('select claim_school_onboarding($1)',[request]);
 await db.query("select finish_school_onboarding($1,'retry')",[request]);
 expect((await db.query<{claim_school_onboarding:{status:string}}>('select claim_school_onboarding($1)',[request])).rows[0].claim_school_onboarding.status).toBe('claimed');
 await db.exec(`reset role;delete from platform_admins where user_id='${admin}';set role authenticated;`);
 await expect(db.query("select finish_school_onboarding($1,'review')",[request])).rejects.toThrow(/Superadmin/);
 await db.exec(`reset role;insert into platform_admins(user_id) values('${admin}');set role authenticated;`);
 await db.query("select finish_school_onboarding($1,'review')",[request]);
 expect((await db.query<{claim_school_onboarding:{status:string}}>('select claim_school_onboarding($1)',[request])).rows[0].claim_school_onboarding.status).toBe('review');
 await db.exec('set role anon');await expect(db.query('select claim_school_onboarding($1)',[request])).rejects.toThrow(/permission denied/);
 }finally{await db.close();}
});
