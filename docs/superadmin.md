# Deskonekt superadmin

## Sign-in and location

- Dedicated sign-in: `/deskonekt/admin/login`
- Administration: `/deskonekt/admin`
- The area is omitted from school navigation and marked `noindex`. Every page, Server Action, and database setup function still checks superadmin authority.
- “Superadmin” is the UI name for platform-level App Manager access. Existing `APP_MANAGER` memberships remain supported. New installations use `platform_admins` so the first administrator does not depend on a school existing.

## First-time setup — no manual school SQL

Supabase must be connected once before accounts or schools can be saved. There is no built-in password or unauthenticated admin mode.

1. Copy `.env.example` to the ignored `.env.local` file. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
2. Apply the versioned migrations. For a new hosted development project, use `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. For local Supabase, start Docker and run `npm run db:start`; `npm run db:reset` applies migrations to an empty local database. Do not use a reset against data you need to keep.
3. In `.env.local`, set the server-only `SUPABASE_SERVICE_ROLE_KEY`, a new `BOOTSTRAP_ADMIN_EMAIL`, and a `BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters. Use an email not already registered in Auth.
4. Run `npm run admin:bootstrap`. This creates the first Auth account and platform administrator entry without creating a school. It does not reset or promote an existing account and refuses to run when a platform superadmin already exists.
5. Start/restart the app with `npm run dev`. Open `/deskonekt/admin/login` and sign in with the email/password you configured.
6. Remove `BOOTSTRAP_ADMIN_PASSWORD` from `.env.local` after confirming sign-in. On a hosted application, set the public Supabase configuration in its deployment environment too; never make the service-role key a `NEXT_PUBLIC_` variable.

School creation and ongoing foundation setup now happen in the web UI. The service-role key is used by the operator bootstrap script. Runtime school writes use the signed-in caller’s session; invitation delivery also requires the server-only service-role key.

## What you can do now

| Area | Available controls |
| --- | --- |
| Schools | Create an empty school, edit its name/timezone |
| Structure | Add school years, grade levels and classes |
| People | Add teacher and student profiles |
| Subjects | Add subjects and connect them to classes; open their actual rosters |
| Assignments | Assign subject teachers/advisers, enroll individual students in classes/subjects, and add a whole class to a subject |
| Accounts | Invite a new account with school roles, or connect an existing Auth account |
| Attendance | Configure school attendance codes, labels and active status |
| Audit | Read the latest 30 setup changes for the selected school |

## Existing Auth accounts

Connect existing users to school roles using Accounts. Platform superadmin access is managed separately through `public.platform_admins`; school account linking cannot grant that role.

## Removed sample features

The preview, sample-school generator, sample-login provisioner and testing tab have been removed. Apply the [cleanup migration](sample-data-removal.md) to remove previously generated records from an existing database.

## Security and limitations

- `admin_setup` exposes a fixed list of operations, validates again in PostgreSQL, and writes its audit record within the same transaction. No general SQL console or direct authenticated table-write permissions are exposed.
- Composite foreign keys reject references across schools. Account linking cannot grant `APP_MANAGER`, overwrite an already linked profile with a different account, or reset passwords.
- Ordinary teachers, advisers, students and school heads cannot enter this platform administration area. New platform administrators are managed through the operator bootstrap path, not school account linking.
- Editing existing entities beyond school name/timezone and adviser assignment, removing enrollments, account recovery, and role revocation UI are not included in this initial admin milestone.
- School listing is limited to the latest 200 schools; per-school lists inherit the 1,000-row Supabase API cap. Add server pagination before larger-scale rollout.
- Invitation emails now use Supabase Auth with the configured SMTP provider. See [invitation deployment](account-invitations.md). Billing remains deferred.
- Scoring and subject attendance are available in teacher workspaces; attendance statuses are configured here. Scheduling, lesson planning and grade/report-card workflows remain future milestones.

Implementation references: [Supabase Auth admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Next.js authentication](https://nextjs.org/docs/app/guides/authentication).

## Choosing the teacher workspace

Open `/teacher` directly, or choose **Open teacher workspace** in administration. If you need to sign in, the school login returns you to the requested teacher page. A direct visit to `/login` offers Teacher workspace and Student portal. Dedicated admin sign-in still opens administration and checks platform authority.

An account can retain multiple roles: connect its existing email to a teacher profile using the school's Accounts tab, then assign its subjects/classes. Add Adviser separately when applicable. This does not remove School head or platform administrator access. The workspace choice controls navigation, not permissions; administrators and school heads retain their existing broader roster access. There is no impersonation or restricted teacher-role simulation.
