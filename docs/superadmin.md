# Deskonekt superadmin

## Sign-in and location

- Dedicated sign-in: `/deskonekt/admin/login`
- Administration: `/deskonekt/admin`
- The area is omitted from school navigation and marked `noindex`. Every page, Server Action, and database setup function still checks superadmin authority.
- “Superadmin” is the UI name for platform-level App Manager access. Existing `APP_MANAGER` memberships remain supported. New installations use `platform_admins` so the first administrator does not depend on a school existing.

## First-time setup — no manual school SQL

Supabase must be connected once before accounts or schools can be saved. There is no built-in password or unauthenticated admin mode.

1. Copy `.env.example` to the ignored `.env.local` file. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
2. Apply the versioned migrations. For a new hosted development project, use `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. For local Supabase, start Docker and run `npm run db:start`; `npm run db:reset` applies migrations and recreates local fictional data. Do not use a reset against data you need to keep.
3. In `.env.local`, set the server-only `SUPABASE_SERVICE_ROLE_KEY`, a new `BOOTSTRAP_ADMIN_EMAIL`, and a `BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters. Use an email not already registered in Auth.
4. Run `npm run admin:bootstrap`. This creates the first Auth account and platform administrator entry without creating a school. It does not reset or promote an existing account and refuses to run when a platform superadmin already exists.
5. Start/restart the app with `npm run dev`. Open `/deskonekt/admin/login` and sign in with the email/password you configured.
6. Remove `BOOTSTRAP_ADMIN_PASSWORD` from `.env.local` after confirming sign-in. On a hosted application, set the public Supabase configuration in its deployment environment too; never make the service-role key a `NEXT_PUBLIC_` variable.

School creation and ongoing foundation setup now happen in the web UI. The service-role key is optional at runtime unless you want the “Create test login” control. Most admin writes use the signed-in caller’s session, not that key.

## What you can do now

| Area | Available controls |
| --- | --- |
| Schools | Create an empty school, edit its name/timezone, or create a separate fictional test school |
| Structure | Add school years, grade levels and classes |
| People | Add teacher and student profiles |
| Subjects | Add subjects and connect them to classes; open their actual rosters |
| Assignments | Assign subject teachers/advisers, enroll individual students in classes/subjects, and add a whole class to a subject |
| Accounts | Connect an existing Auth account by email to a school role/profile; create fictional test logins in test schools |
| Checks | Inspect setup readiness and open existing school workspaces for manual verification |
| Audit | Read the latest 30 setup changes for the selected school |

“Create test school” adds one fictional school year, two classes, two teachers, two subjects, twelve students, teaching assignments and enrollments in one transaction. It never inserts fixtures into an existing school. The fixture year and names are sample data, not school policy.

## Test the role-based journeys

1. Create a test school and open its **Accounts** tab.
2. Create a test login using an `@example.test` email and a password of at least 12 characters. This requires the server-only service-role key. No email is sent and no role is granted automatically.
3. Connect that email to **Teacher** and the appropriate teacher profile. Add **Adviser** separately to the same teacher when needed. Repeat with **Student** and a student profile. School heads do not require a teacher/student profile.
4. Use separate private windows or browser profiles to sign in at `/login`. A second tab in the same browser profile shares the session and can replace your superadmin session.
5. Verify teachers can open only their assigned subject rosters, advisers see their own class roster, and students see only their own profile/class. Use direct unrelated roster URLs as well as the navigation.

The superadmin workspace uses real superadmin authority; it does not impersonate another role. Its **Checks** tab inspects data readiness, not browser test execution.

## Validation

- `npm test` runs server boundary/auth tests and executes the real migrations in embedded PostgreSQL, exercising manager-only RPCs, tenant integrity, audit atomicity, denied privilege escalation and existing roster RLS.
- `npm run test:e2e` checks the dedicated admin login and unauthenticated route protection along with the public roster preview.
- For a full live Supabase journey, configure `RUN_ADMIN_LIVE_TESTS=true`, `E2E_ADMIN_EMAIL`, and `E2E_ADMIN_PASSWORD` in `.env.local`, then run `npm run test:admin:live`. Use a development/test project. Each run intentionally leaves a new fictional school for inspection; it does not delete records. The test is skipped without explicit opt-in and credentials.

## Security and limitations

- `admin_setup` exposes a fixed list of operations, validates again in PostgreSQL, and writes its audit record within the same transaction. No general SQL console or direct authenticated table-write permissions are exposed.
- Composite foreign keys reject references across schools. Account linking cannot grant `APP_MANAGER`, overwrite an already linked profile with a different account, or reset passwords.
- The elevated Auth client is isolated to creating `@example.test` logins after a fresh manager check and confirming the school is a test school. It never queries or changes academic records. Passwords are not logged or placed in audit payloads. A failed audit attempts to remove only the newly created Auth account.
- Ordinary teachers, advisers, students and school heads cannot enter this platform administration area. New platform administrators are managed through the operator bootstrap path, not school account linking.
- Editing existing entities beyond school name/timezone and adviser assignment, removing enrollments, account recovery, and role revocation UI are not included in this initial admin milestone.
- School listing is limited to the latest 200 schools; per-school lists inherit the 1,000-row Supabase API cap. Add server pagination before larger-scale rollout.
- Invitation emails and billing are reserved as future capabilities, as requested. This milestone does not send emails, create charges, or implement a billing provider.
- Scoring, attendance, scheduling, lesson planning and grade/report-card workflows remain future application milestones. They cannot yet be exercised from admin.

Implementation references: [Supabase Auth admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Next.js authentication](https://nextjs.org/docs/app/guides/authentication).
