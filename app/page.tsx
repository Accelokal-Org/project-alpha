"use client"

import Link from "next/link"
import {useEffect,useMemo,useState} from "react"
import {toast} from "sonner"
import type {LucideIcon} from "lucide-react"
import {
  Bell,BookOpen,Building2,CalendarCheck,ChartNoAxesCombined,Check,ChevronDown,
  ChevronLeft,ChevronRight,ClipboardCheck,Clock3,Download,Ellipsis,FileClock,
  Eye,FileSpreadsheet,FileText,GraduationCap,HelpCircle,House,KeyRound,LockKeyhole,LogOut,
  Mail,MapPin,NotebookTabs,PenLine,Plus,Printer,Save,Search,Settings,ShieldCheck,SquareUserRound,
  UserPlus,Users,Wifi
} from "lucide-react"
import {ThemeToggle} from "@/components/theme-toggle"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Card} from "@/components/ui/card"
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from "@/components/ui/dialog"
import {
  DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,
  DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuSeparator,DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Popover,PopoverContent,PopoverTrigger} from "@/components/ui/popover"
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from "@/components/ui/tooltip"
import {DEMO_SESSION_KEY,type DemoRole} from "@/lib/demo-users"

type View="Overview"|"Students"|"Academic"|"Attendance"|"Planning"|"Documents"|"Access control"
type WorkspaceDialog="schools"|"help"|"profile"|"settings"|"calendar"|null
type Student={id:string;name:string;avg:number;att:string;initials:string;tone:string;status:string;grade:string;section:string}
type School={name:string;id:string;location:string}
type Profile={name:string;email:string;phone:string}
type AccountSettings={emailReminders:boolean;attendanceAlerts:boolean;defaultPage:string;sessionTimeout:string}
type OutputFormat="PDF"|"CSV"
type GeneratedDocument={id:number;name:string;detail:string;date:string;format:OutputFormat;type:string;schoolClass:string;period:string;headers:string[];rows:string[][]}

const nav:{label:View;icon:LucideIcon}[]=[
  {label:"Overview",icon:House},{label:"Students",icon:Users},{label:"Academic",icon:BookOpen},
  {label:"Attendance",icon:CalendarCheck},{label:"Planning",icon:NotebookTabs},
  {label:"Documents",icon:FileText},{label:"Access control",icon:ShieldCheck},
]
const initialStudents:Student[]=[
  {id:"2026-0041",name:"Althea M. Santos",avg:92,att:"97%",initials:"AS",tone:"sage",status:"Active",grade:"Grade 6",section:"Mabini"},
  {id:"2026-0042",name:"Benicio R. Cruz",avg:88,att:"94%",initials:"BC",tone:"blue",status:"Active",grade:"Grade 6",section:"Mabini"},
  {id:"2026-0043",name:"Camille S. Reyes",avg:95,att:"99%",initials:"CR",tone:"violet",status:"Active",grade:"Grade 6",section:"Mabini"},
  {id:"2026-0044",name:"Diego L. Mendoza",avg:84,att:"89%",initials:"DM",tone:"amber",status:"Needs review",grade:"Grade 6",section:"Mabini"},
  {id:"2026-0045",name:"Elena P. Garcia",avg:91,att:"96%",initials:"EG",tone:"rose",status:"Active",grade:"Grade 6",section:"Mabini"},
]
const initialSchools:School[]=[
  {name:"San Isidro ES",id:"136742",location:"San Isidro District"},
  {name:"Mabini Central ES",id:"137108",location:"Mabini District"},
]

export default function Home(){
  const[view,setView]=useState<View>("Overview")
  const[school,setSchool]=useState("San Isidro ES")
  const[year,setYear]=useState("2026–2027")
  const[students,setStudents]=useState(initialStudents)
  const[schools,setSchools]=useState(initialSchools)
  const[profile,setProfile]=useState<Profile>({name:"Juan Dela Cruz",email:"juan.delacruz@deped.gov.ph",phone:"0917 555 0142"})
  const[currentRole,setCurrentRole]=useState<DemoRole>("School administrator")
  const[accountSettings,setAccountSettings]=useState<AccountSettings>({emailReminders:true,attendanceAlerts:true,defaultPage:"Overview",sessionTimeout:"30 minutes"})
  const[addOpen,setAddOpen]=useState(false)
  const[workspaceDialog,setWorkspaceDialog]=useState<WorkspaceDialog>(null)
  useEffect(()=>{const timer=window.setTimeout(()=>{const stored=window.sessionStorage.getItem(DEMO_SESSION_KEY);if(!stored)return;try{const user=JSON.parse(stored) as {name:string;email:string;role:DemoRole};setProfile(current=>({...current,name:user.name,email:user.email}));setCurrentRole(user.role)}catch{/* Ignore malformed demo session data. */}},0);return()=>window.clearTimeout(timer)},[])
  return <TooltipProvider delayDuration={250}>
    <div className="shell">
      <Sidebar view={view} setView={setView} school={school} schools={schools} setSchool={setSchool} profile={profile} currentRole={currentRole} openDialog={setWorkspaceDialog}/>
      <main>
        <Topbar year={year} setYear={setYear} setView={setView}/>
        <section className="content">
          {view==="Overview"&&<Overview setView={setView} total={487+students.length-initialStudents.length} profile={profile} school={school} addStudent={()=>setAddOpen(true)} openCalendar={()=>setWorkspaceDialog("calendar")}/>}
          {view==="Students"&&<Students students={students} setStudents={setStudents} addStudent={()=>setAddOpen(true)}/>}
          {view==="Academic"&&<Academic/>}
          {view==="Attendance"&&<Attendance students={students}/>}
          {view==="Planning"&&<Planning/>}
          {view==="Documents"&&<Documents students={students} school={school} year={year}/>}
          {view==="Access control"&&<AccessControl/>}
        </section>
      </main>
      <AddStudentDialog open={addOpen} setOpen={setAddOpen} students={students} onAdd={student=>setStudents(current=>[student,...current])}/>
      <WorkspaceDialogs active={workspaceDialog} setActive={setWorkspaceDialog} school={school} schools={schools} setSchools={setSchools} setSchool={setSchool} profile={profile} setProfile={setProfile} settings={accountSettings} setSettings={setAccountSettings}/>
    </div>
  </TooltipProvider>
}

