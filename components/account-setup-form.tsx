"use client";
import { useActionState } from "react";
import { acceptInvitation, setAccountPassword } from "@/app/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionFeedback } from "@/components/ui/feedback";
export function AcceptInvitationForm({token}:{token:string}) {
 const [state,action,pending]=useActionState(acceptInvitation,{});
 return <form aria-busy={pending} action={action} className="space-y-4 mt-6"><input type="hidden" name="token_hash" value={token}/><ActionFeedback pending={pending} error={state.error}/><SubmitButton pendingLabel="Confirming…" disabled={pending}>{pending?"Confirming…":"Accept invitation"}</SubmitButton></form>;
}
export function AccountPasswordForm({firstName="",lastName=""}:{firstName?:string;lastName?:string}) {
 const [state,action,pending]=useActionState(setAccountPassword,{});
 return <form aria-busy={pending} action={action} className="space-y-4 mt-6"><div><label htmlFor="first_name">First name</label><input id="first_name" name="first_name" autoComplete="given-name" defaultValue={firstName} required maxLength={100}/></div><div><label htmlFor="last_name">Last name</label><input id="last_name" name="last_name" autoComplete="family-name" defaultValue={lastName} required maxLength={100}/><p className="text-xs text-muted mt-1">Your account profile name. Contact your school to correct the name on academic records.</p></div><div><label htmlFor="password">Choose a password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><p className="text-xs text-muted mt-1">Use at least 12 characters.</p></div><div><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></div><ActionFeedback pending={pending} error={state.error}/><SubmitButton pendingLabel="Saving…" disabled={pending}>{pending?"Saving…":"Save profile and password"}</SubmitButton></form>;
}
