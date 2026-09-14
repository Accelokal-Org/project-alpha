"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loginSchema } from "@/lib/auth/schema";
import { schoolDestination } from "@/lib/auth/destination";
export type LoginState = { error: string };
export async function login(_state: LoginState, form: FormData): Promise<LoginState> {
 return authenticate(form, false);
}
export async function loginAdmin(_state: LoginState, form: FormData): Promise<LoginState> {
 return authenticate(form, true);
}
async function authenticate(form: FormData, adminOnly: boolean): Promise<LoginState> {
 if (!isSupabaseConfigured()) return { error: "School sign-in is not connected yet. Contact your school administrator." };
 const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
 if (!parsed.success) return { error: "Enter a valid email address and password." };
 const client = await createClient();
 try {
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Unable to sign in. Check your details or contact your school administrator." };
 } catch { return { error: "Sign-in is temporarily unavailable. Please try again." }; }
 if (adminOnly) {
  const { data: isManager, error: accessError } = await client.rpc("is_app_manager");
  if (accessError || !isManager) {
   await client.auth.signOut();
   return {error:"This account does not have superadmin access."};
  }
  redirect("/deskonekt/admin");
 }
 redirect(schoolDestination(form.get("next")) ?? (form.get("workspace") === "student" ? "/student" : "/teacher"));
}
export async function logout() {
 const client = await createClient();
 const { error } = await client.auth.signOut();
 if (error) throw new Error("Could not sign out. Please try again.");
 redirect("/login");
}
