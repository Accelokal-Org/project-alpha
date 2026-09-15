import {it,expect} from "vitest";
import {createAssessmentSchema,scoreSchema,publishSchema} from "@/features/assessments/schema";
const id="70000000-0000-4000-8000-000000000001";
it("validates assessment maxima and calendar dates",()=>{for(const max_score of [0,-1,NaN,Infinity,1.001])expect(createAssessmentSchema.safeParse({offering:id,title:"Quiz",assessment_date:"2026-09-15",max_score}).success).toBe(false);expect(createAssessmentSchema.safeParse({offering:id,title:"Quiz",assessment_date:"2026-02-30",max_score:20}).success).toBe(false);});
it("distinguishes zero from blank and requires explicit publish confirmation",()=>{expect(scoreSchema.safeParse({target:id,expected_version:1,entries:[{student_id:id,score:0}]}).success).toBe(true);expect(scoreSchema.safeParse({target:id,expected_version:1,entries:[{student_id:id,score:null}]}).success).toBe(true);expect(publishSchema.safeParse({target:id,expected_version:1}).success).toBe(false);});
