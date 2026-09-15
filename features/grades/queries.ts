import "server-only";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireSession} from "@/lib/auth/session";
import {previewSchema} from "./schema";
export async function getPeriodGrades(offering:string,period?:string){
 const {client}=await requireSession();
 if(period&&!z.uuid().safeParse(period).success)notFound();
 const [options,access,history]=await Promise.all([
  client.rpc("grade_period_options",{offering}),
  client.rpc("can_manage_assessments",{offering}),
  client.from("grade_submissions").select("id,period_id,submitted_at").eq("offering_id",offering).order("submitted_at",{ascending:false}).limit(12),
 ]);
 if(options.error||access.error||history.error)throw new Error("Grades could not be loaded. Check the grade-submission database setup and try again.");
 const selected=period?options.data.find(p=>p.id===period):null;
 if(period&&!selected)notFound();
 const submission=period?await client.from("grade_submissions").select("snapshot,submitted_at").eq("offering_id",offering).eq("period_id",period).maybeSingle():null;
 if(submission?.error)throw new Error("Submitted grades could not be loaded.");
 const live=period&&!submission?.data?await client.rpc("preview_period_grades",{offering,period}):null;
 if(live?.error)throw new Error(live.error.code==="22023"?"Grade review requires valid school calculation settings and supports up to 500 students, 500 assessments and 50,000 student-assessment entries per period.":"Grade calculations could not be loaded. Try again.");
 const raw=submission?.data?.snapshot??live?.data;
 return {options:options.data,history:history.data,selected,canSubmit:access.data===true,preview:raw?previewSchema.parse(raw):null,submittedAt:submission?.data?.submitted_at??null};
}
