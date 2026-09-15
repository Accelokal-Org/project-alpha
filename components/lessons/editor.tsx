"use client";
import {useActionState,useState} from "react";
import {saveLesson} from "@/features/lessons/actions";
import {SubmitButton} from "@/components/ui/submit-button";
import {ActionFeedback} from "@/components/ui/feedback";
import type {Database} from "@/lib/supabase/database.types";
export type Lesson=Pick<Database["public"]["Tables"]["lesson_plans"]["Row"],"id"|"title"|"objectives"|"activities"|"resources"|"lesson_date"|"is_template"|"version">;
export function LessonEditor({offering,plan,source,template=false,canManage,saved=false}:{offering:string;plan:Lesson|null;source:Lesson|null;template?:boolean;canManage:boolean;saved?:boolean}){
 const [state,action,pending]=useActionState(saveLesson,{});
 const [isTemplate,setTemplate]=useState(plan?.is_template??template);
 const [dirty,setDirty]=useState(false);
 const [initialVersion]=useState(plan?.version??0);
 const initial=plan??source;
 return <section className="bg-white border border-border rounded-lg p-5">
  <h2 className="font-semibold text-navy">{plan?(canManage?"Edit ":"")+(plan.is_template?"template":"lesson plan"):template?"New template":"New lesson plan"}</h2>
  {source&&<p className="text-sm text-muted mt-2">Starting from “{source.title}”. Saving creates a separate copy.</p>}
  {!canManage&&<p className="text-sm text-muted mt-2">Read-only. An assigned subject teacher can edit this plan.</p>}
  <form action={action} aria-busy={pending} onChange={()=>setDirty(true)} onSubmit={()=>setDirty(false)} className="space-y-4 mt-4">
   <input type="hidden" name="offering" value={offering}/><input type="hidden" name="target" value={plan?.id??""}/><input type="hidden" name="version" value={state.version??initialVersion}/>
   <fieldset disabled={pending||!canManage} className="space-y-4">
    <div><label htmlFor="lesson-title">Title</label><input id="lesson-title" name="title" defaultValue={initial?.title??""} maxLength={200} required/></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_template" className="!w-4" checked={isTemplate} onChange={e=>setTemplate(e.target.checked)}/>Save as a reusable template</label>
    {!isTemplate&&<div><label htmlFor="lesson-date">Lesson date</label><input id="lesson-date" name="lesson_date" type="date" required defaultValue={plan?.lesson_date??""}/></div>}
    {isTemplate&&<p className="text-xs text-muted">Templates have no date and do not appear in upcoming lessons.</p>}
    <div><label htmlFor="lesson-objectives">Objectives</label><textarea id="lesson-objectives" name="objectives" rows={4} maxLength={10000} defaultValue={initial?.objectives??""} className="w-full border border-border rounded-md p-3"/></div>
    <div><label htmlFor="lesson-activities">Activities</label><textarea id="lesson-activities" name="activities" rows={7} maxLength={20000} defaultValue={initial?.activities??""} className="w-full border border-border rounded-md p-3"/></div>
    <div><label htmlFor="lesson-resources">Resources and references</label><textarea id="lesson-resources" name="resources" rows={4} maxLength={10000} defaultValue={initial?.resources??""} className="w-full border border-border rounded-md p-3"/></div>
   </fieldset>
   <ActionFeedback pending={pending} error={state.error} success={!dirty?(state.success??(saved?"Saved successfully.":undefined)):undefined}/>
   {canManage&&<SubmitButton pendingLabel="Saving…" disabled={pending}>{isTemplate?"Save template":"Save lesson plan"}</SubmitButton>}
   {canManage&&<p className="text-xs text-muted">Save before leaving this page. Plans and templates are visible to authorized staff only.</p>}
  </form>
 </section>;
}
