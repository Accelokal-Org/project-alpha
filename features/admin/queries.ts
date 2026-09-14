import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "./access";
export async function getAdminData(schoolId?:string) {
 const session=await requireAdmin(); const {client}=session;
 if(schoolId && !z.uuid().safeParse(schoolId).success) notFound();
 const schools=await client.from("schools").select("id,name,timezone").order("created_at",{ascending:false}).limit(200);
 if(schools.error) throw new Error("School list unavailable.");
 const selected=schoolId ? schools.data.find(s=>s.id===schoolId) : undefined;
 if(schoolId && !selected) notFound();
 const sid=selected?.id ?? "00000000-0000-4000-8000-000000000000";
 const [years,grades,classes,teachers,students,subjects,offerings,teacherAssignments,classEnrollments,subjectEnrollments,accounts,audit]=await Promise.all([
  client.from("school_years").select("id,name,starts_on,ends_on,is_active").eq("school_id",sid).order("starts_on",{ascending:false}),
  client.from("grade_levels").select("id,name").eq("school_id",sid).order("sort_order"),
  client.from("classes").select("id,name,school_year_id,grade_level_id,adviser_teacher_id").eq("school_id",sid).order("name"),
  client.from("teachers").select("id,display_name,employee_code,user_id").eq("school_id",sid).order("display_name"),
  client.from("students").select("id,display_name,student_code,user_id").eq("school_id",sid).order("display_name"),
  client.from("subjects").select("id,code,name").eq("school_id",sid).order("code"),
  client.from("subject_offerings").select("id,class_id,subject_id").eq("school_id",sid),
  client.from("teacher_assignments").select("offering_id,teacher_id").eq("school_id",sid),
  client.from("class_enrollments").select("class_id,student_id").eq("school_id",sid),
  client.from("subject_enrollments").select("offering_id,student_id").eq("school_id",sid),
  client.rpc("admin_accounts",{target_school:sid}),
  client.from("admin_audit_log").select("id,action,entity_id,actor_id,created_at").eq("school_id",sid).order("created_at",{ascending:false}).limit(30),
 ]);
 if([years,grades,classes,teachers,students,subjects,offerings,teacherAssignments,classEnrollments,subjectEnrollments,accounts,audit].some(r=>r.error)) throw new Error("School setup could not be loaded.");
 return {user:session.user,schools:schools.data,selected,years:years.data??[],grades:grades.data??[],classes:classes.data??[],teachers:teachers.data??[],students:students.data??[],subjects:subjects.data??[],offerings:offerings.data??[],teacherAssignments:teacherAssignments.data??[],classEnrollments:classEnrollments.data??[],subjectEnrollments:subjectEnrollments.data??[],accounts:accounts.data??[],audit:audit.data??[]};
}
export type AdminData=Awaited<ReturnType<typeof getAdminData>>;
