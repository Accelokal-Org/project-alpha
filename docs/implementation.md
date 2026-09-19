# Foundation implementation

Product identity: **Deskonekt — Your classes. Your work. One desk. — by Accelokal**. See the [product and design bible](product-design-bible.md) for positioning and brand usage.

## Scope

Implemented authentication → teacher assignment → student roster, followed by assessment creation → draft scores → explicit publication → personal student results. Includes an adviser’s whole-class roster and a minimal student landing page that returns only the authenticated student’s profile and class. The separate [superadmin area](superadmin.md) now supports school setup, account connections, setup audit history. Dedicated school-head administration is still a later milestone.

The application has no public preview or sample-data generation controls. Automated fixtures remain isolated under tests and do not seed the application database.

## Teacher workspace

The teacher landing page includes subject/advisory assignment totals and unique class-section counts. Teachers can search class names, subjects and codes, combine school/year/responsibility filters, and open authorized rosters. No new migration is required for this workspace iteration. Subject pages now include [assessments and manual scoring](assessments.md). Subject attendance is now available; [lesson plans and reusable templates](lesson-plans.md) are now available.

## Architecture

- Server Components query Supabase under the requesting user’s session.
- Server Actions handle sign-in/sign-out. Zod validates sign-in on the server; HTML constraints validate the small client form. React Hook Form is deferred until a complex editing form exists.
- Supabase SSR refreshes cookies through `proxy.ts`; protected data access also checks the Auth user and database memberships. This follows the [official Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication).
- Normalized school/year/grade/class/subject/teacher/student tables use UUIDs, foreign keys and tenant-aware composite foreign keys.
- Class enrollment and subject enrollment are independent. A subject teacher cannot infer access to an entire class from one teaching assignment.
- Read policies are enforced by PostgreSQL RLS. Private security-definer helpers use `auth.uid()` and a fixed search path to avoid recursive policies. The exposed `staff_offerings` function runs with invoker rights and explicitly filters staff authority, including when a user also has a student role.
- Direct authenticated table writes remain disabled. Superadmin setup writes go through manager-checked, operation-specific RPC branches with atomic audit records. New academic mutations must add their own validation, authorization and audit rules.
- Compact tables, restrained colors, responsive shell, semantic navigation, keyboard focus, roster search/sort and pagination follow the PDF’s product design direction.

## New hosted Supabase project

1. Create a separate development/staging Supabase project. Retain PostgreSQL as the source of truth.
2. Disable open public signup unless an approved onboarding workflow is added. Run the one-time superadmin bootstrap, then use admin forms to create schools and connect existing login emails to school roles/profiles. Do not place roles in editable user metadata.
3. Review the migration, link the intended project with the Supabase CLI and apply the versioned migration. Automatic seeding is disabled.
4. Configure the app’s public Supabase URL and publishable key. A server-only service-role key is needed for initial operator bootstrap; it is not used for ordinary school data access.
5. Configure Auth site URLs for the chosen Vercel deployment. Configure password recovery/email delivery before real onboarding; the initial login directs account recovery to the school administrator.
6. Run a full Auth/PostgREST integration check with two teachers, two students and two schools before using real records. Test each role and direct unauthorized queries, including revoked memberships.

No hosted Supabase project or Vercel deployment was created during this initial local implementation.

## Next vertical slices

1. Extend the implemented superadmin setup with edit/removal/revocation flows and school-head approval boundaries when needed. Invitations and password setup are implemented; keep billing for later.
2. Implemented: teacher creates assessment → saves/reviews manual draft scores → explicitly publishes → student receives only their own published score. Includes separate student projection, RLS and mutation-boundary tests; see [assessment setup](assessments.md).
3. Implemented: configurable school attendance statuses → subject/date recording and correction history → student sees own saved attendance only. See [attendance setup](attendance.md).
4. Implemented: lesson plans and reusable templates → upcoming teacher dashboard lessons. See [lesson-plan setup](lesson-plans.md).
5. Implemented: named school-year grading schemes, periods, component weights, approval and assessment classification. See [grading setup](grading.md). Implemented next: [school calculation rules and teacher grade review/submission](grade-submission.md). Implemented: [adviser review, return and teacher resubmission](grade-review.md). Implemented: [adviser lock/unlock and school-head completion](grade-completion.md). Implemented: [staff report-card completeness and preview](report-card-preview.md). Implemented: [saved report-card versions and staff approval](report-card-versions.md). Next: reasoned overrides and explicit release.
6. Configurable staff-only intervention rules and flags.
7. Isolated answer-sheet generation/scanning/review pipeline, preserving manual entry.
8. Report-card completeness validation, reasoned overrides and release boundary; defer visual designer.

## Deliberate limitations

- Assessment/manual scoring is implemented. No timetable, intervention or scanner workflows yet. Grade calculation, submission, adviser controls, report-card previews, saved versions and staff approval are available; student grade release remains deferred. No placeholders pretend those actions are complete.
- Schema installation and the first superadmin still need one-time operator setup. School records and assignments are now managed through the superadmin UI.
- The first repository query layer assumes a small school; Supabase’s 1,000-row API cap must be replaced with explicit server pagination for larger deployments. Roster UI pagination only paginates the returned roster.
- No real end-to-end Auth session was available without starting Supabase. Embedded PostgreSQL tests cover schema/RLS, not Auth, cookie refresh, or PostgREST configuration.
- No production monitoring/Sentry configuration yet; no third-party telemetry is enabled.

## Account invitation delivery

Superadmins can invite new Auth users with school roles and a teacher/student profile. Recipients accept an email token and set their password. See [deployment and limitations](account-invitations.md). Auth email delivery uses the configured Resend SMTP provider through Supabase; the narrowly scoped Auth invitation client requires a server-only service-role key, while school-role writes use the caller JWT.

## Loading and feedback

Route loading boundaries show skeletons while pages resolve. Navigation links show pending feedback, and school switching updates without a full document reload. Server-action forms use disabled pending buttons/spinners and accessible progress, success and error panels. Page failures offer a retry action. Motion respects the reduced-motion preference; immediate local filtering stays immediate.

## Attendance

Subject workspaces now support date-based attendance using superadmin-configured school statuses. Corrections require staff-only reasons; student projections expose only personal saved marks. Apply the [attendance migration and configuration](attendance.md) before deployment.

School account creation now supports [school-head CSV imports and invitation batches](school-account-imports.md), with per-row roles, profile creation and account setup.
