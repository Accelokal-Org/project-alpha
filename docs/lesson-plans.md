# Lesson plans and reusable templates

Apply `supabase/migrations/202609150003_lesson_plans.sql` in the connected Supabase project's SQL Editor after the assessment and attendance migrations, then deploy the application. Vercel deployment does not apply database migrations. No new environment variables or seeded records are needed.

## Teacher workflow

1. Open **My classes → assigned subject → Lesson plans**.
2. Choose **New lesson plan**, enter a title and lesson date, and add objectives, activities, and resources. Sections can remain blank while planning.
3. Save. Open a saved plan to edit it; a stale version produces a refresh message instead of overwriting another save. Preserve unsaved text before refreshing. Save before leaving the page.
4. Choose **Copy as a template** on a plan, or **New template**, to save reusable undated material. The original plan remains separate. A plan can also be converted to a template with the checkbox; this clears its date.
5. **Start from a template** offers accessible templates in the same school, including other subjects the caller can read. Choose one, adapt its contents, supply a lesson date, and save a new independent plan. Later edits do not propagate between copies.
6. The teacher dashboard lists the next 20 dated lessons on assigned subjects, from today in each school's timezone. Templates and past lessons are excluded.

## Access and limits

Assigned subject teachers with active TEACHER membership can create and edit. School heads, administrators and advisers with existing offering read access can view; a corresponding subject teaching assignment is still required to save. Students have no lesson-plan access through the student role. Multiple roles remain cumulative.

All operations use the caller's session. RLS limits reads; direct authenticated writes are disabled. The save RPC checks current assignment, validates tenant relationships and fields, locks edits, verifies the expected version, and records before/after snapshots atomically. Revoked authority takes effect on subsequent requests.

Lists show up to 100 recently updated subject plans/templates and 100 accessible school templates ordered by title. Deep links can still open older plans. Titles are limited to 200 characters; objectives/resources to 10,000 each and activities to 20,000. Content is plain text; resources are references, with no uploads or automatic external fetching.

This slice does not add publication/student distribution, approval, lesson completion, deletion, file attachments, timetable recurrence, or an audit-history viewer. Audit records remain available to authorized staff at the database layer. No hosted fixtures or test pages are created.

## Attendance helper recovery

For the earlier `private.teaches_offering(uuid) does not exist` error, run the complete `supabase/repairs/attendance_helper.sql` script. It is repeatable and preserves records. The updated attendance migration now defines this helper too. The assessment migration also tolerates an already-defined helper.

Check whether the failed attendance installation rolled back:

```sql
select to_regclass('public.attendance_statuses') as statuses,
       to_regclass('public.attendance_days') as days,
       to_regclass('public.attendance_records') as records,
       to_regclass('public.attendance_events') as events;
```

If all four are null, apply the complete updated attendance migration. If all exist and the original failure was at the final `can_manage_attendance` function, the repair supplies that missing function. If only some exist, inspect the partially applied schema before continuing; do not drop tables or rerun already-successful migrations blindly. Apply any still-missing assessment migration before the lesson migration so all existing application features have their required tables and RPCs.

Hosted schema changes and real teacher sessions must be verified separately; local automated checks use isolated PostgreSQL only.