function Sidebar({view,setView,school,schools,setSchool,profile,currentRole,openDialog}:{view:View;setView:(view:View)=>void;school:string;schools:School[];setSchool:(school:string)=>void;profile:Profile;currentRole:DemoRole;openDialog:(dialog:WorkspaceDialog)=>void}){
  const selectedSchool=schools.find(item=>item.name===school)
  const initials=profile.name.split(" ").filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase()
  return <aside>
    <div className="brand"><div className="seal"><GraduationCap/></div><div><b>EduArchive</b><span>Schools Division Portal</span></div></div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button className="school" aria-label="Switch school"><span className="school-icon"><House/></span><span className="school-copy"><b>{school}</b><small>School ID {selectedSchool?.id}</small></span><ChevronDown className="chevron"/></button></DropdownMenuTrigger>
      <DropdownMenuContent className="school-menu" align="start">
        <DropdownMenuLabel>School workspace</DropdownMenuLabel><DropdownMenuSeparator/>
        <DropdownMenuRadioGroup value={school} onValueChange={setSchool}>
          {schools.map(item=><DropdownMenuRadioItem value={item.name} key={item.id}>{item.name}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>openDialog("schools")}><Settings/>Manage schools</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <nav aria-label="Main navigation">
      <small>Workspace</small>
      {nav.slice(0,6).map(item=><button key={item.label} className={view===item.label?"active":""} onClick={()=>setView(item.label)}><item.icon/>{item.label}</button>)}
      {currentRole==="School administrator"&&<><small>Administration</small>{nav.slice(6).map(item=><button key={item.label} className={view===item.label?"active":""} onClick={()=>setView(item.label)}><item.icon/>{item.label}</button>)}</>}
    </nav>
    <div className="help"><HelpCircle/><div><b>Need help?</b><span>View the quick start guide or contact your division admin.</span><button onClick={()=>openDialog("help")}>Open help center <ChevronRight/></button></div></div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button className="user"><Avatar initials={initials} tone="navy"/><span><b>{profile.name}</b><small>{currentRole}</small></span><Ellipsis/></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="user-menu">
        <DropdownMenuLabel>{profile.name}<small>{profile.email}</small></DropdownMenuLabel><DropdownMenuSeparator/>
        <DropdownMenuItem onSelect={()=>openDialog("profile")}><SquareUserRound/>My profile</DropdownMenuItem>
        <DropdownMenuItem onSelect={()=>openDialog("settings")}><Settings/>Account settings</DropdownMenuItem>
        <DropdownMenuSeparator/><DropdownMenuItem asChild><Link href="/login" onClick={()=>window.sessionStorage.removeItem(DEMO_SESSION_KEY)}><LogOut/>Log out</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </aside>
}

function Topbar({year,setYear,setView}:{year:string;setYear:(year:string)=>void;setView:(view:View)=>void}){
  return <header>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="year-trigger"><span>School year</span><b>{year}</b><ChevronDown/></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Active school year</DropdownMenuLabel><DropdownMenuSeparator/>
        <DropdownMenuRadioGroup value={year} onValueChange={value=>{setYear(value);toast.success(`School year changed to ${value}`)}}>
          <DropdownMenuRadioItem value="2026–2027">2026–2027</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="2025–2026">2025–2026</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="2024–2025">2024–2025</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    <div className="top-actions"><Notifications setView={setView}/><ThemeToggle className="theme-dashboard"/></div>
  </header>
}

function Notifications({setView}:{setView:(view:View)=>void}){
  const[readIds,setReadIds]=useState<string[]>([])
  const items=[
    {id:"reports",icon:FileClock,title:"18 report cards are still pending",detail:"Due September 12 · 12 minutes ago",view:"Documents" as View},
    {id:"learner",icon:UserPlus,title:"A new learner was enrolled",detail:"Grade 6 – Mabini · 1 hour ago",view:"Students" as View},
    {id:"attendance",icon:CalendarCheck,title:"Attendance report is ready",detail:"August 2026 · Yesterday",view:"Attendance" as View},
  ]
  const unread=items.filter(item=>!readIds.includes(item.id)).length
  return <Popover>
    <Tooltip><TooltipTrigger asChild><PopoverTrigger asChild><Button variant="outline" size="icon" className="notification-button" aria-label={`${unread} unread notifications`}><Bell/>{unread>0&&<span className="notification-dot">{unread}</span>}</Button></PopoverTrigger></TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip>
    <PopoverContent align="end" className="notification-panel">
      <div className="notification-head"><div><b>Notifications</b><small>{unread?`${unread} unread updates`:"You’re all caught up"}</small></div>{unread>0&&<Button variant="ghost" size="sm" onClick={()=>setReadIds(items.map(item=>item.id))}>Mark all read</Button>}</div>
      <div className="notification-list">
        {items.map(item=><button className={readIds.includes(item.id)?"read":""} key={item.id} onClick={()=>{setReadIds(current=>current.includes(item.id)?current:[...current,item.id]);setView(item.view)}}><item.icon/><span><b>{item.title}</b><small>{item.detail}</small></span>{!readIds.includes(item.id)&&<i aria-label="Unread"/>}</button>)}
      </div>
    </PopoverContent>
  </Popover>
}

function PageHead({eyebrow,title,text,action}:{eyebrow:string;title:string;text:string;action?:React.ReactNode}){return <div className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</div>}
function SectionHead({title,subtitle,extra}:{title:string;subtitle:string;extra?:React.ReactNode}){return <div className="card-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{extra}</div>}
function Avatar({initials,tone}:{initials:string;tone:string}){return <span className={`avatar ${tone}`}>{initials}</span>}

function Overview({setView,total,profile,school,addStudent,openCalendar}:{setView:(view:View)=>void;total:number;profile:Profile;school:string;addStudent:()=>void;openCalendar:()=>void}){
  const metrics=[
    {label:"Total learners",value:String(total),detail:"12 more than last school year",icon:Users,tone:"blue"},
    {label:"Attendance today",value:"94.8%",detail:"462 of 487 learners",icon:CalendarCheck,tone:"green"},
    {label:"Class average",value:"88.6",detail:"2.4 points above last quarter",icon:ChartNoAxesCombined,tone:"amber"},
    {label:"Pending reports",value:"18",detail:"Due by September 12",icon:FileClock,tone:"violet"},
  ]
  return <>
    <PageHead eyebrow="Thursday, September 4" title={`Good morning, ${profile.name.split(" ")[0]}.`} text={`Here’s what’s happening at ${school}.`} action={<Button size="sm" onClick={addStudent}><Plus/>Add student</Button>}/>
    <div className="metrics">{metrics.map(item=><Card className="metric-card" key={item.label}><span className={`metric-icon ${item.tone}`}><item.icon/></span><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></Card>)}</div>
    <div className="dashboard-grid">
      <Card className="card"><SectionHead title="Attendance overview" subtitle="Daily school-wide attendance this week" extra={<Badge variant="success"><Check/>On track</Badge>}/><div className="chart">{[["Mon",96],["Tue",93],["Wed",97],["Thu",95],["Fri",3]].map(([day,value])=><div key={day}><span style={{height:`${value}%`}}><b>{value===3?"No data":`${value}%`}</b></span><small>{day}</small></div>)}</div><Button variant="link" className="link" onClick={()=>setView("Attendance")}>View attendance records<ChevronRight/></Button></Card>
      <Card className="card"><SectionHead title="Quick actions" subtitle="Common tasks for your school day"/><div className="quick">{[
        {label:"Take attendance",view:"Attendance" as View,icon:ClipboardCheck},
        {label:"Enter grades",view:"Academic" as View,icon:PenLine},
        {label:"New lesson plan",view:"Planning" as View,icon:NotebookTabs},
        {label:"Generate reports",view:"Documents" as View,icon:FileText},
      ].map(item=><button key={item.label} onClick={()=>setView(item.view)}><span className="quick-icon"><item.icon/></span><b>{item.label}</b><small>Open workspace</small></button>)}</div></Card>
    </div>
    <div className="dashboard-grid lower">
      <Card className="card"><SectionHead title="Recent activity" subtitle="Latest updates across your workspace"/><div className="activity">{[
        {icon:PenLine,title:"Grades updated",detail:"Grade 6 – Mabini",time:"12 min ago"},
        {icon:UserPlus,title:"New learner enrolled",detail:"Althea M. Santos",time:"1 hr ago"},
        {icon:FileText,title:"Report card generated",detail:"Grade 5 – Rizal",time:"Yesterday"},
      ].map((item,index)=><button key={item.title} onClick={()=>setView(index===0?"Academic":index===1?"Students":"Documents")}><span className="activity-icon"><item.icon/></span><span><b>{item.title}</b><small>{item.detail}</small></span><time>{item.time}</time><ChevronRight/></button>)}</div></Card>
      <Card className="card"><SectionHead title="Upcoming deadlines" subtitle="Keep submissions on schedule"/><div className="deadline-row"><div className="date-tile"><b>12</b><span>SEP</span></div><p><strong>Quarter 1 report cards</strong><small>18 records remaining</small></p><span className="deadline-meta"><Clock3/>Due in 8 days</span></div><div className="deadline-row"><div className="date-tile"><b>18</b><span>SEP</span></div><p><strong>Monthly attendance report</strong><small>Division office submission</small></p><span className="deadline-meta"><Clock3/>Due in 14 days</span></div><Button variant="link" className="link" onClick={openCalendar}>View school calendar<ChevronRight/></Button></Card>
    </div>
  </>
}

function Students({students,setStudents,addStudent}:{students:Student[];setStudents:React.Dispatch<React.SetStateAction<Student[]>>;addStudent:()=>void}){
  const[query,setQuery]=useState("")
  const[grade,setGrade]=useState("All grades")
  const[section,setSection]=useState("All sections")
  const[page,setPage]=useState(1)
  const[selectedStudent,setSelectedStudent]=useState<Student|null>(null)
  const[studentMode,setStudentMode]=useState<"view"|"edit">("view")
  const filtered=useMemo(()=>students.filter(student=>(student.name+student.id).toLowerCase().includes(query.toLowerCase())&&(grade==="All grades"||student.grade===grade)&&(section==="All sections"||student.section===section)),[students,query,grade,section])
  const pageSize=5
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize))
  const pageRows=filtered.slice((page-1)*pageSize,page*pageSize)
  const exportCsv=()=>{const rows=[["Student ID","Name","Class","Average","Attendance","Status"],...filtered.map(s=>[s.id,s.name,`${s.grade} - ${s.section}`,String(s.avg),s.att,s.status])];const blob=new Blob([rows.map(row=>row.map(cell=>`"${cell}"`).join(",")).join("\n")],{type:"text/csv"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="eduarchive-students.csv";link.click();URL.revokeObjectURL(url);toast.success("Student list exported")}
  return <>
    <PageHead eyebrow="Learner information system" title="Student records" text="Maintain complete, accurate learner profiles in one secure workspace." action={<Button size="sm" onClick={addStudent}><UserPlus/>Add student</Button>}/>
    <Card className="card table-card"><div className="toolbar"><div className="search-field"><Search/><Input value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} placeholder="Search learner name or ID…" aria-label="Search student records"/></div><select value={grade} onChange={e=>{setGrade(e.target.value);setPage(1)}} aria-label="Filter by grade"><option>All grades</option><option>Grade 4</option><option>Grade 5</option><option>Grade 6</option></select><select value={section} onChange={e=>{setSection(e.target.value);setPage(1)}} aria-label="Filter by section"><option>All sections</option><option>Mabini</option></select><Button variant="outline" size="sm" onClick={exportCsv}><Download/>Export</Button></div>
      <table><thead><tr><th>Learner</th><th>Student ID</th><th>Class</th><th>Average</th><th>Attendance</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{pageRows.map(student=><tr key={student.id}><td><Avatar initials={student.initials} tone={student.tone}/><b>{student.name}</b></td><td>{student.id}</td><td>{student.grade} · {student.section}</td><td><b>{student.avg}</b></td><td>{student.att}</td><td><Badge variant={student.status==="Active"?"success":student.status==="Archived"?"secondary":"warning"}>{student.status}</Badge></td><td><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="row-menu" aria-label={`Actions for ${student.name}`}><Ellipsis/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>{setSelectedStudent(student);setStudentMode("view")}}><Eye/>View profile</DropdownMenuItem><DropdownMenuItem onSelect={()=>{setSelectedStudent(student);setStudentMode("edit")}}><PenLine/>Edit record</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>{setStudents(current=>current.map(item=>item.id===student.id?{...item,status:item.status==="Archived"?"Active":"Archived"}:item));toast.success(`${student.name} status updated`)}}><FileClock/>Toggle archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>)}</tbody></table>
      {!filtered.length&&<div className="empty"><Search/><b>No matching learner records</b><span>Try changing your search or filters.</span></div>}
      <footer><span>Showing {filtered.length?`${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)}`:"0"} of {filtered.length} matching learners</span><div className="pagination"><Button variant="outline" size="icon" aria-label="Previous page" disabled={page===1} onClick={()=>setPage(current=>current-1)}><ChevronLeft/></Button><span>Page {page} of {totalPages}</span><Button variant="outline" size="icon" aria-label="Next page" disabled={page===totalPages} onClick={()=>setPage(current=>current+1)}><ChevronRight/></Button></div></footer>
    </Card>
    <Dialog open={Boolean(selectedStudent)} onOpenChange={open=>!open&&setSelectedStudent(null)}><DialogContent>{selectedStudent&&<>{studentMode==="view"?<><DialogHeader><DialogTitle>Learner profile</DialogTitle><DialogDescription>Current information stored in the demo record.</DialogDescription></DialogHeader><div className="profile-summary"><Avatar initials={selectedStudent.initials} tone={selectedStudent.tone}/><div><b>{selectedStudent.name}</b><span>{selectedStudent.id}</span></div></div><dl className="detail-grid"><div><dt>Class</dt><dd>{selectedStudent.grade} · {selectedStudent.section}</dd></div><div><dt>General average</dt><dd>{selectedStudent.avg||"Not entered"}</dd></div><div><dt>Attendance</dt><dd>{selectedStudent.att}</dd></div><div><dt>Status</dt><dd>{selectedStudent.status}</dd></div></dl><DialogFooter><Button variant="outline" onClick={()=>setSelectedStudent(null)}>Close</Button><Button onClick={()=>setStudentMode("edit")}><PenLine/>Edit record</Button></DialogFooter></>:<StudentEditForm student={selectedStudent} cancel={()=>setSelectedStudent(null)} save={updated=>{setStudents(current=>current.map(item=>item.id===updated.id?updated:item));setSelectedStudent(null);toast.success("Student record updated")}}/>}</>}</DialogContent></Dialog>
  </>
}

