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
staff_offerings: { Args: Record<never, never>; Returns: Database["public"]["Tables"]["subject_offerings"]["Row"][] };
is_app_manager: { Args: Record<never, never>; Returns: boolean };
admin_setup: { Args: { operation: string; payload: Json }; Returns: Json };
admin_accounts: { Args: { target_school: string }; Returns: { user_id: string; email: string; role: SchoolRole }[] };
admin_record_test_account: { Args: { target_school: string; target_user: string }; Returns: undefined };
}; Enums: { school_role: SchoolRole }; CompositeTypes: Record<never, never> } };\n`;
await writeFile('lib/supabase/database.types.ts',output);
await db.close();
