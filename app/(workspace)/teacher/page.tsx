import { UpcomingLessons } from "@/components/lessons/upcoming";
import { AppShell } from "@/components/app-shell";
import { Workspace } from "@/components/workspace";
import { getAssignments } from "@/features/classes/queries";
import { requireSession } from "@/lib/auth/session";
import { isAppManager } from "@/lib/auth/permissions";
export default async function Teacher({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
 const { memberships } = await requireSession();
 const [assignments, params] = await Promise.all([getAssignments(),searchParams]);
 return <AppShell adminAccess={isAppManager(memberships)} active={params.view === "classes" ? "classes" : "workspace"}><Workspace assignments={assignments} classesView={params.view === "classes"} />{params.view!=="classes"&&<UpcomingLessons assignments={assignments}/>}</AppShell>;
}