function StudentEditForm({student,cancel,save}:{student:Student;cancel:()=>void;save:(student:Student)=>void}){return <><DialogHeader><DialogTitle>Edit learner record</DialogTitle><DialogDescription>Update the learner’s current profile information.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);save({...student,name:String(data.get("name")),grade:String(data.get("grade")),section:String(data.get("section")),status:String(data.get("status")),avg:Number(data.get("average"))})}}><Label htmlFor="edit-name">Full name</Label><Input id="edit-name" name="name" defaultValue={student.name} required/><div className="dialog-grid"><div><Label htmlFor="edit-grade">Grade</Label><select id="edit-grade" name="grade" defaultValue={student.grade}><option>Grade 4</option><option>Grade 5</option><option>Grade 6</option></select></div><div><Label htmlFor="edit-section">Section</Label><Input id="edit-section" name="section" defaultValue={student.section} required/></div></div><div className="dialog-grid"><div><Label htmlFor="edit-average">General average</Label><Input id="edit-average" name="average" type="number" min="0" max="100" defaultValue={student.avg}/></div><div><Label htmlFor="edit-status">Status</Label><select id="edit-status" name="status" defaultValue={student.status}><option>Active</option><option>Needs review</option><option>Archived</option></select></div></div><DialogFooter><Button type="button" variant="outline" onClick={cancel}>Cancel</Button><Button type="submit"><Save/>Save changes</Button></DialogFooter></form></>}

