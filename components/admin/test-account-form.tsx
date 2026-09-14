"use client";
import { useActionState, useId } from "react";
import { createTestAccount } from "@/features/admin/test-accounts";
import { Button } from "@/components/ui/button";
export function TestAccountForm({schoolId,enabled}:{schoolId:string;enabled:boolean}) {
 const [state,action,pending]=useActionState(createTestAccount,{}); const id=useId();
 return <form action={action} className="space-y-4"><input type="hidden" name="school_id" value={schoolId} />
  {!enabled&&<p className="text-sm text-amber-800">Configure the server-only Supabase service-role key to enable test login creation.</p>}
  <div><label htmlFor={`${id}-email`}>Test email</label><input id={`${id}-email`} name="email" type="email" placeholder="teacher@example.test" required maxLength={254} autoComplete="off" /></div>
  <div><label htmlFor={`${id}-password`}>Test password</label><input id={`${id}-password`} name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /><p className="text-xs text-muted mt-1">At least 12 characters. Keep this for the test sign-in.</p></div>
  {state.error&&<p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-teal-800">{state.success}</p>}
  <Button type="submit" disabled={pending||!enabled}>{pending?"Creating…":"Create test login"}</Button>
 </form>;
}
