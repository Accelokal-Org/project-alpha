# Deskonekt

**Your classes. Your work. One desk.**

by Accelokal

Deskonekt is a seamless academic workspace built around the teacher. It connects classes, schedules, lesson plans, attendance, assessments, scores, grades, and academic workflows in one practical workspace.

The product direction and brand usage are documented in the [product and design bible](docs/product-design-bible.md). The repository’s internal project identifier remains `project-alpha`.

The first vertical slice of the School Academic Records Platform described in **MVP Specs.pdf**: sign in, resolve school roles, open an authorized teaching/advisory assignment, and view its student roster.

Built with Next.js App Router, TypeScript, Tailwind and Supabase PostgreSQL/Auth. This is an initial foundation, not the full MVP.

## Run the preview

Requires Node.js 22.13+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000/preview. The preview is read-only and contains fictional records; it works without Supabase. Real workspace routes never fall back to demo data.

## Connect local Supabase

Docker must be running for the Supabase CLI. No hosted project is required for local development.

```sh
cp .env.example .env.local
npm run db:start
npm run db:reset
```

Copy the local API URL and publishable/anon key from `npx supabase status` into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. For local fixture provisioning, also set `SUPABASE_SERVICE_ROLE_KEY` to the local service-role key and choose a `SEED_USER_PASSWORD` of at least 12 characters. Keep these in the ignored `.env.local` file.

```sh
npm run db:users
npm run dev
```

`db:reset` rebuilds **local** data. The user provisioning script refuses non-local URLs. Existing fixture passwords are left unchanged.

| Local account | Roles |
| --- | --- |
| andrea@example.test | Teacher, adviser of Acacia |
| daniel@example.test | Teacher, adviser of Narra |
| sofia@example.test | Student, own profile/class only |
| miguel@example.test | Student, own profile/class only |
| head@example.test | School head, school-wide roster read access |
| manager@example.test | App manager, administrative roster read access |

All names and school records are fictional. Public signup is disabled locally. Application roles are assigned in database memberships, not user-editable Auth metadata.

## Validate

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest executes the real migration and seed in PGlite (embedded PostgreSQL) and verifies RLS as the `authenticated`/`anon` roles. It does not require Docker. Supabase Auth and PostgREST still require a full local Supabase smoke test. Playwright covers the preview roster and unauthenticated route protection.

`lib/supabase/database.types.ts` is an offline-generated initial schema snapshot. Its write shapes are deliberately permissive because this slice has no application database mutations. After starting local Supabase, run `npm run db:types` to replace it with full CLI-generated types and relationships before adding mutations.

See [setup and milestones](docs/implementation.md) and [the codebase map](codex.md).
