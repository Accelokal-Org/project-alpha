// Offline snapshot generator for this initial read-only schema; use `npm run db:types`
// against local Supabase once Docker is available to obtain full generated relationships.
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir, writeFile } from 'node:fs/promises';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key, email text unique);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
for (const name of (await readdir('supabase/migrations')).filter(n => n.endsWith('.sql')).sort()) {
 await db.exec(await readFile(`supabase/migrations/${name}`,'utf8'));
}
const { rows } = await db.query(`select table_name,column_name,data_type,is_nullable,udt_name
from information_schema.columns where table_schema='public' order by table_name,ordinal_position`);
const tables = Map.groupBy(rows, r => r.table_name);
let output = '// Generated from versioned migrations by scripts/generate-foundation-types.mjs.\n';
output += 'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n';
output += 'export type SchoolRole = "APP_MANAGER" | "SCHOOL_HEAD" | "TEACHER" | "ADVISER" | "STUDENT";\n';
output += 'type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };\n';
output += 'export type Database = { public: { Tables: {\n';
for (const [name, columns] of tables) {
 output += `${name}: Table<{\n`;
 for (const col of columns) {
  const type = col.udt_name === 'school_role' ? 'SchoolRole' : col.data_type === 'jsonb' ? 'Json' : col.data_type === 'boolean' ? 'boolean' : ['integer','numeric'].includes(col.data_type) ? 'number' : 'string';
  output += `${col.column_name}: ${type}${col.is_nullable === 'YES' ? ' | null' : ''};\n`;
 }
 output += '}>;\n';
}
output += `}; Views: Record<never, never>; Functions: {
prepare_school_onboarding: { Args: { request_id: string; school_name: string; head_email: string; first_name: string; last_name: string }; Returns: Json };
claim_school_onboarding: { Args: { target: string }; Returns: Json };
finish_school_onboarding: { Args: { target: string; outcome: string; invited_user?: string }; Returns: undefined };
prepare_school_accounts: { Args: { target_school: string; entries: Json }; Returns: string };
claim_school_invitation: { Args: { target: string }; Returns: Json };
finish_school_invitation: { Args: { target: string; actor: string; outcome: string; invited_user?: string }; Returns: undefined };
correct_returned_assessment_scores: { Args: { target: string; expected_version: number; entries: Json; reason: string }; Returns: undefined };
class_grade_review: { Args: { target_class: string }; Returns: { offering_id: string; subject: string; period_id: string | null; period_name: string | null; status: string; revision: number | null }[] };
set_grade_lock: { Args: { target: string; expected_version: number; lock_record: boolean; reason: string }; Returns: undefined };
school_grade_completion: { Args: { target_school: string; target_year: string; page_number: number; status_filter: string }; Returns: Json };
report_card_source: { Args: { target_class: string; target_student: string }; Returns: Json };
save_report_card: { Args: { target_class: string; target_student: string; expected_version: number; expected_token: string }; Returns: number };
approve_report_card: { Args: { target: string; expected_version: number; expected_token: string }; Returns: undefined };
preview_report_card: { Args: { target_class: string; target_student: string }; Returns: Json };
can_review_grades: { Args: { offering: string }; Returns: boolean };
review_period_grades: { Args: { target: string; expected_version: number; decision: string; reason: string }; Returns: undefined };
resubmit_period_grades: { Args: { target: string; expected_version: number; expected_token: string; correction_note: string }; Returns: undefined };
approve_grade_calculation: { Args: { scheme: string; method: string; missing_scores: string; decimal_places: number }; Returns: undefined };
grade_period_options: { Args: { offering: string }; Returns: { id: string; name: string; scheme_id: string; scheme_name: string; starts_on: string; ends_on: string }[] };
preview_period_grades: { Args: { offering: string; period: string }; Returns: Json };
submit_period_grades: { Args: { offering: string; period: string; expected_token: string }; Returns: string };
can_configure_grading: { Args: { target_school: string }; Returns: boolean };
save_grading_scheme: { Args: { target_school: string; year_id: string; target: string | null; expected_version: number; scheme_name: string; periods: Json; components: Json }; Returns: string };
approve_grading_scheme: { Args: { target: string; expected_version: number }; Returns: undefined };
assign_assessment_grading: { Args: { target: string; expected_version: number; scheme: string | null; period: string | null; component: string | null }; Returns: undefined };
can_manage_lessons: { Args: { offering: string }; Returns: boolean };
save_lesson_plan: { Args: { offering: string; target: string | null; expected_version: number; title: string; objectives: string; activities: string; resources: string; lesson_date: string | null; is_template: boolean }; Returns: string };
my_upcoming_lessons: { Args: Record<never, never>; Returns: Database["public"]["Tables"]["lesson_plans"]["Row"][] };
staff_offerings: { Args: Record<never, never>; Returns: Database["public"]["Tables"]["subject_offerings"]["Row"][] };
is_app_manager: { Args: Record<never, never>; Returns: boolean };
admin_setup: { Args: { operation: string; payload: Json }; Returns: Json };
can_manage_assessments: { Args: { offering: string }; Returns: boolean };
create_assessment: { Args: { offering: string; title: string; assessment_date: string; max_score: number }; Returns: string };
save_assessment_scores: { Args: { target: string; expected_version: number; entries: Json }; Returns: undefined };
publish_assessment: { Args: { target: string; expected_version: number }; Returns: undefined };
my_published_scores: { Args: Record<never, never>; Returns: { assessment_id: string; title: string; assessment_date: string; subject: string; class_name: string; school: string; score: number; max_score: number; published_at: string }[] };
can_manage_attendance: { Args: { offering: string }; Returns: boolean };
configure_attendance_status: { Args: { target_school: string; status_code: string; status_label: string; enabled: boolean }; Returns: undefined };
save_attendance: { Args: { offering: string; day: string; expected_version: number; entries: Json; reason: string }; Returns: undefined };
my_attendance: { Args: Record<never, never>; Returns: { day_id: string; attendance_date: string; subject: string; class_name: string; school: string; status: string }[] };
admin_accounts: { Args: { target_school: string }; Returns: { user_id: string; email: string; role: SchoolRole }[] };
admin_invite_access: { Args: { target_school: string; account_email: string; account_roles: SchoolRole[]; profile?: string; invited_user?: string }; Returns: undefined };
}; Enums: { school_role: SchoolRole }; CompositeTypes: Record<never, never> } };\n`;
await writeFile('lib/supabase/database.types.ts',output);
await db.close();
