"use server";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/auth/session";
import {schemeSchema,assignmentSchema} from "./schema";
import {z} from "zod";
export type GradingState={error?:string;success?:string};
function message(code:string){return code==="40001"?"This record changed. Preserve your unsaved work, then refresh before trying again.":code==="42501"?"Your current school access does not allow this change.":"Could not save. Check dates, unique names, weights, and whether the record is already approved or published.";}
function refresh(){revalidatePath("/teacher","layout");revalidatePath("/deskonekt/admin");}
export async function saveScheme(_state:GradingState,form:FormData):Promise<GradingState>{
 const {client}=await requireSession();
 let periods:unknown,components:unknown;
 try{periods=JSON.parse(String(form.get("periods")));components=JSON.parse(String(form.get("components")));}catch{return {error:"Check your periods and components."};}
 const parsed=schemeSchema.safeParse({target_school:form.get("school"),year_id:form.get("year"),target:form.get("target")||null,expected_version:Number(form.get("version")),scheme_name:form.get("name"),periods,components});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {error}=await client.rpc("save_grading_scheme",parsed.data);
 if(error)return {error:message(error.code)};
 refresh();return {success:"Draft grading scheme saved. Review it below before approval."};
}
export async function approveScheme(_state:GradingState,form:FormData):Promise<GradingState>{
 const {client}=await requireSession();
 const parsed=z.object({target:z.uuid(),expected_version:z.number().int().positive(),confirmed:z.literal("on")}).safeParse({target:form.get("target"),expected_version:Number(form.get("version")),confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:"Confirm that you reviewed the saved periods and weights."};
 const {target,expected_version}=parsed.data;
 const {error}=await client.rpc("approve_grading_scheme",{target,expected_version});
 if(error)return {error:error.code==="22023"?"Approval requires weights totaling exactly 100% and an unapproved scheme.":message(error.code)};
 refresh();return {success:"Scheme approved and locked. Teachers can now use it."};
}
export async function assignGrading(_state:GradingState,form:FormData):Promise<GradingState>{
 const {client}=await requireSession();
 const parsed=assignmentSchema.safeParse({target:form.get("target"),expected_version:Number(form.get("version")),scheme:form.get("scheme")||null,period:form.get("period")||null,component:form.get("component")||null});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {error}=await client.rpc("assign_assessment_grading",parsed.data);
 if(error)return {error:message(error.code)};
 refresh();return {success:parsed.data.scheme?"Assessment grading settings saved.":"Assessment grading settings cleared."};
}