function Academic(){
  const[quarter,setQuarter]=useState("Quarter 1")
  const[gradeOpen,setGradeOpen]=useState(false)
  const[records,setRecords]=useState(initialStudents.map(student=>({id:student.id,name:student.name,math:student.avg,english:student.avg-1,science:student.avg+1,filipino:student.avg-2})))
  const[selectedRecordId,setSelectedRecordId]=useState(initialStudents[0].id)
  const selectedRecord=records.find(record=>record.id===selectedRecordId)??records[0]
  const saveGrades=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=new FormData(event.currentTarget);const id=String(data.get("learner"));setRecords(current=>current.map(record=>record.id===id?{...record,math:Number(data.get("math")),english:Number(data.get("english")),science:Number(data.get("science")),filipino:Number(data.get("filipino"))}:record));setGradeOpen(false);toast.success("Grades saved")}
  return <><PageHead eyebrow="Academic records" title="Grades & performance" text="Track learner progress and prepare class records for each grading period." action={<Button size="sm" onClick={()=>setGradeOpen(true)}><PenLine/>Enter grades</Button>}/>
    <div className="academic-filter"><Label htmlFor="quarter">Grading period</Label><select id="quarter" value={quarter} onChange={e=>setQuarter(e.target.value)}><option>Quarter 1</option><option>Quarter 2</option><option>Quarter 3</option><option>Quarter 4</option></select></div>
    <div className="subjects">{["Mathematics","English","Science","Filipino"].map((subject,index)=><Card className="card" key={subject}><span className="subject-icon"><BookOpen/></span><p><b>{subject}</b><small>Grade 6 · {quarter}</small></p><strong>{["90.2","88.7","89.4","87.9"][index]}</strong><Badge variant="success">Up {["3.1","1.4","2.2","0.8"][index]}</Badge></Card>)}</div>
    <Card className="card table-card"><SectionHead title="Class performance" subtitle={`Grade 6 – Mabini · ${quarter}`}/><table><thead><tr><th>Learner</th><th>Mathematics</th><th>English</th><th>Science</th><th>Filipino</th><th>General average</th></tr></thead><tbody>{records.map(record=>{const average=Math.round((record.math+record.english+record.science+record.filipino)/4*10)/10;return <tr key={record.id}><td><b>{record.name}</b></td><td>{record.math}</td><td>{record.english}</td><td>{record.science}</td><td>{record.filipino}</td><td><Badge variant={average>=90?"success":"secondary"}>{average.toFixed(1)}</Badge></td></tr>})}</tbody></table></Card>
    <Dialog open={gradeOpen} onOpenChange={setGradeOpen}><DialogContent><DialogHeader><DialogTitle>Enter learner grades</DialogTitle><DialogDescription>Update subject scores for {quarter}. Values are saved for this session.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={saveGrades}><Label htmlFor="grade-learner">Learner</Label><select id="grade-learner" name="learner" value={selectedRecordId} onChange={event=>setSelectedRecordId(event.target.value)}>{records.map(record=><option value={record.id} key={record.id}>{record.name}</option>)}</select><div className="dialog-grid" key={selectedRecordId}><div><Label htmlFor="math">Mathematics</Label><Input id="math" name="math" type="number" min="0" max="100" defaultValue={selectedRecord.math} required/></div><div><Label htmlFor="english">English</Label><Input id="english" name="english" type="number" min="0" max="100" defaultValue={selectedRecord.english} required/></div><div><Label htmlFor="science">Science</Label><Input id="science" name="science" type="number" min="0" max="100" defaultValue={selectedRecord.science} required/></div><div><Label htmlFor="filipino">Filipino</Label><Input id="filipino" name="filipino" type="number" min="0" max="100" defaultValue={selectedRecord.filipino} required/></div></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setGradeOpen(false)}>Cancel</Button><Button type="submit"><Save/>Save grades</Button></DialogFooter></form></DialogContent></Dialog>
  </>
}

function Attendance({students}:{students:Student[]}){
  const[present,setPresent]=useState<Record<string,boolean>>({})
  const[notes,setNotes]=useState<Record<string,string>>({})
  const[noteStudent,setNoteStudent]=useState<Student|null>(null)
  const[savedAt,setSavedAt]=useState("")
  const marked=Object.keys(present).length
  const count=Object.values(present).filter(Boolean).length
  return <><PageHead eyebrow="Daily class record" title="Attendance" text={savedAt?`Thursday, September 4 · Saved ${savedAt}`:"Thursday, September 4 · Grade 6 – Mabini"} action={<Button size="sm" onClick={()=>{setSavedAt(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));toast.success(`Attendance saved for ${marked} marked learners`)}} disabled={!marked}><Check/>Save attendance</Button>}/>
    <div className="att-summary"><Card className="card"><span>Present</span><b>{count}</b><small>of {students.length} demo learners</small></Card><Card className="card"><span>Absent</span><b>{marked-count}</b><small>requires follow-up</small></Card><Card className="card"><span>Class rate</span><b>{marked?Math.round(count/marked*100)+"%":"—"}</b><small>among marked learners</small></Card></div>
    <Card className="card table-card"><div className="toolbar"><strong>Class list</strong><Button variant="outline" size="sm" onClick={()=>setPresent(Object.fromEntries(students.map(student=>[student.id,true])))}><Check/>Mark all present</Button></div><table><thead><tr><th>Learner</th><th>Status</th><th>Arrival</th><th>Note</th></tr></thead><tbody>{students.map((student,index)=><tr key={student.id}><td><Avatar initials={student.initials} tone={student.tone}/><b>{student.name}</b></td><td><div className="toggle"><button className={present[student.id]?"on":""} onClick={()=>setPresent({...present,[student.id]:true})}><Check/>Present</button><button className={present[student.id]===false?"off":""} onClick={()=>setPresent({...present,[student.id]:false})}>Absent</button></div></td><td>7:{42+index} AM</td><td><Button variant="ghost" size="sm" onClick={()=>setNoteStudent(student)}>{notes[student.id]?<PenLine/>:<Plus/>}{notes[student.id]?"Edit note":"Add note"}</Button></td></tr>)}</tbody></table></Card>
    <Dialog open={Boolean(noteStudent)} onOpenChange={open=>!open&&setNoteStudent(null)}><DialogContent>{noteStudent&&<><DialogHeader><DialogTitle>Attendance note</DialogTitle><DialogDescription>Add a private attendance note for {noteStudent.name}.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setNotes({...notes,[noteStudent.id]:String(data.get("note"))});setNoteStudent(null);toast.success("Attendance note saved")}}><Label htmlFor="attendance-note">Note</Label><textarea id="attendance-note" name="note" className="textarea" defaultValue={notes[noteStudent.id]} placeholder="Reason for absence, late arrival, or follow-up…" required/><DialogFooter><Button type="button" variant="outline" onClick={()=>setNoteStudent(null)}>Cancel</Button><Button type="submit"><Save/>Save note</Button></DialogFooter></form></>}</DialogContent></Dialog>
  </>
}

