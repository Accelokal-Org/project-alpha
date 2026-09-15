import {getGradingSettings} from "@/features/grading/queries";
import {SchemeForm} from "./scheme-form";
export async function GradingSettings({school}:{school:string}){
 const data=await getGradingSettings(school);
 return <div className="space-y-5"><div><h2 className="text-xl font-semibold text-navy">Grading setup</h2><p className="text-sm text-muted mt-2">Prepare named schemes for a school year, then review and approve them. Teachers can link draft assessments to approved periods and components. Grade calculations and submission will follow.</p><p className="text-xs text-muted mt-2">Up to 50 schemes per school. Approved schemes remain locked.</p></div>
  {!data.years.length?<p className="text-muted">Add a school year in school administration before configuring grading.</p>:data.schemes.length<50&&<SchemeForm key={`new-${data.schemes.length}`} school={school} years={data.years} periods={[]} components={[]}/>}
  <p role="status" className="text-sm text-muted">{data.schemes.length} saved schemes · {data.schemes.filter(s=>s.approved_at).length} approved</p>
  {data.schemes.map(s=><SchemeForm key={`${s.id}-${s.version}`} school={school} years={data.years} scheme={s} periods={data.periods.filter(p=>p.scheme_id===s.id)} components={data.components.filter(c=>c.scheme_id===s.id)}/>)}
 </div>;
}
