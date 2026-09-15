"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/auth/session";
import type {GradeState} from "./actions";
const reviewSchema=z.object({target:z.uuid(),expected_version:z.number().int().positive(),decision:z.enum(["returned","reviewed"]),reason:z.string().trim().max(1000),confirmed:z.literal("on")}).refine(v=>v.decision!=="returned"||v.reason.length>0,"Explain why the submission needs correction.");
const resubmitSchema=z.object({target:z.uuid(),expected_version:z.number().int().positive(),expected_token:z.string().regex(/^[a-f0-9]{32}$/),correction_note:z.string().trim().min(1).max(1000),confirmed:z.literal("on")});
function message(code:string){return code==="40001"?"This submission or its scores changed. Refresh and review again.":code==="42501"?"Your current assignment does not allow this action.":"Could not save. Check the submission status and required reason.";}
export async function reviewGrades(_state:GradeState,form:FormData):Promise<GradeState>{
 const {client}=await requireSession();const parsed=reviewSchema.safeParse({target:form.get("target"),expected_version:Number(form.get("version")),decision:form.get("decision"),reason:form.get("reason"),confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {confirmed,...args}=parsed.data;void confirmed;const {error}=await client.rpc("review_period_grades",args);
 if(error)return {error:message(error.code)};revalidatePath("/teacher","layout");return {success:args.decision==="returned"?"Returned to the subject teacher for correction.":"Submission marked reviewed."};
}
export async function resubmitGrades(_state:GradeState,form:FormData):Promise<GradeState>{
 const {client}=await requireSession();const parsed=resubmitSchema.safeParse({target:form.get("target"),expected_version:Number(form.get("version")),expected_token:form.get("token"),correction_note:form.get("reason"),confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:"Describe the correction and confirm your review before resubmitting."};
 const {confirmed,...args}=parsed.data;void confirmed;const {error}=await client.rpc("resubmit_period_grades",args);
 if(error)return {error:message(error.code)};revalidatePath("/teacher","layout");return {success:"New revision submitted. Earlier versions remain available."};
}
