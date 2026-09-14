"use client";
import { useActionState } from "react";
import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
export function LoginForm({ configured }: { configured: boolean }) {
 const [state, action, pending] = useActionState(login, { error: "" });
 return <form action={action} className="space-y-5">
  <div><label htmlFor="email">School email</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@school.edu.ph" /></div>
  <div><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} /></div>
  {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
  <Button type="submit" className="w-full" disabled={pending || !configured}>{pending ? "Signing in…" : "Sign in"}</Button>
 </form>;
}
