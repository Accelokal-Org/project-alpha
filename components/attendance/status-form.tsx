"use client";
import {useActionState,useId} from "react";
import {configureStatus} from "@/features/attendance/actions";
import {SubmitButton} from "@/components/ui/submit-button";
import {ActionFeedback} from "@/components/ui/feedback";
export function StatusForm({schoolId,status}:{schoolId:string;status?:{code:string;label:string;active:boolean}}){
 const [state,action,pending]=useActionState(configureStatus,{});const id=useId();
 return <section className="border border-border rounded-lg bg-white p-5"><h3 className="font-semibold">{status?status.code:"Add status"}</h3><form action={action} aria-busy={pending} className="mt-4 space-y-3"><input type="hidden" name="school_id" value={schoolId}/><div><label htmlFor={`${id}-code`}>Code</label><input id={`${id}-code`} name="code" required pattern="[A-Z][A-Z0-9_]{0,19}" maxLength={20} defaultValue={status?.code} readOnly={Boolean(status)} placeholder="PRESENT"/></div><div><label htmlFor={`${id}-label`}>Label</label><input id={`${id}-label`} name="label" required maxLength={60} defaultValue={status?.label} placeholder="Present"/></div><label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={status?.active??true}/>Available for new entries</label><ActionFeedback pending={pending} error={state.error} success={state.success}/><SubmitButton pendingLabel="Saving status…" disabled={pending}>Save status</SubmitButton></form></section>;
}
