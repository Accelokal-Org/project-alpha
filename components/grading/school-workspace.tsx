import { GradeCompletion } from "@/components/grades/completion";
import Link from "@/components/ui/navigation-link";
import {requireSession} from "@/lib/auth/session";
import {isAppManager} from "@/lib/auth/permissions";
import {notFound} from "next/navigation";
import {GradingSettings} from "./settings";
export async function SchoolGradingWorkspace({school,completion=false,query={}}:{school?:string;completion?:boolean;query?:{year?:string;page?:string;status?:string}}){
 const {client,memberships}=await requireSession();const manager=isAppManager(memberships);
 const ids=memberships.filter(m=>m.role==="SCHOOL_HEAD").map(m=>m.school_id);
 if(!manager&&!ids.length)notFound();
 let schoolQuery=client.from("schools").select("id,name").order("name").limit(200);
 if(!manager)schoolQuery=schoolQuery.in("id",ids);
 const {data,error}=await schoolQuery;
 if(error)throw new Error("Schools could not be loaded.");
 if(school&&!data.some(s=>s.id===school))notFound();
 return <div className="space-y-5"><Link href="/teacher" className="text-sm text-primary">Back to teacher workspace</Link><h1 className="text-2xl text-navy font-semibold">School grading</h1><nav aria-label="Choose school for grading" className="flex flex-wrap gap-4">{data.map(s=><Link key={s.id} aria-current={school===s.id?"page":undefined} className="text-sm text-primary" href={`/teacher?view=${completion?"completion":"grading"}&school=${s.id}`}>{s.name}</Link>)}</nav>{school?<><nav className="flex gap-4 text-sm text-primary" aria-label="School grading views"><Link href={`/teacher?view=grading&school=${school}`}>Grading setup</Link><Link href={`/teacher?view=completion&school=${school}`}>Completion dashboard</Link></nav>{completion?<GradeCompletion school={school} query={query}/>:<GradingSettings key={school} school={school}/>}</>:<p className="text-muted">Choose a school to configure grading.</p>}</div>;
}
