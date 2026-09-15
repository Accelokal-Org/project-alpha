import "server-only";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireSession} from "@/lib/auth/session";
const fields="id,offering_id,title,objectives,activities,resources,lesson_date,is_template,version";
export async function getLessons(offering:string,schoolId:string,selected?:string,source?:string){
 const {client}=await requireSession();
 for(const id of [selected,source])if(id&&!z.uuid().safeParse(id).success)notFound();
 const [list,templates,access,detail,copy]=await Promise.all([
  client.from("lesson_plans").select("id,title,lesson_date,is_template").eq("offering_id",offering).order("updated_at",{ascending:false}).limit(100),
  client.from("lesson_plans").select("id,title,offering_id").eq("school_id",schoolId).eq("is_template",true).order("title").limit(100),
  client.rpc("can_manage_lessons",{offering}),
  selected?client.from("lesson_plans").select(fields).eq("offering_id",offering).eq("id",selected).maybeSingle():null,
  source?client.from("lesson_plans").select(fields).eq("school_id",schoolId).eq("id",source).maybeSingle():null,
 ]);
 if(list.error||templates.error||access.error||detail?.error||copy?.error)throw new Error("Lesson plans could not be loaded. Check the lesson-plan database setup and try again.");
 if(selected&&!detail?.data||source&&!copy?.data)notFound();
 return {list:list.data,templates:templates.data,canManage:access.data===true,selected:detail?.data??null,source:copy?.data??null};
}
export async function getUpcomingLessons(){
 const {client}=await requireSession();
 const {data,error}=await client.rpc("my_upcoming_lessons");
 if(error)throw new Error("Upcoming lessons could not be loaded. Check the lesson-plan database setup and try again.");
 return data;
}
