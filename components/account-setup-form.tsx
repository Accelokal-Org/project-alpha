"use client";
import { useActionState } from "react";
import { acceptInvitation, setAccountPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
export function AcceptInvitationForm({token}:{token:string}) {
 const [state,action,pending]=useActionState(acceptInvitation,{});
 return <form action={action} className="space-y-4 mt-6"><input type="hidden" name="token_hash" value={token}/>{state.error&&<p role="alert" className="text-sm text-red-700">{state.error}</p>}<Button disabled={pending}>{pending?"Confirming…":"Accept invitation"}</Button></form>;
}
export function AccountPasswordForm() {
 const [state,action,pending]=useActionState(setAccountPassword,{});
 return <form action={action} className="space-y-4 mt-6"><div><label htmlFor="password">Choose a password</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><p className="text-xs text-muted mt-1">Use at least 12 characters.</p></div><div><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></div>{state.error&&<p role="alert" className="text-sm text-red-700">{state.error}</p>}<Button disabled={pending}>{pending?"Saving…":"Set password"}</Button></form>;
}
