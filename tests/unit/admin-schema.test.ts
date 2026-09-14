import {describe,it,expect} from "vitest";
import {setupSchema,testAccountSchema} from "@/features/admin/schema";
import {isAppManager} from "@/lib/auth/permissions";
const school_id="10000000-0000-4000-8000-000000000001";
describe("admin form boundaries",()=>{
 it("validates school configuration",()=>{
  expect(setupSchema.safeParse({operation:"create_school",name:"School",timezone:"Asia/Manila"}).success).toBe(true);
  expect(setupSchema.safeParse({operation:"create_school",name:"",timezone:"Unknown"}).success).toBe(false);
 });
 it("validates dates and tenant IDs",()=>{
  expect(setupSchema.safeParse({operation:"create_year",school_id,name:"Year",starts_on:"2026-12-01",ends_on:"2026-01-01",is_active:true}).success).toBe(false);
  expect(setupSchema.safeParse({operation:"create_teacher",school_id:"x",name:"Teacher",code:"T"}).success).toBe(false);
 });
 it("requires a profile for teaching and student roles and rejects manager grants",()=>{
  for(const role of ["TEACHER","STUDENT","ADVISER","APP_MANAGER"]){
   expect(setupSchema.safeParse({operation:"link_account",school_id,email:"a@example.test",role,profile_id:""}).success).toBe(false);
  }
  expect(setupSchema.safeParse({operation:"link_account",school_id,email:"a@example.test",role:"SCHOOL_HEAD",profile_id:""}).success).toBe(true);
 });
 it("restricts test login inputs and never includes passwords in setup payloads",()=>{
  expect(testAccountSchema.safeParse({school_id,email:"teacher@real-school.com",password:"long-enough-password"}).success).toBe(false);
  expect(testAccountSchema.safeParse({school_id,email:"teacher@example.test",password:"short"}).success).toBe(false);
  const result=setupSchema.parse({operation:"create_school",name:"Test",timezone:"UTC",password:"not-for-audit"});
  expect(result).not.toHaveProperty("password");
 });
 it("does not treat teachers or school heads as superadmins",()=>{
  expect(isAppManager([{school_id,user_id:"u",role:"SCHOOL_HEAD"}])).toBe(false);
  expect(isAppManager([{school_id:"*",user_id:"u",role:"APP_MANAGER"}])).toBe(true);
 });
});
