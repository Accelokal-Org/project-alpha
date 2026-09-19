import {it,expect} from "vitest";
import {createTestDatabase} from "./database";
const school="10000000-0000-4000-8000-000000000001",head="97000000-0000-4000-8000-000000000001",user="97000000-0000-4000-8000-000000000002",other="97000000-0000-4000-8000-000000000003";
const entry=(username="teacher.one",email="one@gmail.com",role="TEACHER")=>({username,email,role,first_name:"First",last_name:"Last"});
it("imports mixed roles atomically, claims each delivery once, and restricts final linking to the trusted server",async()=>{
 const db=await createTestDatabase();try{
 await db.exec(`insert into auth.users values('${head}','head@school.test'),('${other}','other@school.test');insert into school_memberships(school_id,user_id,role) values('${school}','${head}','SCHOOL_HEAD');set role authenticated;set request.jwt.claim.sub='${head}';`);
 const prepare=(entries:unknown)=>db.query('select prepare_school_accounts($1,$2::jsonb)',[school,JSON.stringify(entries)]);
 await expect(prepare([entry(),entry()])).rejects.toThrow(/already exists/);
 expect((await db.query('select * from school_account_imports')).rows).toHaveLength(0);
 expect((await db.query("select * from teachers where employee_code='teacher.one'")).rows).toHaveLength(0);
 await expect(prepare([entry('bad.role','bad@gmail.com','SCHOOL_HEAD')])).rejects.toThrow(/Choose/);
 await expect(prepare([entry('bad.role','bad@gmail.com','APP_MANAGER')])).rejects.toThrow(/Choose/);
 await prepare([entry(),entry('student.one','two@gmail.com','STUDENT')]);
 const {rows}=await db.query<{id:string;email:string}>('select id,email from school_account_imports order by email');const id=rows[0].id;
 await expect(db.exec("update school_account_imports set status='sent'")).rejects.toThrow(/permission denied/);
 await db.query('select claim_school_invitation($1)',[id]);
 await expect(db.query('select claim_school_invitation($1)',[id])).rejects.toThrow(/already processed/);
 await expect(db.query("select finish_school_invitation($1,$2,'sent',$3)",[id,head,user])).rejects.toThrow(/permission denied/);
 await db.exec(`reset role;insert into auth.users values('${user}','one@gmail.com');set role service_role;`);
 await expect(db.query("select finish_school_invitation($1,$2,'sent',$3)",[id,head,other])).rejects.toThrow(/mismatch/);
 await db.query("select finish_school_invitation($1,$2,'sent',$3)",[id,head,user]);
 await db.exec(`reset role;set role authenticated;`);
 expect((await db.query("select role from school_memberships where user_id=$1",[user])).rows).toEqual([{role:"TEACHER"}]);
 expect((await db.query("select user_id from teachers where employee_code='teacher.one'")).rows).toEqual([{user_id:user}]);
 expect((await db.query("select status from school_account_imports where id=$1",[id])).rows).toEqual([{status:"sent"}]);
 await db.exec(`set request.jwt.claim.sub='${other}';`);
 expect((await db.query('select * from school_account_imports')).rows).toHaveLength(0);
 await expect(prepare([entry('new.user','new@gmail.com')])).rejects.toThrow(/access required/);
 await expect(db.query('select claim_school_invitation($1)',[rows[1].id])).rejects.toThrow(/access required/);
 await db.exec('set role anon');await expect(db.query('select claim_school_invitation($1)',[id])).rejects.toThrow(/permission denied/);
 }finally{await db.close();}
});
it("blocks cross-school imports, existing logins and stale authority; retries only explicitly marked rate limits",async()=>{
 const db=await createTestDatabase();try{
 await db.exec(`insert into auth.users values('${head}','head@school.test');insert into school_memberships(school_id,user_id,role) values('${school}','${head}','SCHOOL_HEAD');set role authenticated;set request.jwt.claim.sub='${head}';`);
 await expect(db.query('select prepare_school_accounts($1,$2::jsonb)',["10000000-0000-4000-8000-999999999999",JSON.stringify([entry()])])).rejects.toThrow(/access required/);
 await expect(db.query('select prepare_school_accounts($1,$2::jsonb)',[school,JSON.stringify([entry('existing','head@school.test')])])).rejects.toThrow(/already exists/);
 await db.query('select prepare_school_accounts($1,$2::jsonb)',[school,JSON.stringify([entry()])]);
 const id=(await db.query<{id:string}>('select id from school_account_imports')).rows[0].id;
 await db.query('select claim_school_invitation($1)',[id]);await db.exec('set role service_role');await db.query("select finish_school_invitation($1,$2,'retry')",[id,head]);await db.exec('set role authenticated');await db.query('select claim_school_invitation($1)',[id]);
 await db.exec(`reset role;delete from school_memberships where user_id='${head}';set role service_role;`);
 await expect(db.query("select finish_school_invitation($1,$2,'review')",[id,head])).rejects.toThrow(/revoked/);
 await db.exec(`reset role;insert into school_memberships(school_id,user_id,role) values('${school}','${head}','SCHOOL_HEAD');set role service_role;`);await db.query("select finish_school_invitation($1,$2,'retry')",[id,head]);
 await db.exec(`reset role;insert into auth.users values('${user}','one@gmail.com');set role authenticated;`);
 const review=await db.query<{claim_school_invitation:{review:boolean}}>('select claim_school_invitation($1)',[id]);expect(review.rows[0].claim_school_invitation.review).toBe(true);
 await expect(db.query('select claim_school_invitation($1)',[id])).rejects.toThrow(/already processed/);
 }finally{await db.close();}
});
