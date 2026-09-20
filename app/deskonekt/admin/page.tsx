import { AdminShell } from "@/components/admin/shell";
import { GradeCompletion } from "@/components/grades/completion";
import Link from "@/components/ui/navigation-link";
import { getAdminData } from "@/features/admin/queries";
import { SchoolPanel } from "@/components/admin/school-panel";
import { SchoolSwitcher } from "@/components/admin/school-switcher";
export const dynamic="force-dynamic";
export const metadata={title:"Superadmin",robots:{index:false,follow:false}};
const tabs=["overview","structure","people","subjects","assignments","accounts","attendance","grading","completion","audit"];
export default async function AdminPage({searchParams}:{searchParams:Promise<{school?:string;tab?:string;year?:string;page?:string;status?:string}>}) {
 const params=await searchParams; const d=await getAdminData(params.school); const tab=tabs.includes(params.tab??"")?params.tab!:"overview";
 return <AdminShell schoolId={d.selected?.id}>
  <div className="flex flex-wrap justify-between gap-4 items-end mb-6"><div><p className="text-xs text-muted mb-2">Platform administration</p><h1 className="text-2xl font-semibold text-navy">{d.selected?.name??"Schools"}</h1><p className="text-sm text-muted mt-2">{d.selected?"Configure the school and connect accounts.":"Manage schools and academic records."}</p></div><div className="flex gap-4 items-center text-xs text-muted"><Link href="/deskonekt/admin/setup" className="rounded-lg bg-primary px-4 py-2 text-white text-sm">Set up school</Link><span>Billing · Planned</span></div></div>
  {d.selected ? <>
   <div className="flex flex-wrap gap-3 items-end mb-5"><SchoolSwitcher schools={d.schools} selected={d.selected.id}/><Link className="text-sm text-primary py-2" href="/deskonekt/admin">All schools / add school</Link></div>

   {tab==="completion"?<GradeCompletion school={d.selected.id} query={params} admin/>:<SchoolPanel key={`${d.selected.id}-${tab}`} data={d} tab={tab} />}
  </> : <>
   <p className="text-sm text-muted">Use Set up school to create the school and invite its school head together.</p>
   <section className="bg-white border border-border rounded-lg overflow-hidden mt-6"><h2 className="font-semibold px-5 py-4 border-b border-border">Schools</h2><div className="overflow-auto"><table className="w-full"><caption className="sr-only">Schools available to superadmin</caption><thead><tr><th>Name</th><th>Timezone</th><th>Action</th></tr></thead><tbody>{d.schools.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.timezone}</td><td><Link className="text-primary" href={`/deskonekt/admin?school=${s.id}`}>Configure →</Link></td></tr>)}</tbody></table>{!d.schools.length&&<p className="p-7 text-muted">No schools yet. Choose Set up school to create your first school.</p>}</div></section>
  </>}
  <p className="text-xs text-muted mt-7">Available now: school setup, role connections, assignments, and rosters. Subject assessments and scoring are available in the teacher workspace. Attendance is available in subject workspaces. Grading setup, school calculation rules and teacher grade submission are available. Billing will follow.</p>
 </AdminShell>;
}