function Planning(){
  const[selectedDay,setSelectedDay]=useState(3)
  const days=["MON 1","TUE 2","WED 3","THU 4","FRI 5"]
  const[plans,setPlans]=useState([{id:1,subject:"Mathematics",title:"Fractions: Addition & Subtraction",time:"8:00–9:00 AM",status:"Ready",objectives:"Add and subtract fractions with unlike denominators."},{id:2,subject:"English",title:"Identifying Main Ideas",time:"9:15–10:15 AM",status:"Ready",objectives:"Identify the main idea and supporting details in a short text."},{id:3,subject:"Science",title:"The Water Cycle",time:"10:30–11:30 AM",status:"Draft",objectives:"Explain evaporation, condensation, and precipitation."},{id:4,subject:"Filipino",title:"Mga Bahagi ng Pananalita",time:"1:00–2:00 PM",status:"Ready",objectives:"Matukoy ang bahagi ng pananalita sa pangungusap."}])
  const[planOpen,setPlanOpen]=useState(false)
  const[editingPlan,setEditingPlan]=useState<(typeof plans)[number]|null>(null)
  const openNew=()=>{setEditingPlan(null);setPlanOpen(true)}
  const savePlan=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=new FormData(event.currentTarget);const values={subject:String(data.get("subject")),title:String(data.get("title")),time:String(data.get("time")),status:String(data.get("status")),objectives:String(data.get("objectives"))};if(editingPlan)setPlans(current=>current.map(plan=>plan.id===editingPlan.id?{...plan,...values}:plan));else setPlans(current=>[...current,{id:Date.now(),...values}]);setPlanOpen(false);toast.success(editingPlan?"Lesson plan updated":"Lesson plan created")}
  return <><PageHead eyebrow="Teaching workspace" title="Lesson planning" text="Create structured, curriculum-aligned plans and keep your week organized." action={<Button size="sm" onClick={openNew}><Plus/>New lesson plan</Button>}/><div className="week">{days.map((day,index)=><button className={index===selectedDay?"now":""} onClick={()=>setSelectedDay(index)} key={day}>{day.split(" ")[0]}<b>{day.split(" ")[1]}</b></button>)}</div><div className="plans">{plans.map(plan=><Card className="card" key={plan.id}><span className="plan-accent"/><span>{plan.time}</span><h3>{plan.title}</h3><p>{plan.subject} · Grade 6 – Mabini</p><Badge variant={plan.status==="Ready"?"success":"warning"}>{plan.status}</Badge><Button variant="outline" size="sm" onClick={()=>{setEditingPlan(plan);setPlanOpen(true)}}>Open plan<ChevronRight/></Button></Card>)}</div><Dialog open={planOpen} onOpenChange={setPlanOpen}><DialogContent><DialogHeader><DialogTitle>{editingPlan?"Edit lesson plan":"Create a lesson plan"}</DialogTitle><DialogDescription>Plan the class topic, schedule, and readiness status.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={savePlan}><Label htmlFor="plan-subject">Subject</Label><select id="plan-subject" name="subject" defaultValue={editingPlan?.subject??"Mathematics"}><option>Mathematics</option><option>English</option><option>Science</option><option>Filipino</option></select><Label htmlFor="plan-title">Lesson title</Label><Input id="plan-title" name="title" defaultValue={editingPlan?.title} placeholder="Enter the learning topic" required/><div className="dialog-grid"><div><Label htmlFor="plan-time">Time</Label><Input id="plan-time" name="time" defaultValue={editingPlan?.time??"8:00–9:00 AM"} required/></div><div><Label htmlFor="plan-status">Status</Label><select id="plan-status" name="status" defaultValue={editingPlan?.status??"Draft"}><option>Draft</option><option>Ready</option></select></div></div><Label htmlFor="plan-objectives">Learning objectives</Label><textarea id="plan-objectives" name="objectives" className="textarea" placeholder="Describe what learners should know or demonstrate…" defaultValue={editingPlan?.objectives??""} required/><DialogFooter><Button type="button" variant="outline" onClick={()=>setPlanOpen(false)}>Cancel</Button><Button type="submit"><Save/>Save lesson plan</Button></DialogFooter></form></DialogContent></Dialog></>
}

