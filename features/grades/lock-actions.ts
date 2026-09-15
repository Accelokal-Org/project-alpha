"use server";
import {z} from "zod";
import {requireSession} from "@/lib/auth/session";
import {revalidatePath} from "next/cache";
import type {GradeState} from "./actions";
const schema=z.object({target:z.uuid(),expected_version:z.number().int().positive(),lock_record:z.enum(["lock","unlock"]),reason:z.string().trim().max(1000),confirmed:z.literal("on")}).refine(v=>v.lock_record!=="unlock"||v.reason.length>0,"Explain why these grades need to be unlocked.");
export async function changeGradeLock(_state:GradeState,form:FormData):Promise<GradeState>{
 const {client}=await requireSession();const parsed=schema.safeParse({target:form.get("target"),expected_version:Number(form.get("version")),lock_record:form.get("operation"),reason:form.get("reason"),confirmed:form.get("confirmed")});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const {target,expected_version,lock_record,reason}=parsed.data;
 const {error}=await client.rpc("set_grade_lock",{target,expected_version,lock_record:lock_record==="lock",reason});
 if(error)return {error:error.code==="40001"?"Submission status changed. Refresh before trying again.":error.code==="42501"?"Only the currently assigned adviser can change this lock.":"Could not change the lock. Check the current review status and unlock reason."};
 revalidatePath("/teacher","layout");revalidatePath("/deskonekt/admin");return {success:lock_record==="lock"?"Reviewed grades locked.":"Grades unlocked and restored to Reviewed. Return them for correction if needed."};
}
