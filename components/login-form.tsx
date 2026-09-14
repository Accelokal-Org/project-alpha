"use client";
import { useActionState } from "react";
import { login, loginAdmin } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
export function LoginForm({ configured, admin = false }: { configured: boolean; admin?: boolean }) {
 const [state, action, pending] = useActionState(admin ? loginAdmin : login, { error: "" });
 return <form action={action} className="space-y-5">
  <div><label htmlFor="email">{admin ? "Superadmin email" : "School email"}</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder={admin ? "Your admin email" : "you@school.edu.ph"} /></div>
  <div><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} /></div>
  {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
  <Button type="submit" className="w-full" disabled={pending || !configured}>{pending ? "Signing in…" : "Sign in"}</Button>
 </form>;
}
