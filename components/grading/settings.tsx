import { CalculationRule } from "@/components/grades/calculation-rule";
import { requireSession } from "@/lib/auth/session";
import {getGradingSettings} from "@/features/grading/queries";
import {SchemeForm} from "./scheme-form";
export async function GradingSettings({school}:{school:string}){
 const data=await getGradingSettings(school);
 const {client}=await requireSession();
 const ids=data.schemes.map(s=>s.id);
 const rules=ids.length?await client.from("grade_calculation_rules").select("*").in("scheme_id",ids).limit(50):{data:[],error:null};
 if(rules.error)throw new Error("School calculation rules could not be loaded. Check the grade-submission migration.");
 return <div className="space-y-5"><div><h2 className="text-xl font-semibold text-navy">Grading setup</h2><p className="text-sm text-muted mt-2">Prepare named schemes for a school year, then review and approve them. Teachers can link draft assessments to approved periods and components. Approve a calculation rule for each approved scheme to enable teacher grade calculation and submission.</p><p className="text-xs text-muted mt-2">Up to 50 schemes per school. Approved schemes remain locked.</p></div>
  {!data.years.length?<p className="text-muted">Add a school year in school administration before configuring grading.</p>:data.schemes.length<50&&<SchemeForm key={`new-${data.schemes.length}`} school={school} years={data.years} periods={[]} components={[]}/>}
  <p role="status" className="text-sm text-muted">{data.schemes.length} saved schemes · {data.schemes.filter(s=>s.approved_at).length} approved</p>
  {data.schemes.map(s=><div key={s.id}><SchemeForm key={`${s.id}-${s.version}`} school={school} years={data.years} scheme={s} periods={data.periods.filter(p=>p.scheme_id===s.id)} components={data.components.filter(c=>c.scheme_id===s.id)}/>{s.approved_at&&<CalculationRule scheme={s.id} rule={rules.data?.find(r=>r.scheme_id===s.id)}/>}</div>)}
 </div>;
}
