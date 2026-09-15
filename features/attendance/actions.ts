"use server";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/auth/session";
import {requireAdmin} from "@/features/admin/access";
import {attendanceSchema,statusSchema} from "./schema";
export type AttendanceState={error?:string;success?:string};
export async function saveAttendance(_state:AttendanceState,form:FormData):Promise<AttendanceState>{
 const {client}=await requireSession();
 const entries=[...form.entries()].filter(([key])=>key.startsWith("attendance:")).map(([key,value])=>({student_id:key.slice(11),status_code:value===""?null:value}));
 const parsed=attendanceSchema.safeParse({offering:form.get("offering"),day:form.get("day"),expected_version:Number(form.get("version")),reason:form.get("reason")??"",entries});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {error}=await client.rpc("save_attendance",parsed.data);
 if(error)return {error:error.code==="40001"?"Attendance changed in another session. Refresh and review before saving again.":error.code==="42501"?"Only an assigned subject teacher can record attendance.":"Could not save attendance. Check the date, school statuses, enrollment, and correction reason."};
 revalidatePath("/teacher","layout");revalidatePath("/student");
 return {success:"Attendance saved. Students can see only their own recorded status."};
}
export async function configureStatus(_state:AttendanceState,form:FormData):Promise<AttendanceState>{
 const {client}=await requireAdmin();
 const parsed=statusSchema.safeParse({target_school:form.get("school_id"),status_code:form.get("code"),status_label:form.get("label"),enabled:form.get("enabled")==="on"});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {error}=await client.rpc("configure_attendance_status",parsed.data);
 if(error)return {error:"Could not save the status. Check school access, the 50-status limit, and the attendance migration."};
 revalidatePath("/deskonekt/admin");revalidatePath("/teacher","layout");return {success:"Attendance status saved. Existing history keeps its recorded label."};
}
