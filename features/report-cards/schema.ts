import {z} from "zod";
export const reportSchema=z.object({
 student:z.object({id:z.uuid(),name:z.string(),code:z.string()}),class:z.object({id:z.uuid(),name:z.string()}),school:z.string(),school_year:z.string(),ready:z.boolean(),total:z.number(),incomplete:z.number(),
 rows:z.array(z.object({offering_id:z.uuid(),subject:z.string(),code:z.string(),subject_class:z.string(),enrolled:z.boolean(),period_id:z.uuid().nullable(),period_name:z.string().nullable(),starts_on:z.string().nullable(),ends_on:z.string().nullable(),scheme_name:z.string().nullable(),submission_id:z.uuid().nullable(),revision:z.number().nullable(),review_version:z.number().nullable(),submission_status:z.string().nullable(),check_status:z.enum(["enrollment_review","scheme_missing","period_missing","submission_missing","not_locked","grade_missing","grade_invalid","complete"]),grade:z.number().nullable()})),
});
export const saveReportSchema=z.object({target_class:z.uuid(),target_student:z.uuid(),expected_version:z.number().int().min(0),expected_token:z.string().regex(/^[a-f0-9]{32}$/),confirmed:z.literal("on")});
export const approveReportSchema=z.object({target:z.uuid(),expected_version:z.number().int().positive(),expected_token:z.string().regex(/^[a-f0-9]{32}$/),confirmed:z.literal("on")});
