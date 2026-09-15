"use client";
import {useActionState,useState} from "react";
import {saveAttendance} from "@/features/attendance/actions";
import {ActionFeedback} from "@/components/ui/feedback";
import {SubmitButton} from "@/components/ui/submit-button";
import {Button} from "@/components/ui/button";
import type {RosterStudent} from "@/features/classes/types";
export function AttendanceEditor({offering,date,version,students,records,statuses,canManage,today}:{offering:string;date:string;version:number;students:RosterStudent[];records:{student_id:string;status_code:string;status_label:string}[];statuses:{code:string;label:string;active:boolean}[];canManage:boolean;today:string}){
 const [state,action,pending]=useActionState(saveAttendance,{});
 const snapshot=()=>Object.fromEntries(records.map(r=>[r.student_id,r.status_code]));
 const [values,setValues]=useState<Record<string,string>>(snapshot),[dirty,setDirty]=useState(false),[seenVersion,setSeenVersion]=useState(version),[bulk,setBulk]=useState("");
 if(seenVersion!==version){setSeenVersion(version);setValues(snapshot());setDirty(false);}
 const oversized=students.length>500||records.length>500,editable=canManage&&!oversized&&date<=today;
 const active=statuses.filter(s=>s.active),saved=new Map(records.map(r=>[r.student_id,r]));
 return <section className="bg-white border border-border rounded-lg p-5 mt-5"><h2 className="text-xl font-semibold text-navy">Attendance · {date}</h2><p className="text-sm text-muted mt-2">{records.length} saved / {students.length} enrolled. Unmarked students are not automatically absent. Saved marks are visible to students.</p>
 {oversized&&<p role="alert" className="mt-4 text-red-700">This editor supports up to 500 students. Recording is disabled for larger rosters.</p>}
 {date>today&&<p role="alert" className="mt-4 text-amber-800">Choose today or an earlier date to record attendance.</p>}
 {!statuses.length&&<p role="status" className="mt-4 text-amber-800">Ask your superadmin to configure attendance statuses under School → Attendance.</p>}
 {!canManage&&<p className="mt-4 text-muted">Only an assigned subject teacher can record attendance. Your access is read-only.</p>}
 <form action={action} aria-busy={pending} className="space-y-4 mt-5"><input type="hidden" name="offering" value={offering}/><input type="hidden" name="day" value={date}/><input type="hidden" name="version" value={version}/>
 {editable&&active.length>0&&<div className="flex flex-wrap items-end gap-3"><div><label htmlFor="bulk-attendance">Fill unmarked students</label><select id="bulk-attendance" value={bulk} onChange={e=>setBulk(e.target.value)} disabled={pending}><option value="">Choose a status…</option>{active.map(s=><option key={s.code} value={s.code}>{s.label}</option>)}</select></div><Button type="button" variant="outline" disabled={!bulk||pending||!students.length} onClick={()=>{setValues(current=>Object.fromEntries(students.map(s=>[s.id,current[s.id]||bulk])));setDirty(true);}}>Apply to unmarked</Button></div>}
 <div className="overflow-auto max-h-[540px]"><table className="w-full"><caption className="sr-only">Subject attendance for {date}</caption><thead className="sticky top-0"><tr><th>Student</th><th>Student ID</th><th>Status</th></tr></thead><tbody>{students.map(student=>{const original=saved.get(student.id);return <tr key={student.id}><td>{student.name}</td><td className="text-xs text-muted">{student.studentCode}</td><td>{editable?<><select name={`attendance:${student.id}`} aria-label={`Attendance for ${student.name}`} value={values[student.id]||""} disabled={pending} onChange={e=>{setValues(current=>({...current,[student.id]:e.target.value}));setDirty(true);}}><option value="">Not recorded</option>{statuses.filter(s=>s.active||s.code===original?.status_code).map(s=><option key={s.code} value={s.code}>{s.code===original?.status_code?original.status_label:s.label}{!s.active?" (inactive)":""}</option>)}</select></>:original?.status_label||"Not recorded"}</td></tr>;})}</tbody></table>{!students.length&&<p className="p-5 text-muted">No students enrolled in this subject.</p>}</div>
 {editable&&version>0&&<div><label htmlFor="attendance-reason">Reason for update (staff only)</label><input key={version} id="attendance-reason" name="reason" required maxLength={500} disabled={pending} placeholder="Explain the correction or additional marks"/></div>}
 {dirty&&!pending&&<p role="status" className="text-sm text-amber-800">You have unsaved attendance changes.</p>}
 <ActionFeedback pending={pending} error={state.error} success={dirty?undefined:state.success}/>
 {editable&&<SubmitButton pendingLabel="Saving attendance…" disabled={pending||!dirty||!students.length||!statuses.length}>Save attendance</SubmitButton>}
 </form></section>;
}
