# Staff report-card preview and completeness checks

## Install

Apply **only** `supabase/migrations/202609160003_report_card_preview.sql` once after grade locks, then deploy the app to Vercel. Do not rerun earlier successful migrations. No new environment variables are required. The migration adds a read-only function; no report cards, sample records or student releases are created.

Read-only installation check:

```sql
select to_regprocedure('public.preview_report_card(uuid,uuid)') as report_card_preview;
```

If the function exists, do not rerun the migration.

## Workflow

Open **My classes → advisory class → Report cards**, then choose a student. Assigned advisers, school heads and superadmins with authority over that school can review the preview. A subject-teacher role alone does not grant report-card access, because it would expose other subjects' grades.

The preview covers the class's school year. Each subject retains its own approved scheme and named/date-bounded periods; periods from different schemes are not assumed to be equivalent quarters. No annual average or cross-subject weighting is calculated.

Subjects checked are the union of:

- Subject offerings attached to the student's advisory class.
- The student's independent subject enrollments elsewhere in the same school and school year.

A class subject without student enrollment is explicitly flagged for enrollment review, including legitimate individual exceptions. No enrollment is created or assumed, and this release has no override/exemption workflow. Other school years and schools are excluded.

## Checks

| Check | Meaning |
| --- | --- |
| Subject enrollment needs review | The class offers the subject, but the student is not enrolled |
| Grading scheme not fixed | No first submission has fixed the subject's scheme |
| No grading periods configured | The fixed scheme has no periods |
| Grades not submitted | An expected period has no submission |
| Submission not locked | Submitted, returned or reviewed grades still need locking |
| Student grade missing or invalid | The snapshot lacks exactly one numeric grade for this student |
| Grade outside supported range | Snapshot grade is outside 0–100 |
| Locked grade available | Enrollment, locked submission and student grade checks pass |

Only grades from locked snapshots that pass the checks appear. Zero is a valid grade. Incomplete/unlocked values are never replaced with zero, live assessment calculations or earlier revisions. The current locked revision supplies the value; unlocking makes that value unavailable until locked again.

A preview is complete only when at least one subject-period row exists and all rows pass. This means the configured records are complete, not that the school has configured every required curriculum subject or approved an official report card. Future periods are included in this school-year check.

## Privacy and scope

The database RPC verifies adviser/head access and the student's class membership before reading data. For independent subject enrollment, it returns only the selected student's grade from each snapshot, never classmates' grades, component score lists or staff correction reasons. Current role/assignment checks apply to every request. Student-only callers and anonymous callers are denied.

The preview is read-only and live. It is not a saved report card, printable official document or student-visible result. Staff approval, reasoned overrides/exemptions, durable report-card versions, explicit student release and the visual report-card designer remain deferred.

There is a database-enforced limit of 200 subject offerings per student preview. The class selector uses the existing roster query and its existing Supabase row limit. Grade rows are assembled in one PostgreSQL JSON response, avoiding row-cap truncation of periods. No external SQL or academic-data changes were performed during local implementation.