function Documents({students,school,year}:{students:Student[];school:string;year:string}){
  const[generatorOpen,setGeneratorOpen]=useState(false)
  const[selectedType,setSelectedType]=useState("Report cards")
  const[schoolClass,setSchoolClass]=useState("Grade 6 – Mabini")
  const[period,setPeriod]=useState("Quarter 1")
  const[scope,setScope]=useState("All learner records")
  const[format,setFormat]=useState<OutputFormat>("PDF")
  const[selectedStudentId,setSelectedStudentId]=useState(students[0]?.id??"")
  const[generating,setGenerating]=useState(false)
  const[recent,setRecent]=useState<GeneratedDocument[]>([])
  const classOptions=Array.from(new Set(students.map(student=>`${student.grade} – ${student.section}`)))
  const documents=[
    {icon:FileText,title:"Report cards",description:"Generate SF9 learner progress reports",status:"18 pending",warning:true,format:"PDF" as OutputFormat},
    {icon:FileSpreadsheet,title:"Class record",description:"Export quarterly class records",status:"Up to date",warning:false,format:"CSV" as OutputFormat},
    {icon:CalendarCheck,title:"Attendance report",description:"Monthly SF2 attendance summary",status:"Due Sep 18",warning:true,format:"CSV" as OutputFormat},
    {icon:SquareUserRound,title:"Student profile",description:"Complete learner information sheet",status:`${students.length} demo records`,warning:false,format:"PDF" as OutputFormat},
  ]
  const openGenerator=(type:string,defaultFormat:OutputFormat="PDF")=>{setSelectedType(type);setFormat(defaultFormat);setScope(type==="Student profile"?"Selected learner":"All learner records");setGeneratorOpen(true)}
  const safeText=(value:string)=>value.replaceAll("–","-").replaceAll("’","'")
  const download=async(item:GeneratedDocument)=>{
    const filename=item.name.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()
    if(item.format==="CSV"){
      const csv=[item.headers,...item.rows].map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(",")).join("\r\n")
      const blob=new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"})
      const url=URL.createObjectURL(blob)
      const link=document.createElement("a")
      link.href=url
      link.download=`${filename}.csv`
      link.click()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
      return
    }
    const{jsPDF}=await import("jspdf")
    const pdf=new jsPDF({unit:"mm",format:"a4"})
    pdf.setProperties({title:safeText(item.name),subject:safeText(`${item.type} for ${school}`),author:"EduArchive"})
    pdf.setFillColor(23,56,79)
    pdf.rect(0,0,210,27,"F")
    pdf.setTextColor(255,255,255)
    pdf.setFont("helvetica","bold")
    pdf.setFontSize(17)
    pdf.text("EduArchive",18,13)
    pdf.setFont("helvetica","normal")
    pdf.setFontSize(8)
    pdf.text("School Records & Student Management System",18,19)
    pdf.setTextColor(23,33,43)
    pdf.setFont("helvetica","bold")
    pdf.setFontSize(16)
    pdf.text(safeText(item.type),18,41)
    pdf.setFont("helvetica","normal")
    pdf.setFontSize(9)
    pdf.setTextColor(88,103,116)
    pdf.text(safeText(`${school} | School year ${year} | ${item.schoolClass} | ${item.period}`),18,48)
    let y=61
    item.rows.forEach((row,index)=>{
      if(y>272){pdf.addPage();y=22}
      pdf.setDrawColor(220,226,230)
      pdf.setFillColor(index%2===0?247:255,index%2===0?249:255,index%2===0?250:255)
      pdf.roundedRect(18,y-5,174,17,2,2,"FD")
      pdf.setFont("helvetica","bold")
      pdf.setFontSize(10)
      pdf.setTextColor(23,33,43)
      pdf.text(safeText(row[1]??row[0]??"Record"),23,y+1)
      pdf.setFont("helvetica","normal")
      pdf.setFontSize(7.5)
      pdf.setTextColor(88,103,116)
      const detail=item.headers.map((header,column)=>`${header}: ${safeText(row[column]??"")}`).filter((_,column)=>column!==1).join("   |   ")
      pdf.text(pdf.splitTextToSize(detail,162),23,y+7)
      y+=21
    })
    pdf.setFontSize(7)
    pdf.setTextColor(120,130,138)
    pdf.text(`Generated by EduArchive on ${new Date().toLocaleString()}`,18,289)
    pdf.save(`${filename}.pdf`)
  }
  const generate=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    setGenerating(true)
    try{
      const classStudents=students.filter(student=>`${student.grade} – ${student.section}`===schoolClass)
      const scopedStudents=scope==="Selected learner"?classStudents.filter(student=>student.id===selectedStudentId):scope==="Active learners only"?classStudents.filter(student=>student.status==="Active"):classStudents
      const headers=selectedType==="Class record"?["Student ID","Learner","Class","General average"]:selectedType==="Attendance report"?["Student ID","Learner","Attendance","Record status"]:selectedType==="Student profile"?["Student ID","Learner","Class","General average","Attendance","Enrollment status"]:["Student ID","Learner","Class","General average","Attendance","Status"]
      const rows=scopedStudents.map(student=>selectedType==="Class record"?[student.id,student.name,`${student.grade} - ${student.section}`,student.avg?String(student.avg):"Not entered"]:selectedType==="Attendance report"?[student.id,student.name,student.att,"Recorded"]:[student.id,student.name,`${student.grade} - ${student.section}`,student.avg?String(student.avg):"Not entered",student.att,student.status])
      if(!rows.length){toast.error("No learner records match the selected scope");return}
      const item:GeneratedDocument={id:Date.now(),name:`${selectedType} – ${schoolClass} – ${period}`,detail:`${rows.length} learner record${rows.length===1?"":"s"} · ${format}`,date:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),format,type:selectedType,schoolClass,period,headers,rows}
      await download(item)
      setRecent(current=>[item,...current])
      setGeneratorOpen(false)
      toast.success(`${format} generated and downloaded`)
    }catch{toast.error("The document could not be generated. Please try again.")}finally{setGenerating(false)}
  }
  return <>
    <PageHead eyebrow="Reports & printing" title="Documents" text="Generate official school records from the information already in your workspace." action={<Button size="sm" onClick={()=>openGenerator("Report cards","PDF")}><Plus/>Generate document</Button>}/>
    <div className="docs">{documents.map(item=><Card className="card" key={item.title}><span className="document-icon"><item.icon/></span><h3>{item.title}</h3><p>{item.description}</p><Badge variant={item.warning?"warning":"secondary"}>{item.status}</Badge><Button variant="outline" size="sm" onClick={()=>openGenerator(item.title,item.format)}>Open generator<ChevronRight/></Button></Card>)}</div>
    <Card className="card"><SectionHead title="Recently generated" subtitle="Download a fresh copy at any time"/>{recent.length?<div className="activity">{recent.map(item=><button key={item.id} onClick={()=>void download(item).catch(()=>toast.error("The file could not be downloaded"))}><span className="activity-icon">{item.format==="CSV"?<FileSpreadsheet/>:<FileText/>}</span><span><b>{item.name}</b><small>{item.detail}</small></span><time>{item.date}</time><Download/></button>)}</div>:<div className="empty recent-empty"><FileText/><b>No generated documents yet</b><span>Choose a document type above to create the first file.</span></div>}</Card>
    <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}><DialogContent><DialogHeader><DialogTitle>Generate a school document</DialogTitle><DialogDescription>Create a real PDF or CSV file using the learner records currently shown in this demo.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={generate}><Label htmlFor="document-type">Document type</Label><select id="document-type" value={selectedType} onChange={event=>{const next=event.target.value;setSelectedType(next);setFormat(next==="Class record"||next==="Attendance report"?"CSV":"PDF");setScope(next==="Student profile"?"Selected learner":"All learner records")}}><option>Report cards</option><option>Class record</option><option>Attendance report</option><option>Student profile</option></select><div className="dialog-grid"><div><Label htmlFor="document-class">Class</Label><select id="document-class" value={schoolClass} onChange={event=>{const next=event.target.value;setSchoolClass(next);setSelectedStudentId(students.find(student=>`${student.grade} – ${student.section}`===next)?.id??"")}}>{classOptions.map(option=><option key={option}>{option}</option>)}</select></div><div><Label htmlFor="document-period">Period</Label><select id="document-period" value={period} onChange={event=>setPeriod(event.target.value)}><option>Quarter 1</option><option>Quarter 2</option><option>Quarter 3</option><option>Quarter 4</option><option>August 2026</option></select></div><div><Label htmlFor="document-scope">Scope</Label><select id="document-scope" value={scope} onChange={event=>setScope(event.target.value)}><option>All learner records</option><option>Active learners only</option><option>Selected learner</option></select></div><div><Label htmlFor="document-format">Format</Label><select id="document-format" value={format} onChange={event=>setFormat(event.target.value as OutputFormat)}><option>PDF</option><option>CSV</option></select></div></div>{scope==="Selected learner"&&<><Label htmlFor="document-learner">Learner</Label><select id="document-learner" value={selectedStudentId} onChange={event=>setSelectedStudentId(event.target.value)}>{students.filter(student=>`${student.grade} – ${student.section}`===schoolClass).map(student=><option value={student.id} key={student.id}>{student.name} · {student.id}</option>)}</select></>}<div className="generator-summary"><FileText/><span><b>{selectedType}</b><small>{schoolClass} · {period} · {format}</small></span></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setGeneratorOpen(false)} disabled={generating}>Cancel</Button><Button type="submit" disabled={generating}><Printer/>{generating?"Preparing file…":`Generate ${format}`}</Button></DialogFooter></form></DialogContent></Dialog>
  </>
}

