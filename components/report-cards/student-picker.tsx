"use client";
import {useTransition} from "react";
import {useRouter} from "next/navigation";
import type {RosterStudent} from "@/features/classes/types";
import {ActionFeedback} from "@/components/ui/feedback";
export function ReportStudentPicker({classId,students,selected}:{classId:string;students:RosterStudent[];selected?:string}){
 const router=useRouter();const [pending,start]=useTransition();
 return <div className="space-y-3 max-w-lg"><label htmlFor="report-student">Student</label><select id="report-student" value={selected??""} disabled={pending} onChange={e=>{const value=e.target.value;start(()=>router.push(`/teacher/classes/advisory-${classId}?tab=report-cards${value?`&student=${value}`:""}`));}}><option value="">Choose a student</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} · {s.studentCode}</option>)}</select><ActionFeedback pending={pending}/></div>;
}
