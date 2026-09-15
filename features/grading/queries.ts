import "server-only";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireSession} from "@/lib/auth/session";
export async function getGradingSettings(school:string){
 if(!z.uuid().safeParse(school).success)notFound();
 const {client}=await requireSession();
 const {data:access,error}=await client.rpc("can_configure_grading",{target_school:school});
 if(error)throw new Error("Grading setup is unavailable. Check the grading migration.");
 if(!access)notFound();
 const [years,schemes]=await Promise.all([
  client.from("school_years").select("id,name,starts_on,ends_on").eq("school_id",school).order("starts_on",{ascending:false}).limit(100),
  client.from("grading_schemes").select("*").eq("school_id",school).order("name").limit(50),
 ]);
 if(years.error||schemes.error)throw new Error("Grading setup could not be loaded.");
 const ids=schemes.data.map(s=>s.id);
 // Bounded at 50 schemes × 12 periods / 20 components.
 const [periods,components]=ids.length?await Promise.all([
  client.from("grading_periods").select("*").in("scheme_id",ids).order("starts_on").limit(600),
  client.from("grading_components").select("*").in("scheme_id",ids).order("name").limit(1000),
 ]):[{data:[],error:null},{data:[],error:null}];
 if(periods.error||components.error)throw new Error("Grading entries could not be loaded.");
 return {years:years.data,schemes:schemes.data,periods:periods.data??[],components:components.data??[]};
}
export async function getAssessmentGrading(assessment:{id:string;school_id:string;offering_id:string}){
 const {client}=await requireSession();
 const {data:offering,error:oError}=await client.from("subject_offerings").select("class_id").eq("id",assessment.offering_id).single();
 if(oError)throw new Error("Subject could not be loaded.");
 const {data:classroom,error:cError}=await client.from("classes").select("school_year_id").eq("id",offering.class_id).single();
 if(cError)throw new Error("School year could not be loaded.");
 const book=await client.from("subject_gradebooks").select("scheme_id").eq("offering_id",assessment.offering_id).maybeSingle();
 if(book.error)throw new Error("Subject grading scheme could not be loaded.");
 let schemeQuery=client.from("grading_schemes").select("id,name").eq("school_id",assessment.school_id).eq("school_year_id",classroom.school_year_id).not("approved_at","is",null).order("name").limit(50);
 if(book.data)schemeQuery=schemeQuery.eq("id",book.data.scheme_id);
 const [schemes,link]=await Promise.all([
  schemeQuery,
  client.from("assessment_grading").select("scheme_id,period_id,component_id").eq("assessment_id",assessment.id).maybeSingle(),
 ]);
 if(schemes.error||link.error)throw new Error("Assessment grading settings could not be loaded.");
 // Include a linked scheme even when it falls outside the selection list.
 if(link.data&&!schemes.data.some(s=>s.id===link.data!.scheme_id)){
  const detail=await client.from("grading_schemes").select("id,name").eq("id",link.data.scheme_id).single();
  if(detail.error)throw new Error("Linked scheme could not be loaded.");
  if(schemes.data.length===50)schemes.data.pop();
  schemes.data.push(detail.data);
 }
 const ids=schemes.data.map(s=>s.id);
 const [periods,components]=ids.length?await Promise.all([
  client.from("grading_periods").select("*").in("scheme_id",ids).order("starts_on").limit(600),
  client.from("grading_components").select("*").in("scheme_id",ids).order("name").limit(1000),
 ]):[{data:[],error:null},{data:[],error:null}];
 if(periods.error||components.error)throw new Error("Grading options could not be loaded.");
 return {schemes:schemes.data,link:link.data,periods:periods.data??[],components:components.data??[]};
}
