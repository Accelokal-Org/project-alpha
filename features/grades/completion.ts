import "server-only";
import {z} from "zod";
import {notFound} from "next/navigation";
import {requireSession} from "@/lib/auth/session";
export const completionStatuses=["not submitted","submitted","returned","reviewed","locked"] as const;
const schema=z.object({counts:z.record(z.string(),z.number()),total:z.number(),filtered_total:z.number(),unconfigured_subjects:z.number(),empty_classes:z.number(),ready:z.boolean(),rows:z.array(z.object({offering_id:z.uuid(),class_name:z.string(),subject:z.string(),period_id:z.uuid().nullable(),period_name:z.string().nullable(),status:z.string(),revision:z.number().nullable(),scheme_id:z.uuid().nullable()}))});
export async function getCompletion(school:string,query:{year?:string;page?:string;status?:string}){
 const {client}=await requireSession();if(!z.uuid().safeParse(school).success)notFound();
 const access=await client.rpc("can_configure_grading",{target_school:school});if(access.error)throw new Error("Completion access could not be checked.");if(!access.data)notFound();
 const years=await client.from("school_years").select("id,name,is_active").eq("school_id",school).order("starts_on",{ascending:false}).limit(100);
 if(years.error)throw new Error("School years could not be loaded.");
 const year=query.year?years.data.find(y=>y.id===query.year):years.data.find(y=>y.is_active)??years.data[0];
 if(query.year&&!year)notFound();
 const page=Number(query.page??0),status=query.status??"";
 if(!Number.isInteger(page)||page<0||page>100000||(status!==""&&!completionStatuses.some(s=>s===status)))notFound();
 const result=year?await client.rpc("school_grade_completion",{target_school:school,target_year:year.id,page_number:page,status_filter:status}):null;
 if(result?.error)throw new Error("Grade completion could not be loaded. Check the grade-lock migration.");
 return {years:years.data,year,page,status,report:result?schema.parse(result.data):null};
}
