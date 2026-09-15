import "server-only";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireSession} from "@/lib/auth/session";
export async function getAttendance(offering:string,schoolId:string,date?:string){
 const {client}=await requireSession();
 if(date&&!z.iso.date().safeParse(date).success)notFound();
 const school=await client.from("schools").select("timezone").eq("id",schoolId).single();
 if(school.error)throw new Error("School timezone unavailable.");
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:school.data.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const today=`${part("year")}-${part("month")}-${part("day")}`,selectedDate=date||today;
 const [statuses,days,detail,access]=await Promise.all([
 client.from("attendance_statuses").select("code,label,active").eq("school_id",schoolId).order("code").limit(50),
 client.from("attendance_days").select("id,attendance_date,version").eq("offering_id",offering).order("attendance_date",{ascending:false}).limit(60),
 client.from("attendance_days").select("id,version").eq("offering_id",offering).eq("attendance_date",selectedDate).maybeSingle(),
 client.rpc("can_manage_attendance",{offering}),
 ]);
 if([statuses,days,detail,access].some(r=>r.error))throw new Error("Attendance could not be loaded. Apply the attendance migration first.");
 const records=detail.data?await client.from("attendance_records").select("student_id,status_code,status_label").eq("day_id",detail.data.id).range(0,500):null;
 const history=detail.data?await client.from("attendance_events").select("id,reason,created_at").eq("day_id",detail.data.id).order("created_at",{ascending:false}).limit(20):null;
 if(records?.error||history?.error)throw new Error("Attendance history could not be loaded.");
 return {statuses:statuses.data??[],days:days.data??[],records:records?.data??[],history:history?.data??[],version:detail.data?.version??0,canManage:access.data===true,selectedDate,today,timezone:school.data.timezone};
}
