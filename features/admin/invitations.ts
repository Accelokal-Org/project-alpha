"use server";
import { invitationConfigurationError } from "./invitation-config";
import { createClient as createAuthClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./access";
import { invitationSchema } from "./invitation-schema";
import type { AdminFormState } from "./schema";
export async function inviteAccount(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
 const {client}=await requireAdmin();
 const parsed=invitationSchema.safeParse({school_id:form.get("school_id"),email:form.get("email"),roles:form.getAll("roles"),profile_id:form.get("profile_id")});
 if(!parsed.success) return {error:parsed.error.issues[0]?.message??"Check the invitation details."};
 const configurationError=invitationConfigurationError();
 if(configurationError) return {error:configurationError};
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), url=process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
 const origin=new URL(process.env.APP_URL!.trim()).origin;
 const {school_id,email,roles,profile_id}=parsed.data;
 const args={target_school:school_id,account_email:email,account_roles:roles,profile:profile_id||undefined};
 const {error:preflight}=await client.rpc("admin_invite_access",args);
 if(preflight) return {error:preflight.code==="23505"?"This account already exists. Use Connect a login account to add its school roles.":"Invitation not sent. Check the school, roles, and unlinked profile; make sure the invitation migration is applied."};
 // Elevated client is isolated to Supabase Auth delivery; role writes use the caller's JWT.
 const auth=createAuthClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 let userId:string;
 try {
  const {data,error}=await auth.auth.admin.inviteUserByEmail(email,{redirectTo:`${origin}/auth/accept`});
  if(error||!data.user) return {error:"Could not send the invitation. Check Supabase SMTP/Resend delivery logs and whether the account already exists before retrying."};
  userId=data.user.id;
 } catch {return {error:"The invitation request could not be confirmed. Check Supabase Users and email logs before retrying."};}
 try {
  const {error}=await client.rpc("admin_invite_access",{...args,invited_user:userId});
  if(error) return {error:"Invitation email sent, but role assignment failed. Use Connect a login account for this email to finish assigning access. Do not send another invitation."};
 } catch {return {error:"Invitation email sent, but access could not be confirmed. Review Connected school accounts and finish linking any missing roles."};}
 revalidatePath("/deskonekt/admin");
 return {success:"Invitation sent and school roles assigned. The recipient can open the email to set their password."};
}
