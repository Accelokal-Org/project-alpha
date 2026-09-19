"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export type AccountState={error?:string};
export async function acceptInvitation(_state:AccountState,form:FormData):Promise<AccountState> {
 const token=z.string().min(1).max(2048).safeParse(form.get("token_hash"));
 if(!token.success)return {error:"The invitation link is incomplete. Ask your school administrator for help."};
 if(!isSupabaseConfigured()) return {error:"Account setup is awaiting configuration. Contact your school administrator."};
 const client=await createClient();
 try {
  const {error}=await client.auth.verifyOtp({token_hash:token.data,type:"invite"});
  if(error)return {error:"This invitation has expired or has already been used. If you already set a password, sign in. Otherwise, contact your school administrator."};
 } catch {return {error:"Could not confirm the invitation. Please try again."};}
 redirect("/auth/setup");
}
export async function setAccountPassword(_state:AccountState,form:FormData):Promise<AccountState> {
 const parsed=z.object({password:z.string().min(12,"Use at least 12 characters.").max(128),confirm:z.string()}).refine(v=>v.password===v.confirm,{message:"Passwords must match."}).safeParse({password:form.get("password"),confirm:form.get("confirm")});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 if(!isSupabaseConfigured()) return {error:"Account setup is awaiting configuration. Contact your school administrator."};
 const profile=z.object({first_name:z.string().trim().min(1).max(100),last_name:z.string().trim().min(1).max(100)}).safeParse({first_name:form.get("first_name"),last_name:form.get("last_name")});
 if((form.has("first_name")||form.has("last_name"))&&!profile.success)return {error:"Enter your first and last name (up to 100 characters each)."};
 const client=await createClient();
 const {data,error}=await client.auth.getUser();
 if(error||!data.user)return {error:"Your session expired. Open your invitation again or contact your school administrator."};
 try {
  const {error:saveError}=await client.auth.updateUser({password:parsed.data.password,...(profile.success?{data:profile.data}:{})});
  if(saveError)return {error:"Could not save your password. Check the password requirements and try again."};
 } catch {return {error:"Could not confirm the password change. Please try again."};}
 redirect("/auth/setup?complete=1");
}
