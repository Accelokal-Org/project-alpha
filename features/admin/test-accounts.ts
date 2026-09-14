"use server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "./access";
import { testAccountSchema, type AdminFormState } from "./schema";
export async function createTestAccount(_state:AdminFormState, form:FormData):Promise<AdminFormState> {
 const {client}=await requireAdmin();
 const parsed=testAccountSchema.safeParse(Object.fromEntries(form.entries()));
 if(!parsed.success) return {error:parsed.error.issues[0]?.message??"Check the account details."};
 const {school_id,email,password}=parsed.data;
 const {data:school,error:schoolError}=await client.from("schools").select("id,is_test").eq("id",school_id).eq("is_test",true).maybeSingle();
 if(schoolError||!school) return {error:"Choose a fictional test school first."};
 const {data:authorized,error:accessError}=await client.rpc("is_app_manager");
 if(accessError||!authorized) return {error:"Superadmin access is required."};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) return {error:"Test login creation needs the server-only Supabase service-role key."};
 // Elevated client is limited to Auth provisioning after authorization. School data
 // and audit writes still use the caller's session and manager-checked RPCs.
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
 if(error||!data.user) return {error:"Could not create this test login. The email may already be registered."};
 const {error:auditError}=await client.rpc("admin_record_test_account",{target_school:school_id,target_user:data.user.id});
 if(auditError) {
  const {error:cleanupError}=await admin.auth.admin.deleteUser(data.user.id);
  return {error:cleanupError?"The login was created without school access, but setup could not finish. Review Auth users before retrying.":"Setup could not finish. The new login was removed; please try again."};
 }
 return {success:`Test login created for ${email}. Connect it to a school role and profile using the form alongside. No email was sent.`};
}
