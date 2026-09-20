import {randomUUID} from "node:crypto";
import {notFound} from "next/navigation";
import {z} from "zod";
import Link from "@/components/ui/navigation-link";
import {requireAdmin} from "@/features/admin/access";
import {SchoolOnboardingForm} from "@/components/admin/onboarding-form";
export const dynamic="force-dynamic";
export const metadata={title:"Set up school",robots:{index:false,follow:false}};
export default async function SchoolSetup({searchParams}:{searchParams:Promise<{request?:string}>}){
 const {client}=await requireAdmin();const {request}=await searchParams;
 if(request&&!z.uuid().safeParse(request).success)notFound();
 const columns="id,school_id,school_name,head_email,first_name,last_name,status,created_at";
 const {data:recent,error}=await client.from("school_onboarding").select(columns).order("created_at",{ascending:false}).limit(20);
 if(error)throw new Error("School setups could not be loaded. Check that the school-onboarding migration is installed.");
 let initial;
 if(request){const {data,error}=await client.from("school_onboarding").select(columns).eq("id",request).maybeSingle();if(error)throw new Error("Saved school setup could not be loaded.");if(!data)notFound();initial=data;}
 return <main className="max-w-3xl mx-auto p-5 sm:p-8 space-y-6"><Link href="/deskonekt/admin" className="text-sm text-primary">Back to administration</Link><div><p className="text-xs text-muted mb-2">Platform administration</p><h1 className="text-2xl font-semibold text-navy">Set up school</h1><p className="text-sm text-muted mt-2">Create a school and connect its school head in one step.</p></div><SchoolOnboardingForm key={initial?.id??"new"} requestId={initial?.id??randomUUID()} initial={initial}/>{initial&&<Link href="/deskonekt/admin/setup" className="inline-block text-sm text-primary">Set up another school</Link>}<section className="rounded-xl border border-border bg-white overflow-hidden"><h2 className="font-semibold p-5">Recent school setups</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>School</th><th>School head</th><th>Status</th><th>Action</th></tr></thead><tbody>{recent.map(r=><tr key={r.id}><td>{r.school_name}</td><td>{r.first_name} {r.last_name}<br/><span className="text-muted">{r.head_email}</span></td><td>{{pending:"Ready to invite",processing:"Processing / review if interrupted",invited:"Invited and linked",linked:"Existing account linked",retry:"Rate limited",review:"Needs review"}[r.status]??r.status}</td><td><Link className="text-primary" href={`/deskonekt/admin/setup?request=${r.id}`}>Open setup</Link></td></tr>)}</tbody></table></div>{!recent.length&&<p className="px-5 pb-5 text-sm text-muted">No school setups yet.</p>}<p className="p-5 text-xs text-muted">Latest 20 setups. Invitation status confirms the delivery request, not inbox receipt or password setup.</p></section></main>;
}