function AccessControl(){
  const[role,setRole]=useState("School administrator")
  const[inviteOpen,setInviteOpen]=useState(false)
  const[invites,setInvites]=useState<{email:string;role:string}[]>([])
  const modules=["Student records","Grades & assessments","Attendance","Lesson plans","Report cards","Users & access"]
  return <><PageHead eyebrow="Role-based security" title="Access control" text="Define what each role can view and manage across the school workspace." action={<Button size="sm" onClick={()=>setInviteOpen(true)}><UserPlus/>Invite user</Button>}/><div className="security"><ShieldCheck/><p><b>Security foundation</b><span>This matrix establishes least-privilege access for the MVP. Rate limiting, IP allowlisting, and geofencing are reserved for the production security phase.</span></p></div><div className="roles">{["School administrator","Teacher","Registrar","Viewer"].map(item=><button className={item===role?"active":""} onClick={()=>setRole(item)} key={item}>{item}</button>)}</div><Card className="card table-card"><SectionHead title={role} subtitle={role==="School administrator"?"Full school-level oversight and user management":"Scoped access based on assigned responsibilities"}/><table><thead><tr><th>Module</th><th>View</th><th>Create & edit</th><th>Delete</th><th>Export</th></tr></thead><tbody>{modules.map((module,index)=><tr key={module}><td><b>{module}</b></td>{[0,1,2,3].map(column=>{const allowed=!((role==="Viewer"&&column>0)||(index===5&&column>0)||(column===2&&index>1));return <td className="center" key={column}><span className={allowed?"perm":"perm no"}>{allowed?<Check/>:"—"}</span></td>})}</tr>)}</tbody></table></Card>{invites.length>0&&<Card className="card pending-invites"><SectionHead title="Pending invitations" subtitle={`${invites.length} team member${invites.length===1?"":"s"} waiting to join`}/>{invites.map(invite=><div key={invite.email}><Mail/><span><b>{invite.email}</b><small>{invite.role}</small></span><Badge variant="secondary">Pending</Badge><Button variant="ghost" size="sm" onClick={()=>{setInvites(current=>current.filter(item=>item.email!==invite.email));toast.success("Invitation revoked")}}>Revoke</Button></div>)}</Card>}<h3 className="future-title">Planned security controls</h3><div className="future"><div><Wifi/><b>Rate limiting</b><small>Protect high-volume endpoints</small></div><div><LockKeyhole/><b>IP allowlisting</b><small>Restrict access by network</small></div><div><MapPin/><b>Geofencing</b><small>Location-based access rules</small></div></div>
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent><DialogHeader><DialogTitle>Invite a team member</DialogTitle><DialogDescription>Choose the access level they need. Permissions can be changed later.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);const email=String(data.get("email"));const inviteRole=String(data.get("role"));if(invites.some(invite=>invite.email===email)){toast.error("This email already has a pending invitation");return}setInvites(current=>[...current,{email,role:inviteRole}]);setInviteOpen(false);toast.success(`Invitation sent to ${email}`)}}><Label htmlFor="invite-email">DepEd email address</Label><Input id="invite-email" name="email" type="email" placeholder="teacher@deped.gov.ph" required/><Label htmlFor="invite-role">Role</Label><select id="invite-role" name="role" defaultValue="Teacher"><option>Teacher</option><option>Registrar</option><option>Viewer</option></select><DialogFooter><Button type="button" variant="outline" onClick={()=>setInviteOpen(false)}>Cancel</Button><Button type="submit"><UserPlus/>Send invitation</Button></DialogFooter></form></DialogContent></Dialog>
  </>
}

function AddStudentDialog({open,setOpen,students,onAdd}:{open:boolean;setOpen:(open:boolean)=>void;students:Student[];onAdd:(student:Student)=>void}){
  const submit=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=new FormData(event.currentTarget);const id=String(data.get("id")).trim();if(students.some(student=>student.id===id)){toast.error("This student ID is already in use");return}const name=String(data.get("name")).trim();const initials=name.split(" ").filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();onAdd({id,name,avg:0,att:"—",initials,tone:"blue",status:"Active",grade:String(data.get("grade")),section:String(data.get("section"))});setOpen(false);toast.success(`${name} was added to student records`)}
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add a learner</DialogTitle><DialogDescription>Create a demo learner profile. This record is kept only until the page is refreshed.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={submit}><Label htmlFor="student-name">Full name</Label><Input id="student-name" name="name" placeholder="Learner’s full name" required/><Label htmlFor="student-id">Student ID</Label><Input id="student-id" name="id" defaultValue={`2026-${String(46+students.length).padStart(4,"0")}`} required/><div className="dialog-grid"><div><Label htmlFor="student-grade">Grade level</Label><select id="student-grade" name="grade" defaultValue="Grade 6"><option>Grade 4</option><option>Grade 5</option><option>Grade 6</option></select></div><div><Label htmlFor="student-section">Section</Label><Input id="student-section" name="section" defaultValue="Mabini" required/></div></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit"><UserPlus/>Add learner</Button></DialogFooter></form></DialogContent></Dialog>
}

