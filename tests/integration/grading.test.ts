import {beforeAll,afterAll,it,expect} from "vitest";
import type {PGlite} from "@electric-sql/pglite";
import {createTestDatabase} from "./database";
let db:PGlite;let sequence=0;
const school="10000000-0000-4000-8000-000000000001",year="20000000-0000-4000-8000-000000000001",offering="70000000-0000-4000-8000-000000000001";
const uid=(n:number)=>`95000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const periods=[{name:"Period 1",starts_on:"2026-06-01",ends_on:"2026-10-31"},{name:"Period 2",starts_on:"2026-11-01",ends_on:"2027-04-30"}];
const components=[{name:"Written",weight:40},{name:"Performance",weight:60}];
async function actor(n:number,sql:string,args:unknown[]=[]){await db.exec(`set role authenticated;set request.jwt.claim.sub='${uid(n)}'`);try{return await db.query<Record<string,unknown>>(sql,args);}finally{await db.exec("reset role;reset request.jwt.claim.sub");}}
async function save({n=4,target=null,version=0,p=periods,c=components,y=year,s=school}:{n?:number;target?:string|null;version?:number;p?:typeof periods;c?:typeof components;y?:string;s?:string}={}){return (await actor(n,"select public.save_grading_scheme($1,$2,$3,$4,$5,$6,$7) id",[s,y,target,version,`Scheme ${++sequence}`,JSON.stringify(p),JSON.stringify(c)])).rows[0].id as string;}
const approve=(id:string,version=1,n=4)=>actor(n,"select public.approve_grading_scheme($1,$2)",[id,version]);
async function assessment(){return (await actor(1,"select public.create_assessment($1,'Assessment','2026-09-15',20) id",[offering])).rows[0].id as string;}
async function options(id:string){return {period:(await db.query<{id:string}>("select id from public.grading_periods where scheme_id=$1 order by starts_on",[id])).rows[0].id,component:(await db.query<{id:string}>("select id from public.grading_components where scheme_id=$1 order by name",[id])).rows[0].id};}
const link=(id:string,version:number,scheme:string|null,period:string|null,component:string|null,n=1)=>actor(n,"select public.assign_assessment_grading($1,$2,$3,$4,$5)",[id,version,scheme,period,component]);
beforeAll(async()=>{db=await createTestDatabase();await db.exec(`insert into auth.users(id) select ('95000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.school_memberships values('${school}','${uid(1)}','TEACHER'),('${school}','${uid(2)}','TEACHER'),('${school}','${uid(3)}','STUDENT'),('${school}','${uid(4)}','SCHOOL_HEAD'),('${school}','${uid(6)}','ADVISER');
insert into public.platform_admins(user_id) values('${uid(5)}');
update public.teachers set user_id='${uid(1)}' where employee_code='T-001';update public.teachers set user_id='${uid(2)}' where employee_code='T-002';`);});
afterAll(async()=>{await db.close();});
it("keeps drafts private, approves 100% schemes, and locks their rules",async()=>{
 const id=await save();for(const n of [1,2,3,6]){
  expect((await actor(n,"select * from public.grading_schemes where id=$1",[id])).rows).toHaveLength(0);
  expect((await actor(n,"select * from public.grading_components where scheme_id=$1",[id])).rows).toHaveLength(0);
 }
 await approve(id);expect((await actor(1,"select * from public.grading_schemes where id=$1",[id])).rows).toHaveLength(1);
 expect((await actor(3,"select * from public.grading_periods where scheme_id=$1",[id])).rows).toHaveLength(0);
 await expect(save({target:id,version:2})).rejects.toThrow(/locked/);
 expect((await db.query("select * from public.admin_audit_log where entity_id=$1",[id])).rows).toHaveLength(2);
});
it("denies unauthorized setup, approval, direct writes and anonymous RPCs",async()=>{
 const id=await save();for(const n of [1,2,3,6]){await expect(save({n})).rejects.toThrow(/School head/);await expect(approve(id,1,n)).rejects.toThrow(/School head/);}
 const manager=await save({n:5});await approve(manager,1,5);
 await expect(actor(4,"update public.grading_components set weight=1")).rejects.toThrow(/permission denied/);
 await db.exec("set role anon");try{await expect(db.query("select public.can_configure_grading($1)",[school])).rejects.toThrow(/permission denied/);}finally{await db.exec("reset role");}
});
it("validates date boundaries, overlaps, duplicates and decimal weights with atomic rollback",async()=>{
 const id=await save();
 await expect(save({target:id,version:1,p:[{...periods[0],starts_on:"2026-01-01"}]})).rejects.toThrow(/school year/);
 await expect(save({p:[periods[0],{...periods[1],starts_on:"2026-10-31"}]})).rejects.toThrow(/overlap/);
 await expect(save({c:[components[0],components[0]]})).rejects.toThrow(/unique/);
 await expect(save({c:[{name:"Invalid",weight:33.333}]})).rejects.toThrow();
 expect((await db.query("select version from public.grading_schemes where id=$1",[id])).rows[0]).toEqual({version:1});
 expect((await db.query("select * from public.grading_periods where scheme_id=$1",[id])).rows).toHaveLength(2);
 await save({target:id,version:1});await expect(save({target:id,version:1})).rejects.toThrow(/changed/);await expect(approve(id,1)).rejects.toThrow(/changed/);await approve(id,2);
 const incomplete=await save({c:[{name:"Part",weight:90}]});await expect(approve(incomplete)).rejects.toThrow(/100/);
});
it("links only approved matching settings and preserves publication and score concurrency",async()=>{
 const scheme=await save(),id=await assessment(),o=await options(scheme);
 await expect(link(id,1,scheme,o.period,o.component)).rejects.toThrow(/approved/);await approve(scheme);
 for(const n of [2,3,4,5,6])await expect(link(id,1,scheme,o.period,o.component,n)).rejects.toThrow(/Assigned teacher/);
 await link(id,1,scheme,o.period,o.component);
 await expect(actor(1,"select public.save_assessment_scores($1,1,'[]')",[id])).rejects.toThrow(/changed/);
 expect((await actor(3,"select * from public.assessment_grading")).rows).toHaveLength(0);
 await link(id,2,null,null,null);expect((await db.query("select * from public.assessment_grading where assessment_id=$1",[id])).rows).toHaveLength(0);
 await link(id,3,scheme,o.period,o.component);
 await actor(1,"select public.save_assessment_scores($1,4,$2)",[id,JSON.stringify([{student_id:"80000000-0000-4000-8000-000000000001",score:10}])]);await actor(1,"select public.publish_assessment($1,5)",[id]);
 await expect(link(id,6,null,null,null)).rejects.toThrow(/read-only/);
});
it("rejects mismatched periods, components, school years and schools",async()=>{
 const a=await save(),b=await save();await approve(a);await approve(b);const oa=await options(a),ob=await options(b),id=await assessment();
 await expect(link(id,1,a,oa.period,ob.component)).rejects.toThrow(/approved/);
 const late=(await db.query<{id:string}>("select id from public.grading_periods where scheme_id=$1 order by starts_on desc",[a])).rows[0].id;
 await expect(link(id,1,a,late,oa.component)).rejects.toThrow(/approved/);
 const anotherYear="20000000-0000-4000-8000-000000000009";
 await db.exec(`insert into public.school_years(id,school_id,name,starts_on,ends_on) values('${anotherYear}','${school}','Other year','2026-06-01','2027-04-30')`);
 const other=await save({y:anotherYear});await approve(other);const oo=await options(other);await expect(link(id,1,other,oo.period,oo.component)).rejects.toThrow(/approved/);
 const foreignSchool="10000000-0000-4000-8000-000000000009",foreignYear="20000000-0000-4000-8000-000000000008";
 await db.exec(`insert into public.schools(id,name) values('${foreignSchool}','Isolated school');insert into public.school_years(id,school_id,name,starts_on,ends_on) values('${foreignYear}','${foreignSchool}','Year','2026-06-01','2027-04-30')`);
 await expect(save({s:foreignSchool,y:foreignYear})).rejects.toThrow(/School head/);
 const foreign=await save({s:foreignSchool,y:foreignYear,n:5});await approve(foreign,1,5);const fo=await options(foreign);
 await expect(link(id,1,foreign,fo.period,fo.component)).rejects.toThrow(/approved/);
 expect((await actor(1,"select * from public.grading_schemes where id=$1",[foreign])).rows).toHaveLength(0);
});
it("revoked head and teacher access takes effect immediately",async()=>{
 const scheme=await save();await approve(scheme);const o=await options(scheme),id=await assessment();
 await db.exec(`delete from public.school_memberships where user_id in ('${uid(1)}','${uid(4)}')`);
 try{await expect(save()).rejects.toThrow(/School head/);await expect(link(id,1,scheme,o.period,o.component)).rejects.toThrow(/Assigned teacher/);}finally{await db.exec(`insert into public.school_memberships values('${school}','${uid(1)}','TEACHER'),('${school}','${uid(4)}','SCHOOL_HEAD')`);}
});
