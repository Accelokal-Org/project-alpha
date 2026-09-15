import "server-only";
import {z} from "zod";
import {notFound} from "next/navigation";
import {requireSession} from "@/lib/auth/session";
export const reportSchema=z.object({
 student:z.object({id:z.uuid(),name:z.string(),code:z.string()}),class:z.object({id:z.uuid(),name:z.string()}),school:z.string(),school_year:z.string(),ready:z.boolean(),total:z.number(),incomplete:z.number(),
 rows:z.array(z.object({offering_id:z.uuid(),subject:z.string(),code:z.string(),subject_class:z.string(),enrolled:z.boolean(),period_id:z.uuid().nullable(),period_name:z.string().nullable(),starts_on:z.string().nullable(),ends_on:z.string().nullable(),scheme_name:z.string().nullable(),submission_id:z.uuid().nullable(),revision:z.number().nullable(),review_version:z.number().nullable(),submission_status:z.string().nullable(),check_status:z.enum(["enrollment_review","scheme_missing","period_missing","submission_missing","not_locked","grade_missing","grade_invalid","complete"]),grade:z.number().nullable()})),
});
export async function getReportCard(classId:string,student:string){
 const {client}=await requireSession();if(!z.uuid().safeParse(student).success)notFound();
 const {data,error}=await client.rpc("preview_report_card",{target_class:classId,target_student:student});
 if(error){if(error.code==="42501")notFound();throw new Error("Report-card preview could not be loaded. Check the report-card migration and the 200-subject limit.");}
 return reportSchema.parse(data);
}
