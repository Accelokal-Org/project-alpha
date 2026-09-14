// Local fixture provisioning only. Never imported by the application.
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_USER_PASSWORD;
if (!url || !['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname)) {
 throw new Error('Fixture users can only be provisioned against local Supabase.');
}
if (!key || !password || password.length < 12) throw new Error('Set the local service role key and a seed password of at least 12 characters in .env.local.');
const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const school_id = '10000000-0000-4000-8000-000000000001';
const { data: school, error: schoolError } = await client.from('schools').select('id').eq('id',school_id).single();
if (schoolError || !school) throw new Error('Run the local database reset and seed before provisioning fixture users.');
const fixtures = [
 {email:'andrea@example.test',roles:['TEACHER','ADVISER'],table:'teachers',column:'employee_code',code:'T-001'},
 {email:'daniel@example.test',roles:['TEACHER','ADVISER'],table:'teachers',column:'employee_code',code:'T-002'},
 {email:'sofia@example.test',roles:['STUDENT'],table:'students',column:'student_code',code:'STU-2026-0001'},
 {email:'miguel@example.test',roles:['STUDENT'],table:'students',column:'student_code',code:'STU-2026-0002'},
 {email:'head@example.test',roles:['SCHOOL_HEAD']},
 {email:'manager@example.test',roles:['APP_MANAGER']},
];
const existing = new Map();
for (let page=1;;page++) {
 const { data, error } = await client.auth.admin.listUsers({page,perPage:100});
 if (error) throw new Error('Unable to list local fixture users.');
 for (const user of data.users) existing.set(user.email,user.id);
 if (data.users.length < 100) break;
}
for (const fixture of fixtures) {
 let id = existing.get(fixture.email);
 if (!id) {
  const { data, error } = await client.auth.admin.createUser({email:fixture.email,password,email_confirm:true});
  if (error || !data.user) throw new Error(`Could not create ${fixture.email}.`);
  id = data.user.id;
 }
 const { error: membershipError } = await client.from('school_memberships').upsert(fixture.roles.map(role => ({school_id,user_id:id,role})));
 if (membershipError) throw new Error(`Could not assign roles for ${fixture.email}.`);
 if (fixture.table) {
  const { data, error } = await client.from(fixture.table).update({user_id:id}).eq('school_id',school_id).eq(fixture.column,fixture.code).select('id');
  if (error || data.length !== 1) throw new Error(`Could not connect the school profile for ${fixture.email}.`);
 }
 console.log(`Ready: ${fixture.email} (${fixture.roles.join(', ')})`);
}
console.log('Existing accounts retain their current passwords. New accounts use SEED_USER_PASSWORD.');
