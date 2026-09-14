import { BookOpen, Check, ArrowRight } from "lucide-react";
import { AssignmentList } from "./assignment-list";
import type { Assignment } from "@/features/classes/types";
export function Workspace({ assignments, preview = false, classesView = false }: { assignments: Assignment[]; preview?: boolean; classesView?: boolean }) {
 const schools = [...new Set(assignments.map(a => a.school))];
 return <>
  <div className="flex flex-wrap items-end justify-between gap-4 mb-7"><div><p className="text-xs text-muted mb-2">{schools.length === 1 ? schools[0] : "Your school assignments"}</p><h1 className="text-2xl font-semibold tracking-tight text-navy">{classesView ? "My classes" : "My workspace"}</h1><p className="text-muted mt-2">{classesView ? "Open a subject to view its enrolled students." : "Your teaching and advisory assignments, together."}</p></div><span className="text-xs font-medium border border-border bg-white px-3 py-2 rounded-md">{[...new Set(assignments.map(a => a.year))].join(" · ") || "School year not assigned"}</span></div>
  {!classesView && <section className="border-l-[3px] border-[#11b8c7] bg-white px-5 py-4 mb-6 flex items-start gap-4"><BookOpen size={19} className="text-teal-700 mt-0.5 shrink-0" /><div><h2 className="font-semibold text-navy">Start with your class roster</h2><p className="text-sm text-muted mt-1 leading-relaxed">Review the students enrolled in each subject. Class advisory provides a view of the whole section.</p></div></section>}
  <AssignmentList assignments={assignments} preview={preview} />
  {!classesView && <div className="grid lg:grid-cols-2 gap-6 mt-6">
   <section className="border border-border rounded-lg bg-white"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-navy">Working with your roster</h2></div><ol className="divide-y divide-slate-100 px-5">{["Choose a class and subject", "Search or sort the student list", "Review individual subject enrollment"].map((text,i) => <li key={text} className="flex gap-3 items-center py-4 text-sm"><span className="text-muted text-xs tabular-nums">0{i+1}</span>{text}<ArrowRight size={14} className="ml-auto text-slate-400" /></li>)}</ol></section>
   <section className="border border-border rounded-lg bg-white"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-navy">Clear access to school records</h2></div><ul className="px-5 py-2">{["Subject rosters follow subject enrollment.", "Advisory access follows the assigned class.", "Students can only view their own records."].map(t => <li key={t} className="flex items-start gap-3 py-3 text-sm text-muted"><Check size={15} className="text-teal-700 mt-0.5 shrink-0" />{t}</li>)}</ul></section>
  </div>}
  <p className="text-xs text-muted mt-6">Foundation release · Class and subject rosters. Assessment scoring, attendance, and grade workflows are planned next.</p>
 </>;
}
