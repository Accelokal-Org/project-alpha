"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/auth/session";
import {saveReportSchema,approveReportSchema} from "./schema";
export type ReportState={error?:string;success?:string};
function message(code:string){return code==="40001"?"The report or its source grades changed. Open the current preview, save a new version if needed, and review again.":code==="42501"?"Your current school or adviser access does not allow this action.":"Could not save this change. Check completeness, the latest saved version, and its approval status.";}
export async function saveReport(_state:ReportState,form:FormData):Promise<ReportState>{
 const {client}=await requireSession();
 const parsed=saveReportSchema.safeParse({target_class:form.get("class"),target_student:form.get("student"),expected_version:Number(form.get("version")),expected_token:form.get("token"),confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:"Confirm the current preview before saving a report-card version."};
 const {confirmed,...args}=parsed.data;void confirmed;
 const {data,error}=await client.rpc("save_report_card",args);
 if(error)return {error:message(error.code)};
 revalidatePath("/teacher","layout");
 redirect(`/teacher/classes/advisory-${args.target_class}?tab=report-cards&student=${args.target_student}&report_version=${data}`);
}
export async function approveReport(_state:ReportState,form:FormData):Promise<ReportState>{
 const {client}=await requireSession();
 const parsed=approveReportSchema.safeParse({target:form.get("target"),expected_version:Number(form.get("version")),expected_token:form.get("token"),confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:"Confirm review of this saved report-card version before approving."};
 const {confirmed,...args}=parsed.data;void confirmed;
 const {error}=await client.rpc("approve_report_card",args);
 if(error)return {error:message(error.code)};
 revalidatePath("/teacher","layout");
 return {success:"Report-card version approved for staff records. It has not been released to the student."};
}
