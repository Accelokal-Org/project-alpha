import {beforeAll,afterAll,it,expect} from "vitest";
import type {PGlite} from "@electric-sql/pglite";
import {createTestDatabase} from "./database";
let db:PGlite;
const school="10000000-0000-4000-8000-000000000001",offering="70000000-0000-4000-8000-000000000001";
const uid=(n:number)=>`93000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const sid=(n:number)=>`80000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
async function actor(n:number,sql:string,args:unknown[]=[]){await db.exec(`set role authenticated;set request.jwt.claim.sub='${uid(n)}'`);try{return await db.query<Record<string,unknown>>(sql,args);}finally{await db.exec("reset role;reset request.jwt.claim.sub");}}
const save=(date:string,version:number,entries:{student_id:string;status_code:string|null}[],reason="",user=1)=>actor(user,"select public.save_attendance($1,$2,$3,$4::jsonb,$5)",[offering,date,version,JSON.stringify(entries),reason]);
const status=(code:string,label:string,enabled=true)=>actor(6,"select public.configure_attendance_status($1,$2,$3,$4)",[school,code,label,enabled]);
beforeAll(async()=>{db=await createTestDatabase();await db.exec(`insert into auth.users(id) select ('93000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.school_memberships values('${school}','${uid(1)}','TEACHER'),('${school}','${uid(2)}','TEACHER'),('${school}','${uid(3)}','STUDENT'),('${school}','${uid(4)}','STUDENT'),('${school}','${uid(5)}','SCHOOL_HEAD');
insert into public.platform_admins(user_id) values('${uid(6)}');
update public.teachers set user_id='${uid(1)}' where employee_code='T-001';update public.teachers set user_id='${uid(2)}' where employee_code='T-002';
update public.students set user_id='${uid(3)}' where id='${sid(1)}';update public.students set user_id='${uid(4)}' where id='${sid(2)}';`);await status("PRESENT","Present");await status("ABSENT","Absent");});
afterAll(async()=>{await db.close();});
it("records subject attendance without turning blanks into absences and exposes only own marks",async()=>{
 await save("2000-01-01",0,[{student_id:sid(1),status_code:"PRESENT"},{student_id:sid(2),status_code:null}]);
 expect((await actor(3,"select * from public.my_attendance() where attendance_date='2000-01-01'")).rows[0].status).toBe("Present");
 expect((await actor(4,"select * from public.my_attendance() where attendance_date='2000-01-01'")).rows).toHaveLength(0);
 expect((await actor(3,"select * from public.attendance_records")).rows).toHaveLength(0);
 expect((await actor(3,"select * from public.attendance_days")).rows).toHaveLength(0);
 expect((await actor(3,"select * from public.attendance_events")).rows).toHaveLength(0);
});
it("requires correction reasons, rejects stale versions, and audits before/after values",async()=>{
 await expect(save("2000-01-01",1,[{student_id:sid(1),status_code:"ABSENT"}])).rejects.toThrow(/reason/);
 await save("2000-01-01",1,[{student_id:sid(1),status_code:"ABSENT"}],"Corrected roll call");
 await expect(save("2000-01-01",1,[{student_id:sid(1),status_code:"PRESENT"}],"Stale edit")).rejects.toThrow(/changed/);
 const audit=(await db.query<{before_value:{status_label:string}[];after_value:{status_label:string}[]}>("select before_value,after_value from public.attendance_events where reason='Corrected roll call'")).rows[0];
 expect(audit.before_value[0].status_label).toBe("Present");expect(audit.after_value[0].status_label).toBe("Absent");
 expect((await actor(3,"select * from public.my_attendance() where attendance_date='2000-01-01'")).rows[0]).not.toHaveProperty("reason");
});
it("preserves historical labels and rejects newly selected inactive statuses",async()=>{
 await status("ABSENT","Absent (school policy)",false);
 await save("2000-01-01",2,[{student_id:sid(1),status_code:"ABSENT"},{student_id:sid(2),status_code:"PRESENT"}],"Added another mark");
 expect((await actor(3,"select * from public.my_attendance() where attendance_date='2000-01-01'")).rows[0].status).toBe("Absent");
 await expect(save("2000-01-02",0,[{student_id:sid(1),status_code:"ABSENT"}])).rejects.toThrow(/inactive/);
 await save("2000-01-01",3,[{student_id:sid(1),status_code:null}],"Removed incorrect mark");
 expect((await actor(3,"select * from public.my_attendance() where attendance_date='2000-01-01'")).rows).toHaveLength(0);
});
it("validates dates, statuses, enrollment and duplicate students atomically",async()=>{
 await expect(save("9999-01-01",0,[{student_id:sid(1),status_code:"PRESENT"}])).rejects.toThrow(/earlier date/);
 await expect(save("2000-01-03",0,[{student_id:sid(1),status_code:"PRESENT"},{student_id:sid(7),status_code:"PRESENT"}])).rejects.toThrow(/not enrolled/);
 expect((await db.query("select * from public.attendance_days where attendance_date='2000-01-03'")).rows).toHaveLength(0);
 await expect(save("2000-01-03",0,[{student_id:sid(1),status_code:"UNKNOWN"}])).rejects.toThrow(/Unknown school status/);
 await expect(save("2000-01-03",0,[{student_id:sid(1),status_code:"PRESENT"},{student_id:sid(1),status_code:"PRESENT"}])).rejects.toThrow(/Duplicate/);
});
it("denies non-assigned teachers, student/head/admin writes and non-admin configuration",async()=>{
 for(const user of [2,3,5,6])await expect(save("2000-01-04",0,[{student_id:sid(1),status_code:"PRESENT"}],"",user)).rejects.toThrow(/Assigned teacher/);
 await expect(actor(1,"select public.configure_attendance_status($1,'LATE','Late',true)",[school])).rejects.toThrow(/App manager/);
 await expect(actor(1,"delete from public.attendance_records")).rejects.toThrow(/permission denied/);
 await db.exec("set role anon");try{await expect(db.query("select * from public.my_attendance()")).rejects.toThrow(/permission denied/);}finally{await db.exec("reset role");}
});
it("keeps mixed-role student projections own-only and honors revoked teacher membership",async()=>{
 await save("2000-01-05",0,[{student_id:sid(1),status_code:"PRESENT"},{student_id:sid(2),status_code:"PRESENT"}]);
 await db.exec(`insert into public.school_memberships values('${school}','${uid(3)}','SCHOOL_HEAD')`);
 try{expect((await actor(3,"select * from public.my_attendance() where attendance_date='2000-01-05'")).rows).toHaveLength(1);}finally{await db.exec(`delete from public.school_memberships where user_id='${uid(3)}' and role='SCHOOL_HEAD'`);}
 await db.exec(`delete from public.school_memberships where user_id='${uid(1)}'`);
 try{await expect(save("2000-01-06",0,[{student_id:sid(1),status_code:"PRESENT"}])).rejects.toThrow(/Assigned teacher/);}finally{await db.exec(`insert into public.school_memberships values('${school}','${uid(1)}','TEACHER')`);}
});
it("keeps status configuration within its school and enforces the configured-status limit",async()=>{
 const other="10000000-0000-4000-8000-000000000099";
 await db.exec(`insert into public.schools(id,name) values('${other}','Other isolated school');insert into public.attendance_statuses values('${other}','REMOTE','Other school status',true);`);
 await expect(save("2000-01-07",0,[{student_id:sid(1),status_code:"REMOTE"}])).rejects.toThrow(/Unknown school status/);
 await db.exec(`insert into public.attendance_statuses select '${school}', 'CODE_'||n::text,'Configured status '||n::text,true from generate_series(1,48)n;`);
 try{await expect(status("EXTRA","Extra")).rejects.toThrow(/limit/);await status("PRESENT","Present");}finally{await db.exec(`delete from public.attendance_statuses where school_id='${school}' and code like 'CODE_%'`);}
});
