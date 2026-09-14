import { describe, expect, it } from "vitest";
import { canReadClassRoster, hasPermission, isStaff, type Membership } from "@/lib/auth/permissions";
import { loginSchema } from "@/lib/auth/schema";
const member = (role: Membership["role"], school_id = "a"): Membership => ({ role, school_id, user_id: "u" });
describe("centralized permissions", () => {
 it("requires adviser assignment or school-level authority for full class rosters", () => {
  expect(canReadClassRoster([member("TEACHER")],"a",true)).toBe(false);
  expect(canReadClassRoster([member("ADVISER")],"a",false)).toBe(false);
  expect(canReadClassRoster([member("ADVISER")],"a",true)).toBe(true);
  expect(canReadClassRoster([member("ADVISER")],"b",true)).toBe(false);
  expect(canReadClassRoster([member("SCHOOL_HEAD")],"a",false)).toBe(true);
 });
 it("does not grant staff access to students", () => {
  expect(isStaff([member("STUDENT")])).toBe(false);
  expect(hasPermission([member("STUDENT")],"a","roster.read")).toBe(false);
 });
 it("scopes school heads and teachers to their school", () => {
  for (const role of ["SCHOOL_HEAD","TEACHER","ADVISER"] as const) {
   expect(hasPermission([member(role)],"a","roster.read")).toBe(true);
   expect(hasPermission([member(role)],"b","roster.read")).toBe(false);
  }
 });
 it("combines roles without transferring authority across schools", () => {
  const memberships = [member("TEACHER"),member("STUDENT","b")];
  expect(hasPermission(memberships,"b","roster.read")).toBe(false);
  expect(hasPermission(memberships,"b","student.read_own")).toBe(true);
 });
 it("retains platform manager read authority", () => expect(hasPermission([member("APP_MANAGER")],"b","roster.read")).toBe(true));
 it("denies accounts without memberships", () => expect(isStaff([])).toBe(false));
});
it("validates sign-in input on the server boundary", () => {
 expect(loginSchema.safeParse({email:"bad",password:""}).success).toBe(false);
 expect(loginSchema.safeParse({email:"teacher@example.test",password:"x".repeat(257)}).success).toBe(false);
 expect(loginSchema.safeParse({email:"teacher@example.test",password:"valid password"}).success).toBe(true);
});
