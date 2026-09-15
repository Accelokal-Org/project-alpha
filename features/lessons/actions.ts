"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireSession} from "@/lib/auth/session";
import {lessonSchema} from "./schema";
export type LessonState={error?:string;success?:string;version?:number};
export async function saveLesson(_state:LessonState,form:FormData):Promise<LessonState>{
 const {client}=await requireSession();
 const isTemplate=form.get("is_template")==="on";
 const parsed=lessonSchema.safeParse({
  offering:form.get("offering"),target:form.get("target")||null,expected_version:Number(form.get("version")),
  title:form.get("title"),objectives:form.get("objectives"),activities:form.get("activities"),resources:form.get("resources"),
  lesson_date:isTemplate?null:form.get("lesson_date"),is_template:isTemplate,
 });
 if(!parsed.success)return {error:parsed.error.issues[0].message,version:_state.version};
 const {data,error}=await client.rpc("save_lesson_plan",parsed.data);
 if(error)return {version:_state.version,error:error.code==="40001"?"This plan changed since you opened it. Copy your unsaved work, then refresh before saving again.":error.code==="42501"?"Only the assigned subject teacher can save this plan.":"Could not save the lesson plan. Check the fields and try again."};
 revalidatePath("/teacher","layout");
 if(!parsed.data.target)redirect(`/teacher/classes/${parsed.data.offering}?tab=lessons&plan=${data}&saved=1`);
 return {success:parsed.data.is_template?"Template saved.":"Lesson plan saved.",version:parsed.data.expected_version+1};
}
