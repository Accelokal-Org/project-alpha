import { it,expect } from "vitest";
import {createTestDatabase} from "./database";
it("validates invitation access and assigns multiple roles atomically under manager authority",async()=>{
 const db=await createTestDatabase();const school="10000000-0000-4000-8000-000000000001",profile="40000000-0000-4000-8000-000000000001",admin="91000000-0000-4000-8000-000000000071",user="91000000-0000-4000-8000-000000000072";
 const call=(roles:string[],pid:string|null,uid:string|null)=>db.query("select public.admin_invite_access($1,$2,array(select jsonb_array_elements_text($3::jsonb))::public.school_role[],$4,$5)",[school,"new@example.test",JSON.stringify(roles),pid,uid]);
 try {
 await db.exec(`insert into auth.users values('${admin}','admin@example.test');insert into public.platform_admins(user_id) values('${admin}');set role authenticated;set request.jwt.claim.sub='${admin}';`);
 await call(["TEACHER","ADVISER","SCHOOL_HEAD"],profile,null);
 await expect(call(["APP_MANAGER"],null,null)).rejects.toThrow(/school roles/);
 await expect(call(["TEACHER"],"40000000-0000-4000-8000-999999999999",null)).rejects.toThrow(/profile not found/);
 await expect(call(["STUDENT","TEACHER"],profile,null)).rejects.toThrow(/separately/);
 await db.exec(`reset role;insert into auth.users values('${user}','new@example.test');set role authenticated;`);
 await expect(call(["TEACHER"],profile,null)).rejects.toThrow(/already exists/);
 await call(["TEACHER","ADVISER","SCHOOL_HEAD"],profile,user);
 expect((await db.query("select * from public.school_memberships where user_id=$1",[user])).rows).toHaveLength(3);
 expect((await db.query("select user_id from public.teachers where id=$1",[profile])).rows).toEqual([{user_id:user}]);
 await db.exec(`set request.jwt.claim.sub='${user}';`);
 await expect(call(["TEACHER"],profile,user)).rejects.toThrow(/App manager/);
 }finally{await db.close();}
});
