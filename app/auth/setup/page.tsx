import Link from "@/components/ui/navigation-link";
import { createClient } from "@/lib/supabase/server";
import { AccountPasswordForm } from "@/components/account-setup-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export default async function Setup({searchParams}:{searchParams:Promise<{complete?:string}>}) {
 if(!isSupabaseConfigured()) return <><h1 className="text-2xl font-semibold">Open your invitation</h1><p className="mt-3 text-muted">Account setup is awaiting configuration. Contact your school administrator.</p></>;
 const client=await createClient();const {data,error}=await client.auth.getUser();const {complete}=await searchParams;
 if(error||!data.user)return <><h1 className="text-2xl font-semibold">Open your invitation</h1><p className="mt-3 text-muted">Use the invitation in your email to confirm your account before setting a password.</p></>;
 return <><h1 className="text-2xl font-semibold text-navy">{complete==="1"?"Choose your workspace":"Set up your account"}</h1><p className="mt-3 text-sm text-muted">{data.user.email}</p>{complete==="1"?<div className="flex flex-col gap-3 mt-6"><Link href="/teacher" className="text-primary">Open teacher workspace →</Link><Link href="/student" className="text-primary">Open student portal →</Link></div>:<AccountPasswordForm firstName={typeof data.user.user_metadata?.first_name==="string"?data.user.user_metadata.first_name:""} lastName={typeof data.user.user_metadata?.last_name==="string"?data.user.user_metadata.last_name:""}/>}</>;
}
