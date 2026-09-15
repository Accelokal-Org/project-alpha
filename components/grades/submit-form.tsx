"use client";
import {useActionState} from "react";
import {submitGrades} from "@/features/grades/actions";
import {SubmitButton} from "@/components/ui/submit-button";
import {ActionFeedback} from "@/components/ui/feedback";
export function GradeSubmitForm({offering,period,token}:{offering:string;period:string;token:string}){
 const [state,action,pending]=useActionState(submitGrades,{});
 return <form action={action} aria-busy={pending} className="space-y-4 border border-border rounded-lg bg-white p-5"><h3 className="font-semibold text-navy">Review and submit</h3><input type="hidden" name="offering" value={offering}/><input type="hidden" name="period" value={period}/><input type="hidden" name="token" value={token}/><p className="text-sm text-muted">Submission saves these calculated grades and their component breakdowns as a fixed record for authorized staff. It does not release grades to students. Later source-score changes do not change this submission.</p><p className="text-sm text-muted">Your first submission fixes the grading scheme for this subject. Your adviser can return the submission for correction; earlier revisions remain available.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmed" required disabled={pending} className="!w-4 mt-1"/>I reviewed the students, assessment classifications, calculation rule and grades, and am ready to submit.</label><ActionFeedback pending={pending} error={state.error} success={state.success}/><SubmitButton pendingLabel="Submitting grades…" disabled={pending}>Submit period grades</SubmitButton></form>;
}
