# Foundation implementation

## Scope

Implemented the first recommended slice: authentication → teacher assignment → student roster. Includes an adviser’s whole-class roster and a minimal student landing page that returns only the authenticated student’s profile and class. School heads and app managers can read their authorized roster scope; dedicated administration interfaces are not built yet.

The visual preview is an independent public route using fictional fixtures. It is not a live school and has no record-writing actions. There is no demo role switcher, session bypass, or fallback to fixtures inside authenticated data queries.

## Architecture

- Server Components query Supabase under the requesting user’s session. The application never uses the service-role key in request handling.
- Server Actions handle sign-in/sign-out. Zod validates sign-in on the server; HTML constraints validate the small client form. React Hook Form is deferred until a complex editing form exists.
- Supabase SSR refreshes cookies through `proxy.ts`; protected data access also checks the Auth user and database memberships. This follows the [official Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication).
- Normalized school/year/grade/class/subject/teacher/student tables use UUIDs, foreign keys and tenant-aware composite foreign keys.
- Class enrollment and subject enrollment are independent. A subject teacher cannot infer access to an entire class from one teaching assignment.
- Read policies are enforced by PostgreSQL RLS. Private security-definer helpers use `auth.uid()` and a fixed search path to avoid recursive policies. The exposed `staff_offerings` function runs with invoker rights and explicitly filters staff authority, including when a user also has a student role.
- No authenticated database writes are granted in this slice. New academic mutations must add server validation, authorization, audited transactions and RLS/write policies together.
- Compact tables, restrained colors, responsive shell, semantic navigation, keyboard focus, roster search/sort and pagination follow the PDF’s product design direction.

## New hosted Supabase project

1. Create a separate development/staging Supabase project. Retain PostgreSQL as the source of truth.
2. Disable open public signup unless an approved onboarding workflow is added. Provision users through Supabase Auth administration, then link their IDs to school memberships and teacher/student profiles with reviewed administrative SQL. Do not place roles in editable user metadata.
3. Review the migration, link the intended project with the Supabase CLI and apply the versioned migration. Do not run the fictional development seed or local fixture-user script against production.
4. Configure the app’s public Supabase URL and publishable key. The web application does not need a service-role key.
5. Configure Auth site URLs for the chosen Vercel deployment. Configure password recovery/email delivery before real onboarding; the initial login directs account recovery to the school administrator.
6. Run a full Auth/PostgREST integration check with two teachers, two students and two schools before using real records. Test each role and direct unauthorized queries, including revoked memberships.

No hosted Supabase project or Vercel deployment was created during this initial local implementation.

## Next vertical slices

1. Finish manual administrative setup forms for school structure/users/assignments; add audited batch roster operations and individual subject exceptions.
2. Teacher creates assessment → records and reviews manual scores → explicitly publishes → student receives only their published score. Add separate student-safe projections and RLS tests before the student score UI.
3. Configurable attendance → recording/history → student sees own attendance only.
4. Lesson plans and reusable templates → upcoming dashboard items.
5. Configurable grade components → approval → calculation → submission → adviser lock/unlock → school-head completion view.
6. Configurable staff-only intervention rules and flags.
7. Isolated answer-sheet generation/scanning/review pipeline, preserving manual entry.
8. Report-card completeness validation, reasoned overrides and release boundary; defer visual designer.

## Deliberate limitations

- No scoring, attendance, schedule, grade, intervention, scanner, template or report-card workflows yet. No placeholders pretend those actions are complete.
- School setup is currently migrations/seed plus controlled account provisioning, not an administration UI.
- The first repository query layer assumes a small school; Supabase’s 1,000-row API cap must be replaced with explicit server pagination for larger deployments. Roster UI pagination only paginates the returned roster.
- No real end-to-end Auth session was available without starting Supabase. Embedded PostgreSQL tests cover schema/RLS, not Auth, cookie refresh, or PostgREST configuration.
- No production monitoring/Sentry configuration yet; no third-party telemetry is enabled.
