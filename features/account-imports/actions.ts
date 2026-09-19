"use server";
import {createClient as createAuthClient} from "@supabase/supabase-js";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireSession} from "@/lib/auth/session";
import {isAppManager} from "@/lib/auth/permissions";
import {parseImport} from "./schema";
import type {Database} from "@/lib/supabase/database.types";
export type ImportState={error?:string};
export async function prepareAccounts(_state:ImportState,form:FormData):Promise<ImportState>{
 const {client,memberships}=await requireSession();
 const school=z.uuid().safeParse(form.get("school"));
 if(!school.success||(!isAppManager(memberships)&&!memberships.some(m=>m.school_id===school.data&&m.role==="SCHOOL_HEAD")))return {error:"School head access required."};
 if(form.get("confirmed")!=="on")return {error:"Review and confirm the user list first."};
 let entries;try{const csv=form.get("csv");if(typeof csv!=="string")throw new Error("Upload a CSV first.");entries=parseImport(csv);}catch(e){return {error:e instanceof Error?e.message:"Check the CSV."};}
 const {data,error}=await client.rpc("prepare_school_accounts",{target_school:school.data,entries});
 if(error)return {error:error.code==="23505"?"An email or username already exists. No rows were imported. Review existing school accounts/profiles, remove duplicates from the file, and try again.":"No users were imported. Check your school access and that the account-import migration is installed."};
 revalidatePath("/teacher","layout");
 redirect(`/teacher?view=accounts&school=${school.data}&batch=${data}`);
}
export async function sendImportedInvitation(id:string):Promise<{status:string;message:string}>{
 const {client,user,memberships}=await requireSession();
 if(!isAppManager(memberships)&&!memberships.some(m=>m.role==="SCHOOL_HEAD"))return {status:"review",message:"School head access required."};
 if(!z.uuid().safeParse(id).success)return {status:"review",message:"Invalid invitation."};
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL,site=process.env.APP_URL;
 let origin:string;
 try{if(!key||!url||!site)throw new Error();const u=new URL(site);if((u.protocol!=="https:"&&!(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))||u.username||u.password||u.pathname!=="/"||u.search||u.hash)throw new Error();origin=u.origin;}catch{return {status:"configuration",message:"Configure APP_URL, the Supabase server key, and Resend SMTP before sending."};}
 // Each row is claimed under the caller's JWT; only the delivery server can finish it.
 const {data,error}=await client.rpc("claim_school_invitation",{target:id});
 if(error)return {status:"review",message:"Already processed, awaiting review, or school access changed. Refresh the list."};
 const row=z.object({email:z.email(),first_name:z.string(),last_name:z.string()}).safeParse(data);
 if(!row.success)return {status:"review",message:"An account with this email exists. Ask the superadmin to connect the prepared profile; no invitation sent."};
 const auth=createAuthClient<Database>(url!,key!,{auth:{persistSession:false,autoRefreshToken:false}});
 let outcome:"sent"|"retry"|"review"="review",invited:string|undefined;
 try{
  const result=await auth.auth.admin.inviteUserByEmail(row.data.email,{redirectTo:`${origin}/auth/accept`,data:{first_name:row.data.first_name,last_name:row.data.last_name}});
  if(!result.error&&result.data.user){outcome="sent";invited=result.data.user.id;}
  else if(result.error?.status===429)outcome="retry";
 }catch{/* Delivery may have succeeded. Do not automatically resend an uncertain request. */}
 try{
  const {error:finishError}=await auth.rpc("finish_school_invitation",{target:id,actor:user.id,outcome,invited_user:invited});
  if(finishError)return {status:"review",message:"Delivery or account linking needs superadmin review. Check Supabase Users and connect any missing school access before retrying."};
 }catch{return {status:"review",message:"Delivery status could not be confirmed. Ask the superadmin to review this account before resending."};}
 revalidatePath("/teacher","layout");
 return {status:outcome,message:outcome==="sent"?"Invitation accepted for delivery; profile and school role linked.":outcome==="retry"?"Email rate limit reached. Wait before resuming this batch.":"Delivery needs review. Check Supabase Users and Resend logs; no automatic resend."};
}
