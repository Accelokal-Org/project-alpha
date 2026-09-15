# School calculation rules and teacher grade submission

## Install this release

Apply **only** `supabase/migrations/202609150005_grade_submission.sql` once in the connected Supabase project's SQL Editor, then deploy the app to Vercel. The grading setup migration (`202609150004`) must already be installed. Do not rerun earlier successful migrations. No new environment variables or seeded content are required.

Read-only installation check if needed:

```sql
select to_regclass('public.grade_calculation_rules') as calculation_rules,
       to_regclass('public.subject_gradebooks') as gradebooks,
       to_regclass('public.grade_submissions') as submissions,
       to_regprocedure('public.preview_period_grades(uuid,uuid)') as preview,
       to_regprocedure('public.submit_period_grades(uuid,uuid,text)') as submit;
```

If all exist, do not rerun. Investigate a partially installed schema before continuing. The migration is transactional and preserves existing records. Vercel deployment does not apply SQL.

## The school chooses the calculation

In **School administration → Grading**, or **Teacher workspace → School grading setup** for school heads, open an approved scheme and choose its calculation rule. All selectors start empty. Recommendations are guidance, never automatically applied settings.

Supported school choices:

| Setting | Choices |
| --- | --- |
| Within-component calculation | Total earned points ÷ total possible points, or mean of individual assessment percentages |
| Missing scores | Block submission, or explicitly count missing scores as zero |
| Final percentage rounding | 0, 1 or 2 decimal places, nearest value with halves rounded up |

Each component percentage is multiplied by the scheme's approved weight. Weighted contributions are summed at full PostgreSQL numeric precision; only the final grade is rounded. There is no built-in transmutation, passing threshold, grade floor or arbitrary formula execution.

Example: 10/10 and 0/90 yield a component percentage of 10% using total points, or 50% using equal assessment percentages. Apply that component's weight afterward. The UI recommends total points when point values express relative assessment importance, average percentages when assessments should contribute equally, requiring complete scores and using two decimal places.

A school head or superadmin explicitly confirms approval. Calculation rules become immutable once approved. A new rule requires a separately approved scheme. Existing approved schemes do not receive an assumed calculation method. An approved calculation rule is required before a scheme appears in the teacher's Grades tab.

## Teacher review and submission

1. Classify assessments under the approved scheme, period and component. Save scores.
2. Open **My classes → subject → Grades** and choose the scheme/period.
3. Review the enrolled students, component breakdowns and source assessments. Both saved draft and published assessment scores are included. Unsaved browser inputs are never used.
4. Resolve blockers: empty roster, components without assessments, missing scores when the school's policy requires them, or assessments in the period's date range classified elsewhere or not classified at all. Zero is a real score; missing scores become zero only under the school's explicit policy.
5. Confirm review and submit. The server recalculates and checks the reviewed input token. Changed scores, enrollment, assessment versions or relevant source information require a fresh review.

Each submission stores the grades, student identities/names, component weights and contributions, school calculation settings, source assessment versions, and individual score/max-score inputs. Later changes to source scores or enrollment do not change this historical snapshot. Source records remain editable according to their existing permissions; submission does not publish or lock draft assessment scores. The UI clearly distinguishes live review from a submitted snapshot.

The first submission binds the subject offering to that approved scheme. Later periods use the same scheme, preventing duplicate official submissions under competing schemes. Classification after binding rejects other schemes. Previously published assessments assigned to a different scheme cannot be reclassified through this release and will block submission when they fall within the selected period.

## Access, integrity and limits

- Only an assigned subject teacher with current TEACHER membership can submit. Other authorized subject staff can read previews and submitted snapshots.
- Student-only accounts cannot access previews, submissions or staff calculation details. Submission is not student publication; no student grade release endpoint was added.
- Direct authenticated writes are disabled. Approval and submission create audit records atomically. The subject row serializes first submissions; unique constraints prevent duplicate period submissions. The server computes every grade rather than accepting browser-provided grade values.
- Subject scheme/period validation includes the school, offering school year, scheme approval and approved calculation rule. Multi-role authority remains cumulative.
- Reviews support up to 500 students, 500 assessments in the period and 50,000 student-assessment combinations. Exceeding a bound blocks the review explicitly. Data is aggregated in PostgreSQL and returned as a single JSON result, avoiding Supabase row-cap truncation of score inputs.
- Submitted history has at most 12 periods from the fixed scheme. Authorized staff access remains tied to the current offering permissions. No hosted samples, public test pages or automatic emails are added.

Adviser review actions, return/reopen/correction, lock/unlock, school completion dashboards, custom transmutation and student release remain subsequent work. Submission is currently immutable; teachers must review carefully before confirming.
