"use client";
import { useActionState, useId, useState } from "react";
import { inviteAccount } from "@/features/admin/invitations";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionFeedback } from "@/components/ui/feedback";
export function InvitationForm({schoolId,teachers,students,configurationError}:{configurationError?:string;schoolId:string;teachers:{id:string;display_name:string;user_id:string|null}[];students:{id:string;display_name:string;user_id:string|null}[]}) {
 const [state,action,pending]=useActionState(inviteAccount,{});const id=useId();
 const [roles,setRoles]=useState<string[]>(["TEACHER"]);
 const student=roles.includes("STUDENT"), needsProfile=student||roles.includes("TEACHER")||roles.includes("ADVISER");
 const profiles=(student?students:teachers).filter(p=>!p.user_id);
 return <section className="border border-border bg-white rounded-lg p-5"><h2 className="font-semibold text-navy">Invite a new account</h2><p className="text-xs text-muted mt-2">Choose school access now. An email will let the recipient set their own password. Create their profile in People first if needed.</p><form aria-busy={pending} action={action} className="space-y-4 mt-4">
 <input type="hidden" name="school_id" value={schoolId}/>
 <div><label htmlFor={`${id}-email`}>Email</label><input id={`${id}-email`} name="email" type="email" required maxLength={254}/></div>
 <fieldset><legend className="text-sm font-medium mb-2">School roles</legend><div className="flex flex-wrap gap-4">{[["TEACHER","Teacher"],["ADVISER","Adviser"],["SCHOOL_HEAD","School head"],["STUDENT","Student"]].map(([value,label])=><label key={value} className="flex items-center gap-2"><input type="checkbox" name="roles" value={value} checked={roles.includes(value)} onChange={e=>setRoles(current=>e.target.checked?(value==="STUDENT"?[value]:[...current.filter(r=>r!=="STUDENT"),value]):current.filter(r=>r!==value))}/>{label}</label>)}</div></fieldset>
 {needsProfile?<div><label htmlFor={`${id}-profile`}>{student?"Student":"Teacher"} profile</label><select key={student?"student":"teacher"} id={`${id}-profile`} name="profile_id" required className="w-full" defaultValue=""><option value="">Choose an unlinked profile…</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></div>:<input type="hidden" name="profile_id" value=""/>}

 <ActionFeedback pending={pending} error={configurationError||state.error} success={state.success}/><SubmitButton pendingLabel="Sending invitation…" disabled={!!configurationError||pending||!roles.length||(needsProfile&&!profiles.length)}>{pending?"Sending invitation…":"Create account & send invite"}</SubmitButton>
 </form></section>;
}
