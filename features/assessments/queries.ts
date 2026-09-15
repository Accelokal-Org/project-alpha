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
 let canCorrect=false;
 if(selected&&access.data===true){
  const link=await client.from("assessment_grading").select("period_id").eq("assessment_id",selected).maybeSingle();
  if(link.error)throw new Error("Assessment correction access could not be loaded.");
  if(link.data){const submission=await client.from("grade_submissions").select("status").eq("offering_id",offering).eq("period_id",link.data.period_id).maybeSingle();if(submission.error)throw new Error("Submission status could not be loaded.");canCorrect=submission.data?.status==="returned";}
 }
 return {canCorrect,list:list.data,selected:detail?.data??null,scores:scores?.data??[],canManage:access.data===true};
}
