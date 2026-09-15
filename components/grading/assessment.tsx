import {getAssessmentGrading} from "@/features/grading/queries";
import {AssessmentGradingForm} from "./assessment-form";
export async function AssessmentGrading({assessment,canManage}:{assessment:{id:string;school_id:string;offering_id:string;version:number;assessment_date:string;published_at:string|null};canManage:boolean}){
 const data=await getAssessmentGrading(assessment);
 return <AssessmentGradingForm key={`${assessment.id}-${assessment.version}`} assessment={assessment} data={data} canManage={canManage}/>;
}
