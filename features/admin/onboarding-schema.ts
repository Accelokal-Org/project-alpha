import {z} from "zod";
export const schoolOnboardingSchema=z.object({request_id:z.uuid(),school_name:z.string().trim().min(1,"Enter the school name.").max(200),head_email:z.string().trim().toLowerCase().pipe(z.email("Enter a valid school head email address.").max(254)),first_name:z.string().trim().min(1,"Enter the school head’s first name.").max(100),last_name:z.string().trim().min(1,"Enter the school head’s last name.").max(100)});
export const onboardingResult=z.object({id:z.uuid(),school_id:z.uuid(),status:z.string()});
export const onboardingMessages:Record<string,string>={
 pending:"School created. Continue setup to invite the school head.",
 processing:"School created. Invitation processing started. If this was interrupted, check Supabase Users and email logs, then connect any missing School Head access in Accounts. Do not create the school again.",
 invited:"School created and School Head access assigned. The invitation was accepted for delivery. The school head can open it to confirm their profile and set a password.",
 linked:"School created and the existing account connected as School Head. No new invitation was sent. They can use their existing sign-in or their previously received invitation.",
 retry:"School created. The email provider rate limit was reached. Wait before continuing this saved setup; it will reuse the same school.",
 review:"School created, but delivery needs review. Check Supabase Users and email logs, then connect any missing School Head access in Accounts. Do not send another invitation until delivery is confirmed.",
};
