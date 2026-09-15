"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/auth/session";
import {createAssessmentSchema,scoreSchema,publishSchema} from "./schema";
export type AssessmentState={error?:string;success?:string};
function message(code:string){return code==="40001"?"Another change was saved. Refresh the page before trying again.":code==="42501"?"Only the assigned subject teacher can make this change.":"Could not save. Check enrollment, score limits, and whether the assessment is already published.";}
export async function createAssessment(_state:AssessmentState,form:FormData):Promise<AssessmentState>{
 const {client}=await requireSession();
 const parsed=createAssessmentSchema.safeParse({offering:form.get("offering"),title:form.get("title"),assessment_date:form.get("assessment_date"),max_score:Number(form.get("max_score"))});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {data,error}=await client.rpc("create_assessment",parsed.data);
 if(error)return {error:message(error.code)};
 revalidatePath("/teacher");
 redirect(`/teacher/classes/${parsed.data.offering}?tab=assessments&assessment=${data}`);
}
export async function saveScores(_state:AssessmentState,form:FormData):Promise<AssessmentState>{
 const {client}=await requireSession();
 const entries=[...form.entries()].filter(([key])=>key.startsWith("score:")).map(([key,value])=>({student_id:key.slice(6),score:typeof value==="string"&&value.trim()===""?null:Number(value)}));
 const parsed=scoreSchema.safeParse({target:form.get("target"),expected_version:Number(form.get("version")),entries});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {error}=await client.rpc("save_assessment_scores",parsed.data);
 if(error)return {error:message(error.code)};
 revalidatePath("/teacher","layout");
 return {success:"Draft scores saved. Students cannot see them until you publish."};
}
export async function publishScores(_state:AssessmentState,form:FormData):Promise<AssessmentState>{
 const {client}=await requireSession();
 const parsed=publishSchema.safeParse({target:form.get("target"),expected_version:Number(form.get("version")),confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:"Confirm that you have reviewed the saved scores before publishing."};
 const {target,expected_version}=parsed.data;
 const {error}=await client.rpc("publish_assessment",{target,expected_version});
 if(error)return {error:message(error.code)};
 revalidatePath("/teacher","layout");revalidatePath("/student");
 return {success:"Scores published. Each student can see only their own result."};
}

export async function correctReturnedScores(_state:AssessmentState,form:FormData):Promise<AssessmentState>{
 const {client}=await requireSession();
 const entries=[...form.entries()].filter(([key])=>key.startsWith("score:")).map(([key,value])=>({student_id:key.slice(6),score:typeof value==="string"&&value.trim()===""?null:Number(value)}));
 const parsed=scoreSchema.safeParse({target:form.get("target"),expected_version:Number(form.get("version")),entries});
 const reason=form.get("reason");
 if(!parsed.success||typeof reason!=="string"||!reason.trim()||reason.length>1000)return {error:"Enter valid scores and a correction reason (up to 1000 characters)."};
 const {error}=await client.rpc("correct_returned_assessment_scores",{...parsed.data,reason:reason.trim()});
 if(error)return {error:error.code==="40001"?"Scores changed. Refresh and review again.":"Correction failed. The linked period must still be returned and you must remain its assigned teacher."};
 revalidatePath("/teacher","layout");revalidatePath("/student");
 return {success:"Correction saved and audited. Published score results update immediately. Review and resubmit the returned period grades next."};
}
