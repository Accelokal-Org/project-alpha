import "server-only";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireSession} from "@/lib/auth/session";
export async function getAssessments(offering:string,selected?:string){
 const {client}=await requireSession();
 if(selected&&!z.uuid().safeParse(selected).success)notFound();
 const [list,access]=await Promise.all([client.from("assessments").select("*").eq("offering_id",offering).order("created_at",{ascending:false}).limit(100),client.rpc("can_manage_assessments",{offering})]);
 if(list.error||access.error)throw new Error("Assessments could not be loaded. Apply the assessment migration and try again.");
 const detail=selected?await client.from("assessments").select("*").eq("id",selected).eq("offering_id",offering).maybeSingle():null;
 if(detail?.error)throw new Error("Assessment could not be loaded.");
 if(selected&&!detail?.data)notFound();
 const scores=selected?await client.from("assessment_scores").select("student_id,score").eq("assessment_id",selected).range(0,500):null;
 if(scores?.error)throw new Error("Scores could not be loaded.");
 return {list:list.data,selected:detail?.data??null,scores:scores?.data??[],canManage:access.data===true};
}
