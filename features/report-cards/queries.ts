import "server-only";
import {z} from "zod";
import {notFound} from "next/navigation";
import {requireSession} from "@/lib/auth/session";
import {reportSchema} from "./schema";
export async function getReportCard(classId:string,student:string,version?:string){
 const {client}=await requireSession();
 if(!z.uuid().safeParse(student).success||(version&&!/^[1-9][0-9]{0,8}$/.test(version)))notFound();
 const source=await client.rpc("report_card_source",{target_class:classId,target_student:student});
 if(source.error){if(source.error.code==="42501")notFound();throw new Error("Report-card source could not be loaded. Check the report-version migration and the 200-subject limit.");}
 const live=z.object({snapshot:reportSchema,token:z.string()}).parse(source.data);
 const record=await client.from("report_cards").select("id,school_id,current_version").eq("class_id",classId).eq("student_id",student).maybeSingle();
 if(record.error)throw new Error("Saved report could not be loaded.");
 const [versions,selected,access,events]=record.data?await Promise.all([
  client.from("report_card_versions").select("version,source_token,saved_at,approved_at").eq("report_id",record.data.id).order("version",{ascending:false}).limit(50),
  version?client.from("report_card_versions").select("version,snapshot,source_token,saved_at,approved_at").eq("report_id",record.data.id).eq("version",Number(version)).maybeSingle():null,
  client.rpc("can_configure_grading",{target_school:record.data.school_id}),
  client.from("report_card_events").select("id,version,action,created_at").eq("report_id",record.data.id).order("created_at",{ascending:false}).limit(50),
 ]):[null,null,null,null];
 if(versions?.error||selected?.error||access?.error||events?.error)throw new Error("Report version history could not be loaded.");
 if(version&&!selected?.data)notFound();
 const latest=versions?.data?.find(v=>v.version===record.data?.current_version);
 return {report:selected?.data?reportSchema.parse(selected.data.snapshot):live.snapshot,token:live.token,record:record.data,selected:selected?.data??null,versions:versions?.data??[],events:events?.data??[],canApprove:access?.data===true,sourceMatches:selected?.data?.source_token===live.token,latestMatches:latest?.source_token===live.token};
}
