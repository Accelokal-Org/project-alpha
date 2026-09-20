"use server";
import {createClient as createAuthClient} from "@supabase/supabase-js";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireAdmin} from "./access";
import {schoolOnboardingSchema,onboardingResult,onboardingMessages} from "./onboarding-schema";
export type OnboardingState={error?:string;id?:string;school_id?:string;status?:string;message?:string};
export async function setupSchool(_state:OnboardingState,form:FormData):Promise<OnboardingState>{
 const {client}=await requireAdmin();
 const parsed=schoolOnboardingSchema.safeParse(Object.fromEntries(form));
 if(!parsed.success)return {error:parsed.error.issues[0]?.message??"Check the school details."};
 if(form.get("confirmed")!=="on")return {error:"Confirm the school and School Head access before continuing."};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,site=process.env.APP_URL;
 let origin:string;
 try{if(!url||!key||!site)throw new Error();const u=new URL(site);if((u.protocol!=="https:"&&!(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))||u.username||u.password||u.pathname!=="/"||u.search||u.hash)throw new Error();origin=u.origin;}catch{return {error:"Configure the server Supabase key and APP_URL before setting up the school. Invitations use the existing Resend SMTP settings."};}
 let saved:z.infer<typeof onboardingResult>;
 try{
  const {data,error}=await client.rpc("prepare_school_onboarding",parsed.data);
  if(error)return {error:error.code==="42501"?"Superadmin access is required.":error.code==="22023"||error.code==="23505"?"These details conflict with an existing setup. Open it from Recent school setups to continue; use the school settings for changes.":"School setup could not be confirmed. Check Recent school setups before trying again, and make sure the onboarding migration is installed."};
  const result=onboardingResult.safeParse(data);
  if(!result.success)return {error:"School setup could not be confirmed. Check Recent school setups before trying again."};
  saved=result.data;
 }catch{return {error:"Could not confirm whether setup was saved. Refresh Recent school setups before trying again."};}
 const state=(status:string):OnboardingState=>({id:saved.id,school_id:saved.school_id,status,message:onboardingMessages[status]??onboardingMessages.review});
 // Preparation and delivery claims run under the superadmin's JWT; duplicates reuse the same school.
 let claim;
 try{
  const {data,error}=await client.rpc("claim_school_onboarding",{target:saved.id});
  if(error)return {...state("review"),error:"School saved, but head setup could not continue. Review its Accounts tab and your superadmin access."};
  claim=z.object({status:z.string(),email:z.email().optional(),first_name:z.string().optional(),last_name:z.string().optional()}).safeParse(data);
 }catch{return {...state("review"),error:"School saved. The invitation state could not be confirmed; review the saved setup before retrying."};}
 revalidatePath("/deskonekt/admin","layout");
 if(!claim.success)return state("review");
 if(claim.data.status!=="claimed")return state(claim.data.status);
 const delivery=z.object({email:z.email(),first_name:z.string(),last_name:z.string()}).safeParse(claim.data);
 if(!delivery.success)return state("review");
 const auth=createAuthClient(url!,key!,{auth:{persistSession:false,autoRefreshToken:false}});
 let outcome:"invited"|"retry"|"review"="review",invited:string|undefined;
 try{
  const {data,error}=await auth.auth.admin.inviteUserByEmail(delivery.data.email,{redirectTo:`${origin}/auth/accept`,data:{first_name:delivery.data.first_name,last_name:delivery.data.last_name}});
  if(!error&&data.user){outcome="invited";invited=data.user.id;}else if(error?.status===429)outcome="retry";
 }catch{/* An uncertain email request must not be automatically resent. */}
 try{
  const {error}=await client.rpc("finish_school_onboarding",{target:saved.id,outcome,invited_user:invited});
  if(error)return {...state("review"),error:"School saved, but invitation delivery or role assignment needs review. Use Accounts to connect any missing School Head access."};
 }catch{return {...state("review"),error:"School saved. Delivery or role assignment could not be confirmed. Review Accounts before sending another invitation."};}
 revalidatePath("/deskonekt/admin","layout");revalidatePath("/teacher","layout");
 return state(outcome);
}
