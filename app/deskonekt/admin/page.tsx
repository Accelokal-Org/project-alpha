import Link from "next/link";
import Image from "next/image";
import { getAdminData } from "@/features/admin/queries";
import { SetupForm } from "@/components/admin/setup-form";
import { SchoolPanel } from "@/components/admin/school-panel";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";
import { brand } from "@/lib/brand";
export const dynamic="force-dynamic";
export const metadata={title:"Superadmin",robots:{index:false,follow:false}};
const tabs=["overview","structure","people","subjects","assignments","accounts","checks","audit"];
export default async function AdminPage({searchParams}:{searchParams:Promise<{school?:string;tab?:string}>}) {
 const params=await searchParams; const d=await getAdminData(params.school); const tab=tabs.includes(params.tab??"")?params.tab!:"overview";
 return <div className="min-h-screen"><a href="#admin-main" className="sr-only focus:not-sr-only">Skip to administration</a><header className="bg-white border-b border-border px-5 sm:px-8 py-3 flex justify-between items-center gap-4"><Link href="/deskonekt/admin" className="flex gap-3 items-center"><Image src="/brand/deskonekt-icon-light.png" width={404} height={394} alt="" className="w-10 h-auto" sizes="40px" /><div><span className="text-lg font-semibold text-navy">{brand.name}</span><p className="text-[11px] text-muted">Superadmin · {brand.byline}</p></div></Link><div className="flex items-center gap-4"><span className="hidden sm:block text-xs text-muted">{d.user.email}</span><form action={logout}><Button variant="outline" size="sm">Sign out</Button></form></div></header>
 <main id="admin-main" className="max-w-7xl mx-auto p-5 sm:p-8">
  <div className="flex flex-wrap justify-between gap-4 items-end mb-6"><div><p className="text-xs text-muted mb-2">Platform administration</p><h1 className="text-2xl font-semibold text-navy">{d.selected?.name??"Schools & testing"}</h1><p className="text-sm text-muted mt-2">{d.selected?"Configure the school, connect accounts, and verify the foundation.":"Create schools and test the current Deskonekt workflows."}</p></div><div className="flex gap-4 text-xs text-muted"><span>Invite emails · Planned</span><span>Billing · Planned</span></div></div>
  {d.selected ? <>
   <form method="get" className="flex flex-wrap gap-3 items-end mb-5"><div className="flex-1 max-w-md"><label htmlFor="school">School</label><select id="school" name="school" defaultValue={d.selected.id} className="w-full">{d.schools.map(s=><option key={s.id} value={s.id}>{s.name}{s.is_test?" (test)":""}</option>)}</select></div><Button variant="outline" type="submit">Open school</Button><Link className="text-sm text-primary py-2" href="/deskonekt/admin">All schools / add school</Link></form>
   <nav aria-label="School administration" className="flex overflow-x-auto border-b border-border mb-6 gap-5">{tabs.map(t=><Link key={t} href={`/deskonekt/admin?school=${d.selected!.id}&tab=${t}`} aria-current={tab===t?"page":undefined} className={`py-3 text-sm capitalize whitespace-nowrap border-b-2 ${tab===t?"border-primary text-primary font-semibold":"border-transparent text-muted"}`}>{t}</Link>)}</nav>
   <SchoolPanel key={`${d.selected.id}-${tab}`} data={d} tab={tab} canCreateTestAccounts={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)} />
  </> : <>
   <div className="grid md:grid-cols-2 gap-5"><SetupForm operation="create_school" title="Add a school" description="Start with an empty school and configure it using the admin tabs." fields={[{name:"name",label:"School name"},{name:"timezone",label:"Timezone",value:"Asia/Manila"}]} submit="Create school" /><SetupForm operation="create_test_school" title="Create test school" description="Creates a separate fictional school with a school year, two classes, two teachers, two subjects, twelve students, and enrollments. Login accounts are connected separately." fields={[{name:"name",label:"Test school name",value:"Deskonekt Test School"},{name:"timezone",label:"Timezone",value:"Asia/Manila"}]} submit="Create test school" /></div>
   <section className="bg-white border border-border rounded-lg overflow-hidden mt-6"><h2 className="font-semibold px-5 py-4 border-b border-border">Schools</h2><div className="overflow-auto"><table className="w-full"><caption className="sr-only">Schools available to superadmin</caption><thead><tr><th>Name</th><th>Timezone</th><th>Type</th><th>Action</th></tr></thead><tbody>{d.schools.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.timezone}</td><td>{s.is_test?"Test school":"School"}</td><td><Link className="text-primary" href={`/deskonekt/admin?school=${s.id}`}>Configure →</Link></td></tr>)}</tbody></table>{!d.schools.length&&<p className="p-7 text-muted">No schools yet. Create your first school above.</p>}</div></section>
  </>}
  <p className="text-xs text-muted mt-7">Available now: school setup, role connections, assignments, and roster checks. Assessment, attendance, grade workflows, invitations, and billing will be added in later milestones.</p>
 </main></div>;
}
