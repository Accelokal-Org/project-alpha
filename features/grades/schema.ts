import {z} from "zod";
export const calculationSchema=z.object({scheme:z.uuid(),method:z.enum(["total_points","average_percentages"]),missing_scores:z.enum(["block","zero"]),decimal_places:z.number().int().min(0).max(2),confirmed:z.literal("on")});
export const submissionSchema=z.object({offering:z.uuid(),period:z.uuid(),expected_token:z.string().regex(/^[0-9a-f]{32}$/),confirmed:z.literal("on")});
export const previewSchema=z.object({
 period_id:z.uuid(),period_name:z.string(),scheme_id:z.uuid(),scheme_name:z.string(),
 method:z.enum(["total_points","average_percentages"]),missing_scores:z.enum(["block","zero"]),decimal_places:z.number().int().min(0).max(2),
 students:z.array(z.object({id:z.uuid(),display_name:z.string(),student_code:z.string(),grade:z.number().nullable(),components:z.array(z.object({id:z.uuid(),name:z.string(),weight:z.number(),assessments:z.number(),missing:z.number(),earned:z.number(),possible:z.number(),weighted:z.number().nullable(),scores:z.array(z.object({assessment_id:z.uuid(),title:z.string(),score:z.number().nullable(),max_score:z.number()}))}))})),
 assessments:z.array(z.object({id:z.uuid(),title:z.string(),version:z.number(),max_score:z.number(),assessment_date:z.string(),component_id:z.uuid().nullable(),included:z.boolean().nullable()})),
 unclassified:z.number(),ready:z.boolean(),token:z.string(),
});
export type GradePreview=z.infer<typeof previewSchema>;
