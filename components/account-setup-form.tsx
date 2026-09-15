"use client";
import { useActionState } from "react";
import { acceptInvitation, setAccountPassword } from "@/app/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionFeedback } from "@/components/ui/feedback";
export function AcceptInvitationForm({token}:{token:string}) {
 const [state,action,pending]=useActionState(acceptInvitation,{});
 return <form aria-busy={pending} action={action} className="space-y-4 mt-6"><input type="hidden" name="token_hash" value={token}/><ActionFeedback pending={pending} error={state.error}/><SubmitButton pendingLabel="Confirming…" disabled={pending}>{pending?"Confirming…":"Accept invitation"}</SubmitButton></form>;
}
export function AccountPasswordForm() {
 const [state,action,pending]=useActionState(setAccountPassword,{});
 return <form aria-busy={pending} action={action} className="space-y-4 mt-6"><div><label htmlFor="password">Choose a password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><p className="text-xs text-muted mt-1">Use at least 12 characters.</p></div><div><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></div><ActionFeedback pending={pending} error={state.error}/><SubmitButton pendingLabel="Saving…" disabled={pending}>{pending?"Saving…":"Set password"}</SubmitButton></form>;
}
