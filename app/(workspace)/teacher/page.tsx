import Link from "@/components/ui/navigation-link";
import { SchoolGradingWorkspace } from "@/components/grading/school-workspace";
import { UpcomingLessons } from "@/components/lessons/upcoming";
import { AppShell } from "@/components/app-shell";
import { Workspace } from "@/components/workspace";
import { getAssignments } from "@/features/classes/queries";
import { requireSession } from "@/lib/auth/session";
import { isAppManager } from "@/lib/auth/permissions";
export default async function Teacher({ searchParams }: { searchParams: Promise<{ view?: string; school?: string; year?:string; page?:string; status?:string }> }) {
 const { memberships } = await requireSession();
 const [assignments, params] = await Promise.all([getAssignments(),searchParams]);
 if(params.view==="grading"||params.view==="completion") return <AppShell adminAccess={isAppManager(memberships)} active="workspace"><SchoolGradingWorkspace school={params.school} completion={params.view==="completion"} query={params}/></AppShell>;
 return <AppShell adminAccess={isAppManager(memberships)} active={params.view === "classes" ? "classes" : "workspace"}>{(isAppManager(memberships)||memberships.some(m=>m.role==="SCHOOL_HEAD"))&&<Link href="/teacher?view=grading" className="text-sm text-primary inline-block mb-5">School grading setup</Link>}<Workspace assignments={assignments} classesView={params.view === "classes"} />{params.view!=="classes"&&<UpcomingLessons assignments={assignments}/>}</AppShell>;
}
