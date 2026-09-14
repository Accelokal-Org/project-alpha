import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { canReadClassRoster, hasPermission, isStaff } from "@/lib/auth/permissions";
import type { Assignment, RosterStudent } from "./types";

export async function getAssignments(): Promise<Assignment[]> {
 const { client, memberships, user } = await requireSession();
 if (!isStaff(memberships)) notFound();
 // Every query runs under the caller's JWT. RLS restricts all joins independently.
 const [offerings, classes, subjects, schools, years, teachers] = await Promise.all([
  client.rpc("staff_offerings"),
  client.from("classes").select("id,school_id,school_year_id,name,adviser_teacher_id"),
  client.from("subjects").select("id,code,name"),
  client.from("schools").select("id,name"),
  client.from("school_years").select("id,name"),
  client.from("teachers").select("id,user_id").eq("user_id",user.id),
 ]);
 if ([offerings, classes, subjects, schools, years, teachers].some(r => r.error)) throw new Error("Could not load class assignments.");
 const result: Assignment[] = [];
 for (const o of offerings.data ?? []) {
  if (!hasPermission(memberships, o.school_id, "roster.read")) continue;
  const c = classes.data?.find(c => c.id === o.class_id);
  const s = subjects.data?.find(s => s.id === o.subject_id);
  if (!c || !s) continue;
  result.push({ id: o.id, schoolId: o.school_id, classId: c.id, className: c.name,
   school: schools.data?.find(s => s.id === o.school_id)?.name ?? "School",
   year: years.data?.find(y => y.id === c.school_year_id)?.name ?? "", subject: s.name, code: s.code, kind: "Subject" });
 }
 for (const c of classes.data ?? []) {
  const isAssignedAdviser = teachers.data?.some(t => t.id === c.adviser_teacher_id) ?? false;
  if (!canReadClassRoster(memberships,c.school_id,isAssignedAdviser)) continue;
  result.push({ id: `advisory-${c.id}`, classId: c.id, schoolId: c.school_id, className: c.name,
   school: schools.data?.find(s => s.id === c.school_id)?.name ?? "School",
   year: years.data?.find(y => y.id === c.school_year_id)?.name ?? "", subject: "Class advisory", code: "ADV", kind: "Advisory" });
 }
 return result;
}

export async function getAssignmentRoster(id: string): Promise<{ assignment: Assignment; students: RosterStudent[] }> {
 // Authenticate before resolving IDs, including malformed inputs.
 const { client, memberships } = await requireSession();
 if (!isStaff(memberships)) notFound();
 if (!z.uuid().safeParse(id.replace(/^advisory-/, "")).success) notFound();
 const assignments = await getAssignments();
 const assignment = assignments.find(a => a.id === id);
 if (!assignment || !hasPermission(memberships, assignment.schoolId, "roster.read")) notFound();
 const { data: enrollments, error } = assignment.kind === "Advisory"
  ? await client.from("class_enrollments").select("student_id").eq("class_id", assignment.classId)
  : await client.from("subject_enrollments").select("student_id").eq("offering_id", id);
 if (error) throw new Error("Could not load the roster.");
 if (!enrollments.length) return { assignment, students: [] };
 const { data, error: studentError } = await client.from("students").select("id,student_code,display_name")
  .eq("school_id", assignment.schoolId).in("id", enrollments.map(e => e.student_id)).order("display_name");
 if (studentError) throw new Error("Could not load the roster.");
 return { assignment, students: data.map(s => ({ id: s.id, studentCode: s.student_code, name: s.display_name })) };
}
