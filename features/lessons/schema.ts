import {z} from "zod";
export const lessonSchema=z.object({
 offering:z.uuid(), target:z.uuid().nullable(), expected_version:z.number().int().min(0),
 title:z.string().trim().min(1,"Enter a title.").max(200),
 objectives:z.string().max(10000), activities:z.string().max(20000), resources:z.string().max(10000),
 lesson_date:z.iso.date().nullable(), is_template:z.boolean(),
}).superRefine((value,context)=>{
 if(value.is_template ? value.lesson_date!==null : value.lesson_date===null)
  context.addIssue({code:"custom",path:["lesson_date"],message:"Choose a lesson date, or save as a reusable template."});
 if(value.target===null&&value.expected_version!==0)
  context.addIssue({code:"custom",path:["expected_version"],message:"Start a new plan and try again."});
});
