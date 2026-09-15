# Adviser review and teacher resubmission

## Install

Apply **only** `supabase/migrations/202609160001_grade_review.sql` once after the grade-submission migration, then deploy to Vercel. Do not rerun earlier successful migrations. No new environment variables are needed.

Existing submissions become revision 1 with status Submitted. Their original snapshot, submitter and timestamp are copied into immutable version history. No academic fixtures or test pages are added.

Read-only installation check:

```sql
select to_regclass('public.grade_submission_versions') as versions,
       to_regclass('public.grade_review_events') as events,
       to_regprocedure('public.review_period_grades(uuid,integer,text,text)') as review,
       to_regprocedure('public.resubmit_period_grades(uuid,integer,text,text)') as resubmit;
```

If all exist, do not rerun. Investigate partial installations before applying more SQL.

## Adviser workflow

Open **My classes → advisory class → Grades** for a subject/period status overview. Open a subject period to inspect its current submitted snapshot, student component breakdowns and source scores.

The currently assigned class adviser, with ADVISER membership, can:

- **Mark reviewed:** record review of the displayed submission. This does not lock grades or release them to students.
- **Return for correction:** enter a reason (1–1,000 characters) and explicitly confirm. A reviewed submission may also be returned. Returned submissions cannot be reviewed again until the teacher resubmits.

School heads and superadmins retain authorized read access; those roles alone do not grant adviser decision authority. Combined roles are cumulative, including a teacher who is also the assigned adviser. A second-person review constraint is not imposed.

## Teacher corrections

A returned period shows the adviser’s reason and a fresh live calculation. Open its source assessments to correct scores. The returned-period correction form requires a reason and audits previous scores and replacement entries.

Published assessment scores can be corrected only through the returned-period correction RPC while that linked subject period remains Returned. **Changes to published scores immediately update the student's existing published assessment results.** Earlier grade-submission snapshots remain unchanged. Ordinary published-score editing remains blocked.

After correcting scores, return to **Subject → Grades → period**, review the new calculation, describe the correction and explicitly resubmit. This creates a new immutable revision under the same submission and grading scheme. The adviser receives a new Submitted revision for review; there is no automatic email.

Source-token and review-version checks reject stale or duplicate actions. Submission is recalculated on the server. Missing inputs still block resubmission according to the school’s approved rule. The original scheme, component settings and calculation-rule approvals remain locked. Changes to published assessment metadata/classification remain outside this correction flow.

## History and access

The period view links to the latest 50 historical revisions and displays the latest 50 review events, including return reasons and correction notes. Older revisions remain accessible using `&revision=N`. Historical views do not offer review or resubmission actions. Current submission rows point to the newest snapshot; archived snapshots are never overwritten.

The advisory overview shows up to 1,000 subject-period rows. Before a subject's first submission, it shows a subject-level Not submitted row because no scheme is fixed yet. After first submission it lists the scheme's periods, including missing ones.

RLS limits snapshots and reasons to authorized subject staff. Student-only accounts cannot access grade-review records. Direct authenticated writes remain disabled; review decisions, corrections, resubmissions and history updates are atomic database operations. Assignment revocation takes effect on subsequent requests.

Adviser locking/unlocking, school-wide completion dashboards, student grade release and correction of grading rules remain subsequent work. Reviewed status records a review; it is not a lock or a release.
