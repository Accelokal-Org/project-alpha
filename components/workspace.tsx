"use client";

import { useState } from "react";
import { BookOpen, Users, School, Search } from "lucide-react";
import { AssignmentList } from "./assignment-list";
import type { Assignment } from "@/features/classes/types";

export function Workspace({ assignments, classesView = false }: { assignments: Assignment[]; classesView?: boolean }) {
 const [query, setQuery] = useState("");
 const [school, setSchool] = useState("");
 const [year, setYear] = useState("");
 const [kind, setKind] = useState("");
 const schools = [...new Map(assignments.map(a => [a.schoolId, a.school])).entries()];
 const years = [...new Set(assignments.map(a => a.year))].sort();
 const filtered = assignments.filter(a => (!school || a.schoolId === school) && (!year || a.year === year) && (!kind || a.kind === kind) && `${a.className} ${a.subject} ${a.code} ${a.school}`.toLowerCase().includes(query.trim().toLowerCase()))
  .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.subject.localeCompare(b.subject));
 const hasFilters = Boolean(query || school || year || kind);
 const reset = () => { setQuery(""); setSchool(""); setYear(""); setKind(""); };
 const fieldClass = "border border-border rounded-md bg-white px-3 py-2 text-sm min-w-0";
 return <>
  <div className="mb-7"><p className="text-xs text-muted mb-2">{schools.length === 1 ? schools[0][1] : "Your teaching desk"}</p><h1 className="text-2xl font-semibold tracking-tight text-navy">{classesView ? "My classes" : "My workspace"}</h1><p className="text-muted mt-2">{classesView ? "Find a class, open its roster, and review enrollment." : "Your classes and advisory responsibilities, in one place."}</p></div>
  {!classesView && <section aria-label="Assignment overview" className="grid sm:grid-cols-3 gap-4 mb-6">
   {[{ label: "Subject assignments", value: assignments.filter(a => a.kind === "Subject").length, icon: BookOpen }, { label: "Advisory classes", value: assignments.filter(a => a.kind === "Advisory").length, icon: Users }, { label: "Class sections", value: new Set(assignments.map(a => `${a.schoolId}:${a.classId}`)).size, icon: School }].map(({ label, value, icon: Icon }) => <div key={label} className="bg-white border border-border rounded-lg p-5"><div className="flex justify-between gap-3 text-muted text-sm">{label}<Icon size={17} className="text-primary" /></div><p className="text-2xl font-semibold text-navy mt-3 tabular-nums">{value}</p></div>)}
  </section>}
  {assignments.length > 0 && <section aria-label="Find assignments" className="mb-4 space-y-3">
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr]">
    <label className="relative"><span className="sr-only">Search classes and subjects</span><Search size={16} className="absolute left-3 top-3 text-muted" /><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search classes or subjects" className={`${fieldClass} pl-9 w-full`} /></label>
    <label><span className="sr-only">School</span><select aria-label="School" value={school} onChange={e => setSchool(e.target.value)} className={`${fieldClass} w-full`}><option value="">All schools</option>{schools.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <label><span className="sr-only">School year</span><select aria-label="School year" value={year} onChange={e => setYear(e.target.value)} className={`${fieldClass} w-full`}><option value="">All school years</option>{years.filter(Boolean).map(y => <option key={y}>{y}</option>)}</select></label>
   </div>
   <div className="flex flex-wrap items-center gap-2"><div role="group" aria-label="Assignment responsibility" className="flex flex-wrap gap-2">{[["", "All assignments"], ["Subject", "Teaching"], ["Advisory", "Advisory"]].map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`rounded-md px-3 py-2 text-xs font-medium ${kind === value ? "bg-primary text-white" : "bg-white border border-border text-muted"}`}>{label}</button>)}</div>{hasFilters && <button type="button" onClick={reset} className="text-xs text-primary px-2 py-2">Clear filters</button>}<p role="status" className="text-xs text-muted sm:ml-auto">Showing {filtered.length} of {assignments.length} assignments</p></div>
  </section>}
  {assignments.length > 0 && filtered.length === 0 ? <div className="border border-border rounded-lg bg-white p-10 text-center"><h2 className="font-semibold text-navy">No matching assignments</h2><p className="text-sm text-muted mt-2">Try another class name or adjust your filters.</p><button type="button" onClick={reset} className="mt-4 text-sm text-primary font-medium">Show all assignments</button></div> : <AssignmentList assignments={filtered} />}
  {!classesView && <section className="mt-6 border-l-[3px] border-teal-500 bg-white px-5 py-4"><h2 className="font-semibold text-navy">Ready to review your class?</h2><p className="text-sm text-muted mt-2 leading-relaxed">Open a subject roster to find its enrolled students. Choose Advisory to review the whole section you advise. If a class is missing, ask your school administrator to check your assignment and school account connection.</p></section>}
 </>;
}
