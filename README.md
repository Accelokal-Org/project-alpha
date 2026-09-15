# Deskonekt

**Your classes. Your work. One desk.**

by Accelokal

Deskonekt is a seamless academic workspace built around the teacher. It connects classes, schedules, lesson plans, attendance, assessments, scores, grades, and academic workflows in one practical workspace.

The product direction and brand usage are documented in the [product and design bible](docs/product-design-bible.md). The repository’s internal project identifier remains `project-alpha`.

The first vertical slice of the School Academic Records Platform described in **MVP Specs.pdf**: sign in, resolve school roles, open an authorized teaching/advisory assignment, and view its student roster.

Built with Next.js App Router, TypeScript, Tailwind and Supabase PostgreSQL/Auth. This is an initial foundation, not the full MVP.

## Superadmin

Open `/deskonekt/admin/login` for the separate superadmin sign-in. After the one-time Supabase connection and `npm run admin:bootstrap`, create schools, configure classes and accounts through the admin UI. No manual school SQL is needed.

See [superadmin setup](docs/superadmin.md) for the complete first-login steps. [Account invitations](docs/account-invitations.md) are available after provider/deployment setup. Billing is planned for later.

## Run the application

Requires Node.js 22.13+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000/login. Configure Supabase and sign in with your school account. No sample workspace or automatic sample data is included.

## Connect local Supabase

Docker must be running for the Supabase CLI. No hosted project is required for local development.

```sh
cp .env.example .env.local
npm run db:start
npm run db:reset
```

Copy the local API URL and public key from `npx supabase status` into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Keep these in the ignored `.env.local` file. Bootstrap the first administrator using the admin guide, then add schools and connect accounts through the website.

`db:reset` rebuilds **local** data with an empty schema; automatic seeding is disabled. Do not reset a database containing records you need.

## Remove previously created sample data

Apply `supabase/migrations/202609140003_remove_sample_data.sql` to the same Supabase project used by the application. See [database cleanup](docs/sample-data-removal.md) for scope and deployment instructions. Deploying the website alone does not apply SQL migrations.

## Validate

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Automated checks use isolated, in-memory PostgreSQL fixtures under `tests/fixtures/`; they do not populate the application database. Browser checks cover sign-in protection and removal of the preview. The live test-school creation script has been removed.

`lib/supabase/database.types.ts` is an offline-generated schema snapshot. Table insert/update shapes are partial; request handlers use typed, validated setup RPCs instead of direct table writes. After starting local Supabase, run `npm run db:types` to replace it with full CLI-generated types and relationships before adding direct table mutations.

See [setup and milestones](docs/implementation.md) and [the codebase map](codex.md).

## Email delivery

See [Resend email provider setup](docs/email-provider.md) for Supabase custom SMTP configuration and the remaining invitation/recovery workflow scope.

## Assessments and scores

Teachers can create subject assessments, save draft scores and explicitly publish individual results to students. Apply the [assessment migration and setup](docs/assessments.md) before deploying this workflow.

## Attendance

Configure school statuses in administration, then record subject attendance by date from the teacher workspace. Students see only their own saved marks. Apply the [attendance migration and setup](docs/attendance.md) before deployment.

Lesson plans, reusable templates and upcoming dashboard lessons: [setup and workflow](docs/lesson-plans.md).

Grading periods, component weights, approval and assessment classification: [setup and workflow](docs/grading.md).

School-controlled grade calculation and teacher submission: [setup and workflow](docs/grade-submission.md).

Adviser review, return reasons and teacher resubmission: [setup and workflow](docs/grade-review.md).
