import { z } from "zod";
export const invitationSchema = z.object({
 school_id:z.uuid(), email:z.email().max(254).transform(v=>v.trim().toLowerCase()),
 roles:z.array(z.enum(["TEACHER","ADVISER","SCHOOL_HEAD","STUDENT"])).min(1,"Choose at least one role.").max(4),
 profile_id:z.union([z.uuid(),z.literal("")]),
}).refine(v=>!v.roles.includes("STUDENT") || v.roles.length===1,{message:"Choose Student separately from staff roles."})
 .refine(v=>v.roles.every(r=>r==="SCHOOL_HEAD") ? v.profile_id==="" : v.profile_id!=="",{message:"Choose a matching teacher or student profile; school-head-only accounts need no profile."});
