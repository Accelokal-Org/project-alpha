import { z } from "zod";
const id = z.uuid();
const name = z.string().trim().min(1,"Enter a name.").max(200);
const code = z.string().trim().min(1,"Enter a code.").max(50);
const timezone = z.string().trim().min(1).max(100).refine(value => {
 try { new Intl.DateTimeFormat("en",{timeZone:value}); return true; } catch { return false; }
}, "Enter a valid timezone, such as Asia/Manila.");
const school = { school_id:id };
export const setupSchema = z.discriminatedUnion("operation",[
 z.object({operation:z.literal("create_school"),name,timezone}),
 z.object({operation:z.literal("update_school"),...school,name,timezone}),
 z.object({operation:z.literal("create_year"),...school,name,starts_on:z.iso.date(),ends_on:z.iso.date(),is_active:z.boolean()}).refine(v=>v.ends_on>v.starts_on,{message:"The end date must be after the start date.",path:["ends_on"]}),
 z.object({operation:z.literal("create_grade"),...school,name}),
 z.object({operation:z.literal("create_teacher"),...school,name,code}),
 z.object({operation:z.literal("create_student"),...school,name,code}),
 z.object({operation:z.literal("create_subject"),...school,name,code}),
 z.object({operation:z.literal("create_class"),...school,name,year_id:id,grade_id:id}),
 z.object({operation:z.literal("create_offering"),...school,class_id:id,subject_id:id}),
 z.object({operation:z.literal("assign_teacher"),...school,offering_id:id,teacher_id:id}),
 z.object({operation:z.literal("assign_adviser"),...school,class_id:id,teacher_id:id}),
 z.object({operation:z.literal("enroll_class"),...school,class_id:id,student_id:id}),
 z.object({operation:z.literal("enroll_subject"),...school,offering_id:id,student_id:id}),
 z.object({operation:z.literal("enroll_class_subject"),...school,class_id:id,offering_id:id}),
 z.object({operation:z.literal("link_account"),...school,email:z.email().max(254),role:z.enum(["TEACHER","ADVISER","STUDENT","SCHOOL_HEAD"]),profile_id:z.union([id,z.literal("")])})
  .refine(v => v.role==="SCHOOL_HEAD" || v.profile_id!=="", {message:"Choose the teacher or student profile to connect.",path:["profile_id"]}),
]);
export type SetupInput = z.infer<typeof setupSchema>;
export type SetupOperation = SetupInput["operation"];
export type AdminFormState = { error?: string; success?: string };
