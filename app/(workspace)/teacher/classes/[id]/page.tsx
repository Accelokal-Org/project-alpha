import { AppShell } from "@/components/app-shell";
import { RosterWorkspace } from "@/components/roster-workspace";
import { getAssignmentRoster } from "@/features/classes/queries";
import { AssessmentWorkspace } from "@/components/assessments/workspace";
import { AttendanceWorkspace } from "@/components/attendance/workspace";
export default async function ClassRoster({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{tab?:string;assessment?:string;date?:string}> }) {
 const { assignment, students } = await getAssignmentRoster((await params).id);
 const query=await searchParams;
 return <AppShell active="classes"><RosterWorkspace assignment={assignment} students={students} attendanceContent={assignment.kind==="Subject"&&query.tab==="attendance"?<AttendanceWorkspace offering={assignment.id} schoolId={assignment.schoolId} date={query.date} students={students}/>:undefined} assessmentContent={assignment.kind==="Subject"&&query.tab==="assessments"?<AssessmentWorkspace offering={assignment.id} selected={query.assessment} students={students}/>:undefined} /></AppShell>;
}
