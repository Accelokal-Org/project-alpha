"use client";
import {useActionState,useState} from "react";
import {saveScores,publishScores} from "@/features/assessments/actions";
import {SubmitButton} from "@/components/ui/submit-button";
import {ActionFeedback} from "@/components/ui/feedback";
import type {Database} from "@/lib/supabase/database.types";
import type {RosterStudent} from "@/features/classes/types";
type Assessment=Database["public"]["Tables"]["assessments"]["Row"];
export function ScoreEditor({assessment:a,students,scores,canManage}:{assessment:Assessment;students:RosterStudent[];scores:{student_id:string;score:number}[];canManage:boolean}){
 const [save,saveAction,saving]=useActionState(saveScores,{}),[publish,publishAction,publishing]=useActionState(publishScores,{});
 const [dirty,setDirty]=useState(false);const [savedVersion,setSavedVersion]=useState(a.version);
 // Revalidation delivers the new version. Preserve feedback while resetting unsaved-change tracking.
 if(savedVersion!==a.version){setSavedVersion(a.version);setDirty(false);}
 const published=Boolean(a.published_at),tooLarge=students.length>500||scores.length>500,editable=canManage&&!published&&!tooLarge;
 const values=new Map(scores.map(s=>[s.student_id,s.score]));
 return <section className="border border-border rounded-lg bg-white p-5 mt-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-semibold text-navy">{a.title}</h2><p className="text-sm text-muted mt-2">{a.assessment_date} · Out of {a.max_score}</p></div><span className="text-sm font-medium text-primary">{published?"Published · Read-only":"Draft · Not visible to students"}</span></div>
 <p className="text-sm text-muted my-4">{scores.length} recorded / {students.length} enrolled. Blank means not recorded; zero is a recorded score.</p>
 {tooLarge&&<p role="alert" className="text-red-700 mb-4">This editor supports up to 500 students. Contact your administrator before entering or publishing scores for this class.</p>}
 <form action={saveAction} aria-busy={saving} onChange={()=>setDirty(true)}><input type="hidden" name="target" value={a.id}/><input type="hidden" name="version" value={a.version}/>
 <div className="overflow-auto max-h-[540px]"><table className="w-full"><caption className="sr-only">Assessment scores for {a.title}</caption><thead className="sticky top-0"><tr><th>Student</th><th>Student ID</th><th>Score / {a.max_score}</th></tr></thead><tbody>{students.map(s=><tr key={s.id}><td>{s.name}</td><td className="text-xs text-muted">{s.studentCode}</td><td>{editable?<input key={`${a.version}-${s.id}`} aria-label={`Score for ${s.name}`} name={`score:${s.id}`} type="number" min="0" max={a.max_score} step="0.01" defaultValue={values.get(s.id)??""} disabled={saving||publishing} className="max-w-32"/>:values.get(s.id)??"Not recorded"}</td></tr>)}</tbody></table>{!students.length&&<p className="p-5 text-muted">No students are enrolled in this subject.</p>}</div>
 <div className="mt-4 space-y-3"><ActionFeedback pending={saving} error={published?undefined:save.error} success={published?undefined:save.success}/>{editable&&<SubmitButton pendingLabel="Saving scores…" disabled={saving||publishing||!students.length}>Save draft scores</SubmitButton>}</div></form>
 {editable&&<form action={publishAction} aria-busy={publishing} className="mt-6 pt-5 border-t border-border space-y-4"><input type="hidden" name="target" value={a.id}/><input type="hidden" name="version" value={a.version}/><h3 className="font-semibold">Review and publish</h3><p className="text-sm text-muted">Publish the {scores.length} saved scores. Students without a recorded score receive no result. Published scores cannot be edited in this release.</p>{dirty&&<p role="status" className="text-amber-800">Save your changes before publishing.</p>}<label className="flex items-start gap-2"><input key={a.version} name="confirmed" type="checkbox" required disabled={dirty||saving||publishing}/>I have reviewed the saved scores and want to publish them.</label><ActionFeedback pending={publishing} error={publish.error}/><SubmitButton pendingLabel="Publishing…" disabled={dirty||saving||publishing||scores.length===0}>Publish scores</SubmitButton></form>}
 {published&&<div className="mt-4"><ActionFeedback success={publish.success||"Published scores are available in each student’s portal."}/></div>}
 {!canManage&&!published&&<p className="mt-4 text-muted text-sm">Only an assigned subject teacher can enter and publish scores.</p>}
 </section>;
}
