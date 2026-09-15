"use server";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/auth/session";
import {calculationSchema,submissionSchema} from "./schema";
export type GradeState={error?:string;success?:string};
export async function approveCalculation(_state:GradeState,form:FormData):Promise<GradeState>{
 const {client}=await requireSession();
 const parsed=calculationSchema.safeParse({scheme:form.get("scheme"),method:form.get("method"),missing_scores:form.get("missing_scores"),decimal_places:form.get("decimal_places")?Number(form.get("decimal_places")):NaN,confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:"Choose every calculation setting and confirm school approval."};
 const {confirmed,...args}=parsed.data;void confirmed;
 const {error}=await client.rpc("approve_grade_calculation",args);
 if(error)return {error:error.code==="42501"?"School-head or superadmin access is required.":"Could not approve. Check that the scheme is approved and does not already have a locked calculation rule."};
 revalidatePath("/teacher","layout");revalidatePath("/deskonekt/admin");
 return {success:"School calculation rule approved and locked."};
}
export async function submitGrades(_state:GradeState,form:FormData):Promise<GradeState>{
 const {client}=await requireSession();
 const parsed=submissionSchema.safeParse({offering:form.get("offering"),period:form.get("period"),expected_token:form.get("token"),confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:"Confirm that you reviewed these calculated grades before submitting."};
 const {confirmed,...args}=parsed.data;void confirmed;
 const {error}=await client.rpc("submit_period_grades",args);
 if(error)return {error:error.code==="40001"?"Scores, enrollment or grading inputs changed. Refresh and review the updated grades before submitting.":error.code==="42501"?"Only an assigned subject teacher can submit grades.":"Could not submit. Resolve incomplete grading inputs and check whether this period has already been submitted."};
 revalidatePath("/teacher","layout");
 return {success:"Period grades submitted. The submitted snapshot is saved for authorized staff review."};
}
