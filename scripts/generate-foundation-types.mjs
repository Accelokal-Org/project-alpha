// Offline snapshot generator for this initial read-only schema; use `npm run db:types`
// against local Supabase once Docker is available to obtain full generated relationships.
import { PGlite } from '@electric-sql/pglite';
import { readFile, writeFile } from 'node:fs/promises';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
await db.exec(await readFile('supabase/migrations/202609140001_foundation.sql','utf8'));
const { rows } = await db.query(`select table_name,column_name,data_type,is_nullable,udt_name
from information_schema.columns where table_schema='public' order by table_name,ordinal_position`);
const tables = Map.groupBy(rows, r => r.table_name);
let output = '// Generated from the foundation migration by scripts/generate-foundation-types.mjs.\n';
output += 'export type SchoolRole = "APP_MANAGER" | "SCHOOL_HEAD" | "TEACHER" | "ADVISER" | "STUDENT";\n';
output += 'type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };\n';
output += 'export type Database = { public: { Tables: {\n';
for (const [name, columns] of tables) {
 output += `${name}: Table<{\n`;
 for (const col of columns) {
  const type = col.udt_name === 'school_role' ? 'SchoolRole' : col.data_type === 'boolean' ? 'boolean' : ['integer','numeric'].includes(col.data_type) ? 'number' : 'string';
  output += `${col.column_name}: ${type}${col.is_nullable === 'YES' ? ' | null' : ''};\n`;
 }
 output += '}>;\n';
}
output += '}; Views: Record<never, never>; Functions: { staff_offerings: { Args: Record<never, never>; Returns: Database["public"]["Tables"]["subject_offerings"]["Row"][] } }; Enums: { school_role: SchoolRole }; CompositeTypes: Record<never, never> } };\n';
await writeFile('lib/supabase/database.types.ts',output);
await db.close();
