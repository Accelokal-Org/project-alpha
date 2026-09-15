import {z} from "zod";
export const periodSchema=z.object({name:z.string().trim().min(1).max(60),starts_on:z.iso.date(),ends_on:z.iso.date()}).refine(p=>p.ends_on>=p.starts_on,"Period end must follow its start.");
export const componentSchema=z.object({name:z.string().trim().min(1).max(60),weight:z.number().positive().max(100).refine(n=>Math.abs(n*100-Math.round(n*100))<0.000001,"Use up to two decimal places.")});
export const schemeSchema=z.object({target_school:z.uuid(),year_id:z.uuid(),target:z.uuid().nullable(),expected_version:z.number().int().min(0),scheme_name:z.string().trim().min(1).max(100),periods:z.array(periodSchema).min(1).max(12),components:z.array(componentSchema).min(1).max(20)}).superRefine((v,c)=>{
 for(const rows of [v.periods,v.components])if(new Set(rows.map(r=>r.name)).size!==rows.length)c.addIssue({code:"custom",message:"Use distinct names within periods and components."});
 const sorted=[...v.periods].sort((a,b)=>a.starts_on.localeCompare(b.starts_on));
 if(sorted.some((p,i)=>i>0&&p.starts_on<=sorted[i-1].ends_on))c.addIssue({code:"custom",message:"Grading periods cannot overlap."});
});
export const assignmentSchema=z.object({target:z.uuid(),expected_version:z.number().int().min(1),scheme:z.uuid().nullable(),period:z.uuid().nullable(),component:z.uuid().nullable()}).refine(v=>[v.scheme,v.period,v.component].every(x=>x===null)||[v.scheme,v.period,v.component].every(x=>x!==null),"Select a scheme, period, and component.");
