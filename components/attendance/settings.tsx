import {requireAdmin} from "@/features/admin/access";
import {StatusForm} from "./status-form";
export async function AttendanceSettings({schoolId}:{schoolId:string}){
 const {client}=await requireAdmin();const {data,error}=await client.from("attendance_statuses").select("code,label,active").eq("school_id",schoolId).order("code").limit(50);
 if(error)throw new Error("Attendance statuses could not be loaded.");
 return <><h2 className="text-xl font-semibold text-navy">Attendance statuses</h2><p className="text-sm text-muted mt-2 mb-5">Add the statuses your school uses, such as Present, Absent, Late, or Excused. Codes are permanent identifiers. Deactivate a status to stop new use while preserving history. Up to 50 statuses per school.</p><StatusForm schoolId={schoolId}/><div className="grid md:grid-cols-2 gap-4 mt-5">{data.map(s=><StatusForm key={s.code} schoolId={schoolId} status={s}/>)}</div>{!data.length&&<p className="text-muted mt-5">No statuses configured. Add at least one before teachers record attendance.</p>}</>;
}
