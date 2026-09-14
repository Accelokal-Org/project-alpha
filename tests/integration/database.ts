import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
export async function createTestDatabase() {
  const db = new PGlite();
  // Supabase supplies these roles/schema; reproduce them to test real Postgres RLS locally.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$; grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`);
  await db.exec(await readFile(new URL("../../supabase/migrations/202609140001_foundation.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../supabase/seed.sql", import.meta.url), "utf8"));
  return db;
}