function WorkspaceDialogs({active,setActive,school,schools,setSchools,setSchool,profile,setProfile,settings,setSettings}:{active:WorkspaceDialog;setActive:(active:WorkspaceDialog)=>void;school:string;schools:School[];setSchools:React.Dispatch<React.SetStateAction<School[]>>;setSchool:(school:string)=>void;profile:Profile;setProfile:(profile:Profile)=>void;settings:AccountSettings;setSettings:(settings:AccountSettings)=>void}){
  const[helpQuery,setHelpQuery]=useState("")
  const[selectedTopic,setSelectedTopic]=useState("")
  const[resetSent,setResetSent]=useState(false)
  const topics=[
    {title:"Add and update learner records",guide:"Open Student records, choose Add student, and complete the learner profile. Use the row menu to review, edit, or archive an existing record."},
    {title:"Record daily attendance",guide:"Open Attendance, mark each learner present or absent, add any follow-up notes, then save the class record."},
    {title:"Enter quarterly grades",guide:"Open Academic, select the grading period, choose Enter grades, and save the four subject scores for a learner."},
    {title:"Generate report cards",guide:"Open Documents, select Report cards, choose the class and grading period, then generate and download the file from Recent files."},
    {title:"Manage roles and permissions",guide:"Open Access control to review the permission matrix by role or invite a team member with Teacher, Registrar, or Viewer access."},
  ]
  const close=()=>setActive(null)
  return <>
    <Dialog open={active==="schools"} onOpenChange={open=>!open&&close()}><DialogContent><DialogHeader><DialogTitle>Manage schools</DialogTitle><DialogDescription>Add school workspaces and choose the one currently displayed.</DialogDescription></DialogHeader><div className="school-list">{schools.map(item=><button className={school===item.name?"selected":""} key={item.id} onClick={()=>{setSchool(item.name);toast.success(`Switched to ${item.name}`)}}><Building2/><span><b>{item.name}</b><small>School ID {item.id} · {item.location}</small></span>{school===item.name&&<Check/>}</button>)}</div><form className="dialog-form compact-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);const item={name:String(data.get("school-name")).trim(),id:String(data.get("school-id")).trim(),location:String(data.get("location")).trim()};if(schools.some(existing=>existing.id===item.id)){toast.error("A school with this ID already exists");return}setSchools(current=>[...current,item]);setSchool(item.name);event.currentTarget.reset();toast.success("School workspace added")}}><b>Add another school</b><Input name="school-name" placeholder="School name" required/><div className="dialog-grid"><Input name="school-id" inputMode="numeric" placeholder="School ID" required/><Input name="location" placeholder="District" required/></div><Button type="submit" variant="outline"><Plus/>Add school</Button></form><DialogFooter><Button onClick={close}>Done</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={active==="profile"} onOpenChange={open=>!open&&close()}><DialogContent><DialogHeader><DialogTitle>My profile</DialogTitle><DialogDescription>Update the information shown to your school team.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setProfile({name:String(data.get("profile-name")),email:String(data.get("profile-email")),phone:String(data.get("profile-phone"))});close();toast.success("Profile saved")}}><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" name="profile-name" defaultValue={profile.name} required/><Label htmlFor="profile-email">DepEd email address</Label><Input id="profile-email" name="profile-email" type="email" defaultValue={profile.email} required/><Label htmlFor="profile-phone">Contact number</Label><Input id="profile-phone" name="profile-phone" defaultValue={profile.phone}/><DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit"><Save/>Save profile</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={active==="settings"} onOpenChange={open=>!open&&close()}><DialogContent><DialogHeader><DialogTitle>Account settings</DialogTitle><DialogDescription>Control notifications and default workspace behavior.</DialogDescription></DialogHeader><form className="dialog-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setSettings({emailReminders:Boolean(data.get("email-reminders")),attendanceAlerts:Boolean(data.get("attendance-alerts")),defaultPage:String(data.get("default-page")),sessionTimeout:String(data.get("session-timeout"))});close();toast.success("Account settings saved")}}><div className="setting-row"><span><b>Email reminders</b><small>Deadline and report submission reminders</small></span><input type="checkbox" name="email-reminders" defaultChecked={settings.emailReminders}/></div><div className="setting-row"><span><b>Attendance alerts</b><small>Notify me when a class falls below 90%</small></span><input type="checkbox" name="attendance-alerts" defaultChecked={settings.attendanceAlerts}/></div><Label htmlFor="default-page">Default page after login</Label><select id="default-page" name="default-page" defaultValue={settings.defaultPage}><option>Overview</option><option>Students</option><option>Attendance</option><option>Planning</option></select><Label htmlFor="session-timeout">Automatic sign-out</Label><select id="session-timeout" name="session-timeout" defaultValue={settings.sessionTimeout}><option>15 minutes</option><option>30 minutes</option><option>1 hour</option></select><Button type="button" variant="outline" disabled={resetSent} onClick={()=>{setResetSent(true);toast.success(`Password reset link sent to ${profile.email}`)}}><KeyRound/>{resetSent?"Reset link sent":"Send password reset link"}</Button><DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit"><Save/>Save settings</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={active==="help"} onOpenChange={open=>!open&&close()}><DialogContent><DialogHeader><DialogTitle>Help center</DialogTitle><DialogDescription>Find a workflow guide or contact your division administrator.</DialogDescription></DialogHeader><div className="search-field help-search"><Search/><Input value={helpQuery} onChange={event=>{setHelpQuery(event.target.value);setSelectedTopic("")}} placeholder="Search help topics…"/></div><div className="help-topics">{topics.filter(topic=>topic.title.toLowerCase().includes(helpQuery.toLowerCase())).map((topic,index)=><button className={selectedTopic===topic.title?"selected":""} key={topic.title} onClick={()=>setSelectedTopic(selectedTopic===topic.title?"":topic.title)}><span>{index+1}</span>{topic.title}<ChevronRight/></button>)}</div>{selectedTopic&&<div className="help-guide"><BookOpen/><span><b>{selectedTopic}</b><small>{topics.find(topic=>topic.title===selectedTopic)?.guide}</small></span></div>}<div className="support-card"><Mail/><span><b>Division support</b><small>schoolsupport@deped.gov.ph · Weekdays, 8:00 AM–5:00 PM</small></span><Button variant="outline" size="sm" asChild><a href="mailto:schoolsupport@deped.gov.ph">Email</a></Button></div><DialogFooter><Button onClick={close}>Close</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={active==="calendar"} onOpenChange={open=>!open&&close()}><DialogContent><DialogHeader><DialogTitle>September 2026 school calendar</DialogTitle><DialogDescription>Upcoming academic and submission dates for San Isidro Elementary School.</DialogDescription></DialogHeader><div className="calendar-list"><div><span>12<small>SEP</small></span><p><b>Quarter 1 report cards</b><small>18 records remaining</small></p><Badge variant="warning">Due soon</Badge></div><div><span>18<small>SEP</small></span><p><b>Monthly attendance report</b><small>Division office submission</small></p></div><div><span>25<small>SEP</small></span><p><b>Faculty planning meeting</b><small>2:00 PM · School library</small></p></div></div><DialogFooter><Button variant="outline" onClick={()=>{const blob=new Blob(["September 12 - Quarter 1 report cards\nSeptember 18 - Monthly attendance report\nSeptember 25 - Faculty planning meeting"],{type:"text/plain"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="september-2026-school-calendar.txt";a.click();URL.revokeObjectURL(url)}}><Download/>Export calendar</Button><Button onClick={close}>Done</Button></DialogFooter></DialogContent></Dialog>
  </>
}
