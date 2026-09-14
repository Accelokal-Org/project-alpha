import Link from "next/link";
import { SetupForm, type FormField } from "./setup-form";
import type { AdminData } from "@/features/admin/queries";
import { InvitationForm } from "./invitation-form";
const nameField:FormField={name:"name",label:"Name"};
const codeField:FormField={name:"code",label:"Code"};
function Records({title,headers,rows}:{title:string;headers:string[];rows:React.ReactNode[][]}) {
 return <section className="border border-border rounded-lg overflow-hidden bg-white mt-5"><h2 className="font-semibold text-navy p-4 border-b border-border">{title}</h2><div className="overflow-auto max-h-[520px]"><table className="w-full"><caption className="sr-only">{title}</caption><thead className="sticky top-0"><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j} className="text-sm">{v}</td>)}</tr>)}</tbody></table>{!rows.length&&<p className="p-6 text-sm text-muted">No records yet. Add the first record using the form above.</p>}</div></section>;
}
export function SchoolPanel({data:d,tab}:{data:AdminData;tab:string}) {
 const s=d.selected!; const schoolId=s.id;
 const classOptions=d.classes.map(c=>({value:c.id,label:c.name}));
 const teacherOptions=d.teachers.map(t=>({value:t.id,label:`${t.display_name} · ${t.employee_code}`}));
 const studentOptions=d.students.map(t=>({value:t.id,label:`${t.display_name} · ${t.student_code}`}));
 const subjectOptions=d.subjects.map(t=>({value:t.id,label:`${t.code} · ${t.name}`}));
 const className=(id:string)=>d.classes.find(c=>c.id===id)?.name??"Unassigned";
 const teacherName=(id:string|null)=>d.teachers.find(t=>t.id===id)?.display_name??"Unassigned";
 const subjectName=(id:string)=>d.subjects.find(t=>t.id===id)?.name??"Unassigned";
 const offeringName=(id:string)=>{const o=d.offerings.find(o=>o.id===id);return o?`${subjectName(o.subject_id)} · ${className(o.class_id)}`:"Unassigned";};
 const offeringOptions=d.offerings.map(o=>({value:o.id,label:offeringName(o.id)}));
 const select=(name:string,label:string,options:{value:string;label:string}[]):FormField=>({name,label,options});
 const classField=select("class_id","Class",classOptions), teacherField=select("teacher_id","Teacher",teacherOptions),studentField=select("student_id","Student",studentOptions),offeringField=select("offering_id","Class / subject",offeringOptions);
 if(tab==="structure") return <>
  <div className="grid lg:grid-cols-3 gap-4">
   <SetupForm operation="create_year" schoolId={schoolId} title="Add school year" fields={[nameField,{name:"starts_on",label:"Start date",type:"date"},{name:"ends_on",label:"End date",type:"date"},{name:"is_active",label:"Make this the active year",type:"checkbox"}]} />
   <SetupForm operation="create_grade" schoolId={schoolId} title="Add grade / year level" fields={[nameField]} />
   <SetupForm operation="create_class" schoolId={schoolId} title="Add class / section" fields={[nameField,select("year_id","School year",d.years.map(y=>({value:y.id,label:y.name}))),select("grade_id","Grade level",d.grades.map(g=>({value:g.id,label:g.name})))]} disabled={!d.years.length||!d.grades.length} />
  </div>
  <Records title="School years" headers={["Year","Start","End","Status"]} rows={d.years.map(y=>[y.name,y.starts_on,y.ends_on,y.is_active?"Active":"Inactive"])} />
  <Records title="Grade levels" headers={["Name"]} rows={d.grades.map(g=>[g.name])} />
  <Records title="Classes" headers={["Class","School year","Adviser","Students"]} rows={d.classes.map(c=>[c.name,d.years.find(y=>y.id===c.school_year_id)?.name,teacherName(c.adviser_teacher_id),d.classEnrollments.filter(e=>e.class_id===c.id).length])} />
 </>;
 if(tab==="people") return <>
  <div className="grid md:grid-cols-2 gap-4"><SetupForm operation="create_teacher" schoolId={schoolId} title="Add teacher" description="Create the school profile first; connect a login in Accounts." fields={[nameField,codeField]} /><SetupForm operation="create_student" schoolId={schoolId} title="Add student" description="Class and subject enrollment are assigned separately." fields={[nameField,codeField]} /></div>
  <Records title="Teachers" headers={["Name","Employee code","Login"]} rows={d.teachers.map(t=>[t.display_name,t.employee_code,t.user_id?"Connected":"Not connected"])} />
  <Records title="Students" headers={["Name","Student code","Login"]} rows={d.students.map(t=>[t.display_name,t.student_code,t.user_id?"Connected":"Not connected"])} />
 </>;
 if(tab==="subjects") return <>
  <div className="grid md:grid-cols-2 gap-4"><SetupForm operation="create_subject" schoolId={schoolId} title="Add subject" fields={[nameField,codeField]} /><SetupForm operation="create_offering" schoolId={schoolId} title="Add subject to a class" fields={[classField,select("subject_id","Subject",subjectOptions)]} disabled={!d.classes.length||!d.subjects.length} /></div>
  <Records title="Subjects" headers={["Code","Name"]} rows={d.subjects.map(t=>[t.code,t.name])} />
  <Records title="Class subjects" headers={["Class","Subject","Assigned teachers","Enrolled students","Roster"]} rows={d.offerings.map(o=>[className(o.class_id),subjectName(o.subject_id),d.teacherAssignments.filter(a=>a.offering_id===o.id).map(a=>teacherName(a.teacher_id)).join(", ")||"Unassigned",d.subjectEnrollments.filter(e=>e.offering_id===o.id).length,<Link key={o.id} className="text-primary" href={`/teacher/classes/${o.id}`}>Open roster</Link>])} />
 </>;
 if(tab==="assignments") return <>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
   <SetupForm operation="assign_teacher" schoolId={schoolId} title="Assign subject teacher" fields={[offeringField,teacherField]} disabled={!d.offerings.length||!d.teachers.length} />
   <SetupForm operation="assign_adviser" schoolId={schoolId} title="Assign class adviser" description="The teacher also needs the Adviser role in Accounts." fields={[classField,teacherField]} disabled={!d.classes.length||!d.teachers.length} />
   <SetupForm operation="enroll_class" schoolId={schoolId} title="Enroll student in class" fields={[classField,studentField]} disabled={!d.classes.length||!d.students.length} />
   <SetupForm operation="enroll_subject" schoolId={schoolId} title="Enroll student in subject" fields={[offeringField,studentField]} disabled={!d.offerings.length||!d.students.length} />
   <SetupForm operation="enroll_class_subject" schoolId={schoolId} title="Enroll a whole class in a subject" description="Adds currently enrolled class members. Existing subject enrollments and individual exceptions remain intact." fields={[classField,offeringField]} disabled={!d.classes.length||!d.offerings.length} submit="Add class students" />
  </div>
  <Records title="Class enrollments" headers={["Student","Class"]} rows={d.classEnrollments.map(e=>[d.students.find(t=>t.id===e.student_id)?.display_name,className(e.class_id)])} />
  <Records title="Subject enrollments" headers={["Student","Class / subject"]} rows={d.subjectEnrollments.map(e=>[d.students.find(t=>t.id===e.student_id)?.display_name,offeringName(e.offering_id)])} />
 </>;
 if(tab==="accounts") return <>
  <div className="mb-5"><InvitationForm schoolId={schoolId} teachers={d.teachers} students={d.students}/></div>
  <div className="grid md:grid-cols-2 gap-4">
   <SetupForm operation="link_account" schoolId={schoolId} title="Connect a login account" description="Connect an existing login by email. Add Teacher and Adviser separately for a combined role. No invitation email is sent." fields={[
    {name:"email",label:"Account email",type:"email"},select("role","School role",[{value:"TEACHER",label:"Teacher"},{value:"ADVISER",label:"Adviser"},{value:"STUDENT",label:"Student"},{value:"SCHOOL_HEAD",label:"School head"}]),
    {...select("profile_id","Teacher or student profile",[...teacherOptions.map(o=>({...o,label:`Teacher: ${o.label}`})),...studentOptions.map(o=>({...o,label:`Student: ${o.label}`}))]),optional:true,hint:"Choose a profile matching the role. School heads do not need a profile."}
   ]} submit="Connect account" />
  </div>
  <Records title="Connected school accounts" headers={["Email","Role"]} rows={d.accounts.map(a=>[a.email,a.role.replaceAll("_"," ")])} />
 </>;
 if(tab==="audit") return <Records title="Latest 30 setup changes" headers={["Time","Action","Actor","Record"]} rows={d.audit.map(a=>[new Intl.DateTimeFormat("en-PH",{timeZone:s.timezone,dateStyle:"medium",timeStyle:"short"}).format(new Date(a.created_at)),a.action.replaceAll("_"," "),a.actor_id===d.user.id?"You":a.actor_id,a.entity_id])} />;

 return <>
  <div className="grid lg:grid-cols-2 gap-4"><SetupForm operation="update_school" schoolId={schoolId} title="School settings" fields={[{...nameField,value:s.name},{name:"timezone",label:"Timezone",value:s.timezone}]} submit="Save school" /><section className="bg-white border border-border rounded-lg p-5"><h2 className="font-semibold text-navy">Set up this school</h2><ol className="list-decimal pl-5 space-y-3 text-sm text-muted mt-4"><li>Add school years, grade levels, and classes.</li><li>Add teachers, students, and subjects.</li><li>Assign teaching/advisory responsibilities and enroll students.</li><li>Connect login accounts to their school roles.</li></ol><p className="mt-5 text-xs text-muted">School workspace. Configuration is saved to Supabase.</p></section></div>
  <Records title="Current setup" headers={["Records","Count"]} rows={[["School years",d.years.length],["Classes",d.classes.length],["Teachers",d.teachers.length],["Students",d.students.length],["Subjects",d.subjects.length],["Connected role assignments",d.accounts.length]]} />
 </>;
}
