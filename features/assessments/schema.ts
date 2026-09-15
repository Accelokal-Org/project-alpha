import {z} from "zod";
const decimal=z.number().finite().min(0).max(100000).refine(n=>Math.abs(n*100-Math.round(n*100))<0.000001,"Use at most two decimal places.");
export const createAssessmentSchema=z.object({offering:z.uuid(),title:z.string().trim().min(1).max(200),assessment_date:z.iso.date(),max_score:decimal.refine(n=>n>0,"Maximum score must be greater than zero.")});
export const scoreSchema=z.object({target:z.uuid(),expected_version:z.number().int().positive(),entries:z.array(z.object({student_id:z.uuid(),score:decimal.nullable()})).max(500)}).refine(v=>new Set(v.entries.map(e=>e.student_id)).size===v.entries.length,"Each student can appear only once.");
export const publishSchema=z.object({target:z.uuid(),expected_version:z.number().int().positive(),confirmed:z.literal("on")});
