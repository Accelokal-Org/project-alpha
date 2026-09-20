import { SchoolAccounts } from "@/components/account-imports/workspace";
import { SchoolGradingWorkspace } from "@/components/grading/school-workspace";
import { UpcomingLessons } from "@/components/lessons/upcoming";
import { AppShell } from "@/components/app-shell";
import { Workspace } from "@/components/workspace";
import { getAssignments } from "@/features/classes/queries";
export default async function Teacher({ searchParams }: { searchParams: Promise<{ view?: string; school?: string; year?:string; page?:string; status?:string; batch?:string }> }) {
 const [assignments, params] = await Promise.all([getAssignments(),searchParams]);
 if(params.view==="accounts") return <AppShell schoolId={params.school}><SchoolAccounts school={params.school} batch={params.batch}/></AppShell>;
 if(params.view==="grading"||params.view==="completion") return <AppShell schoolId={params.school}><SchoolGradingWorkspace school={params.school} completion={params.view==="completion"} query={params}/></AppShell>;
 return <AppShell><Workspace assignments={assignments} classesView={params.view === "classes"} />{params.view!=="classes"&&<UpcomingLessons assignments={assignments}/>}</AppShell>;
}
