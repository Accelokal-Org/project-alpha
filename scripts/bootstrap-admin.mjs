// One-time operator setup. Run with the target project's .env.local; no SQL editing required.
import { createClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const email=process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.BOOTSTRAP_ADMIN_PASSWORD;
if(!url||!key||!email||!password||password.length<12) throw new Error('Set the Supabase URL, server service-role key, BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (at least 12 characters) in .env.local.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:existingAdmins,error:tableError}=await client.from('platform_admins').select('user_id').limit(1);
if(tableError) throw new Error('Admin tables are unavailable. Apply the versioned migrations first.');
if(existingAdmins.length) throw new Error('A platform superadmin already exists. Use the existing superadmin sign-in; bootstrap does not replace accounts.');
// Only create a new Auth account: do not promote or reset an existing account by email.
const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true});
if(error||!data.user) throw new Error('Could not create the superadmin account. Use a new email address and check Auth settings. No existing account was changed.');
const {error:adminError}=await client.from('platform_admins').insert({user_id:data.user.id});
if(adminError) {
 const {error:cleanupError}=await client.auth.admin.deleteUser(data.user.id);
 throw new Error(cleanupError?'Admin setup failed and the new unprivileged Auth account could not be removed. Review Auth users before retrying.':'Admin setup failed; the new account was removed. Check migrations and retry.');
}
const {error:auditError}=await client.from('admin_audit_log').insert({actor_id:data.user.id,action:'bootstrap_superadmin',entity_id:data.user.id,after_value:{user_id:data.user.id}});
console.log('Superadmin created. Open /deskonekt/admin/login and use your configured email and password.');
if(auditError) console.log('The account is ready, but its bootstrap audit event could not be recorded.');
console.log('Remove BOOTSTRAP_ADMIN_PASSWORD from .env.local after confirming sign-in. No invitation email was sent.');
