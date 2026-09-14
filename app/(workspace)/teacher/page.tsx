import { AppShell } from "@/components/app-shell";
import { Workspace } from "@/components/workspace";
import { getAssignments } from "@/features/classes/queries";
export default async function Teacher({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
 const [assignments, params] = await Promise.all([getAssignments(),searchParams]);
 return <AppShell active={params.view === "classes" ? "classes" : "workspace"}><Workspace assignments={assignments} classesView={params.view === "classes"} /></AppShell>;
}
