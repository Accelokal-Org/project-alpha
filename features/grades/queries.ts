import "server-only";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireSession} from "@/lib/auth/session";
import {previewSchema} from "./schema";
export async function getPeriodGrades(offering:string,period?:string,revision?:string){
 const {client}=await requireSession();
 if(revision&&!/^[1-9][0-9]{0,8}$/.test(revision))notFound();
 if(period&&!z.uuid().safeParse(period).success)notFound();
 const [options,access,history,reviewAccess]=await Promise.all([
  client.rpc("grade_period_options",{offering}),
  client.rpc("can_manage_assessments",{offering}),
  client.from("grade_submissions").select("id,period_id,submitted_at,status").eq("offering_id",offering).order("submitted_at",{ascending:false}).limit(12),
  client.rpc("can_review_grades",{offering}),
 ]);
 if(options.error||access.error||history.error||reviewAccess.error)throw new Error("Grades could not be loaded. Check the grade-submission database setup and try again.");
 const selected=period?options.data.find(p=>p.id===period):null;
 if(period&&!selected)notFound();
 const submission=period?await client.from("grade_submissions").select("id,snapshot,submitted_at,status,revision,review_version,return_reason").eq("offering_id",offering).eq("period_id",period).maybeSingle():null;
 if(submission?.error)throw new Error("Submitted grades could not be loaded.");
 const versions=submission?.data?await client.from("grade_submission_versions").select("revision,submitted_at,correction_note").eq("submission_id",submission.data.id).order("revision",{ascending:false}).limit(50):null;
 const events=submission?.data?await client.from("grade_review_events").select("id,revision,action,reason,created_at").eq("submission_id",submission.data.id).order("created_at",{ascending:false}).limit(50):null;
 const archived=revision&&submission?.data?await client.from("grade_submission_versions").select("snapshot,submitted_at").eq("submission_id",submission.data.id).eq("revision",Number(revision)).maybeSingle():null;
 if(versions?.error||events?.error||archived?.error)throw new Error("Submission history could not be loaded.");
 if(revision&&!archived?.data)notFound();
 const live=period&&!revision&&(!submission?.data||submission.data.status==="returned")?await client.rpc("preview_period_grades",{offering,period}):null;
 if(live?.error)throw new Error(live.error.code==="22023"?"Grade review requires valid school calculation settings and supports up to 500 students, 500 assessments and 50,000 student-assessment entries per period.":"Grade calculations could not be loaded. Try again.");
 const raw=archived?.data?.snapshot??live?.data??submission?.data?.snapshot;
 return {options:options.data,history:history.data,selected,canSubmit:access.data===true,preview:raw?previewSchema.parse(raw):null,submittedAt:archived?.data?.submitted_at??(live?null:submission?.data?.submitted_at??null),submission:submission?.data??null,versions:versions?.data??[],events:events?.data??[],historical:Boolean(revision),canReview:reviewAccess.data===true};
}
