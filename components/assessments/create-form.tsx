"use client";
import {useActionState} from "react";
import {createAssessment} from "@/features/assessments/actions";
import {SubmitButton} from "@/components/ui/submit-button";
import {ActionFeedback} from "@/components/ui/feedback";
export function CreateAssessmentForm({offering}:{offering:string}){
 const [state,action,pending]=useActionState(createAssessment,{});
 return <section className="bg-white border border-border rounded-lg p-5 mt-5"><h2 className="font-semibold text-navy">Create assessment</h2><form action={action} aria-busy={pending} className="space-y-4 mt-4"><input type="hidden" name="offering" value={offering}/><div><label htmlFor="assessment-title">Title</label><input id="assessment-title" name="title" required maxLength={200} placeholder="e.g. Chapter 1 quiz"/></div><div className="grid sm:grid-cols-2 gap-4"><div><label htmlFor="assessment-date">Assessment date</label><input id="assessment-date" name="assessment_date" type="date" required/></div><div><label htmlFor="max-score">Maximum score</label><input id="max-score" name="max_score" type="number" min="0.01" max="100000" step="0.01" required/></div></div><ActionFeedback pending={pending} error={state.error}/><SubmitButton pendingLabel="Creating…" disabled={pending}>Create draft</SubmitButton></form></section>;
}
