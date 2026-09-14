import { AppShell } from "@/components/app-shell";
import { RosterWorkspace } from "@/components/roster-workspace";
import { getAssignmentRoster } from "@/features/classes/queries";
export default async function ClassRoster({ params }: { params: Promise<{ id: string }> }) {
 const { assignment, students } = await getAssignmentRoster((await params).id);
 return <AppShell active="classes"><RosterWorkspace assignment={assignment} students={students} /></AppShell>;
}
