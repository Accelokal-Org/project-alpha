import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
export async function createTestDatabase(beforeCleanup = false, excluded: string[] = []) {
  const db = new PGlite();
  // Supabase supplies these roles/schema; reproduce them to test real Postgres RLS locally.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text unique);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$; grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`);
  const directory = new URL("../../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(directory)).filter(n => n.endsWith(".sql")).sort()) {
    if (excluded.includes(name)) continue;
    if (beforeCleanup && name.startsWith("202609140003")) continue;
    await db.exec(await readFile(new URL(name,directory), "utf8"));
  }
  await db.exec(await readFile(new URL("../fixtures/school.sql", import.meta.url), "utf8"));
  return db;
}
