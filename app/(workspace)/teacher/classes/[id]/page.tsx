import { ReportCardWorkspace } from "@/components/report-cards/workspace";
import { AdviserGradeWorkspace } from "@/components/grades/adviser-workspace";
import { GradeWorkspace } from "@/components/grades/workspace";
import { LessonWorkspace } from "@/components/lessons/workspace";
import { AppShell } from "@/components/app-shell";
import { RosterWorkspace } from "@/components/roster-workspace";
import { getAssignmentRoster } from "@/features/classes/queries";
import { AssessmentWorkspace } from "@/components/assessments/workspace";
import { AttendanceWorkspace } from "@/components/attendance/workspace";
export default async function ClassRoster({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{tab?:string;assessment?:string;date?:string;plan?:string;source?:string;new?:string;template?:string;saved?:string;grading?:string;period?:string;revision?:string;student?:string}> }) {
 const { assignment, students } = await getAssignmentRoster((await params).id);
 const query=await searchParams;
 return <AppShell active="classes"><RosterWorkspace assignment={assignment} students={students} reportContent={assignment.kind==="Advisory"&&query.tab==="report-cards"?<ReportCardWorkspace classId={assignment.classId} students={students} student={query.student}/>:undefined} gradeContent={query.tab==="grades"?(assignment.kind==="Subject"?<GradeWorkspace offering={assignment.id} period={query.period} revision={query.revision}/>:<AdviserGradeWorkspace classId={assignment.classId}/>):undefined} lessonContent={assignment.kind==="Subject"&&query.tab==="lessons"?<LessonWorkspace offering={assignment.id} schoolId={assignment.schoolId} query={query}/>:undefined} attendanceContent={assignment.kind==="Subject"&&query.tab==="attendance"?<AttendanceWorkspace offering={assignment.id} schoolId={assignment.schoolId} date={query.date} students={students}/>:undefined} assessmentContent={assignment.kind==="Subject"&&query.tab==="assessments"?<AssessmentWorkspace grading={query.grading==="1"} offering={assignment.id} selected={query.assessment} students={students}/>:undefined} /></AppShell>;
}
