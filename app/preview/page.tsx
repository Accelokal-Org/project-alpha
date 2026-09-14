import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Workspace } from "@/components/workspace";
import { RosterWorkspace } from "@/components/roster-workspace";
import { previewAssignments, previewRoster } from "@/features/classes/preview";
export default async function Preview({ searchParams }: { searchParams: Promise<{ assignment?: string; view?: string }> }) {
 const params = await searchParams;
 const assignment = params.assignment ? previewAssignments.find(a => a.id === params.assignment) : undefined;
 if (params.assignment && !assignment) notFound();
 return <AppShell preview name="Andrea Reyes" active={assignment || params.view === "classes" ? "classes" : "workspace"}>{assignment ? <RosterWorkspace assignment={assignment} students={previewRoster(assignment.classId)} preview /> : <Workspace assignments={previewAssignments} preview classesView={params.view === "classes"} />}</AppShell>;
}
