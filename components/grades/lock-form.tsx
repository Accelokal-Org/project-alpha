"use client";
import {useActionState,useId} from "react";
import {changeGradeLock} from "@/features/grades/lock-actions";
import {SubmitButton} from "@/components/ui/submit-button";
import {ActionFeedback} from "@/components/ui/feedback";
export function GradeLockForm({target,version,locked}:{target:string;version:number;locked:boolean}){
 const id=useId();const [state,action,pending]=useActionState(changeGradeLock,{});
 return <form action={action} aria-busy={pending} className="bg-white border border-border rounded-lg p-5 space-y-4"><h3 className="font-semibold text-navy">{locked?"Unlock grades":"Lock reviewed grades"}</h3><input type="hidden" name="target" value={target}/><input type="hidden" name="version" value={version}/><input type="hidden" name="operation" value={locked?"unlock":"lock"}/><p className="text-sm text-muted">{locked?"Unlocking restores Reviewed status. Return the submission separately if the teacher needs to correct it.":"Locking prevents further review decisions or resubmission until an adviser unlocks this record. It does not release grades to students."}</p><div><label htmlFor={`${id}-reason`}>{locked?"Unlock reason":"Lock notes (optional)"}</label><textarea id={`${id}-reason`} name="reason" required={locked} maxLength={1000} rows={3} disabled={pending} className="w-full border border-border rounded-md p-3"/></div><label className="flex items-start gap-2 text-sm"><input name="confirmed" type="checkbox" required disabled={pending} className="!w-4 mt-1"/>I reviewed this submission and confirm this {locked?"unlock":"lock"}.</label><ActionFeedback pending={pending} error={state.error} success={state.success}/><SubmitButton pendingLabel="Saving…" disabled={pending}>{locked?"Unlock grades":"Lock grades"}</SubmitButton></form>;
}
