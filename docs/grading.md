# Grading setup and assessment classification

## Apply this release

Run **only** `supabase/migrations/202609150004_grading_setup.sql` once in the connected Supabase project's SQL Editor, then deploy the latest code to Vercel. Earlier assessment, attendance and lesson migrations must already be installed. Do not rerun them for this release. No new environment variables are required. This migration uses an explicit transaction and does not seed or alter existing academic records.

If unsure whether this release is installed, run this read-only check:

```sql
select to_regclass('public.grading_schemes') as schemes,
       to_regclass('public.grading_periods') as periods,
       to_regclass('public.grading_components') as components,
       to_regclass('public.assessment_grading') as classification,
       to_regprocedure('public.approve_grading_scheme(uuid,integer)') as approval;
```

If these exist, do not rerun the migration. If only some exist, investigate the partial installation before making schema changes. Deployment does not apply SQL.

## Configure and approve

- Superadmins: open **School administration → choose school → Grading**.
- School heads: sign in through the teacher view, open **School grading setup**, and choose their school. This preserves the selected workspace; head access does not grant superadmin privileges.
- Create a named scheme and choose a school year. Multiple schemes allow different subject weightings in the same school year; there is no automatically assumed default.
- Add 1–12 named periods within the school-year dates. Periods cannot overlap; gaps are allowed. Add 1–20 uniquely named components with positive weights up to 100%, using at most two decimal places.
- Save the draft. A draft may have a total other than 100%. Review the saved version, confirm the approval checkbox, and approve when the total is exactly 100%.
- Approval makes the scheme available to staff and permanently locks its name, periods and weights in this release. Create a separate named scheme for different rules. School heads and superadmins may both prepare and approve; this release does not require a second person.

The screen supports up to 50 schemes per school (also enforced on creation), and offers the latest 100 school years. Approval is a separate operation from saving. Changed versions reject stale saves and approvals. The setup audit records before/after changes; the superadmin Audit tab lists these operations.

## Classify assessments

Open **My classes → subject → Assessments → select a draft → Grading classification**. Choose an approved scheme for the subject's school year, a period containing the assessment date, and a component. Save. Selecting **Not classified** and saving clears the link.

Scores and classification use separate views. Save before switching views. A classification save increments the assessment version, so a score save from a stale browser tab must refresh rather than overwrite changes. Published assessments remain immutable, including their classification.

Existing assessments are not assigned automatically. Unclassified assessments can still use the existing manual score/publication flow; this release does not calculate grades or assume a weight for them. Previously published unclassified assessments cannot be retroactively classified through this release.

## Access and implementation

All reads and writes use the caller's Supabase session. RLS hides grading drafts from ordinary teachers/advisers and hides grading setup from student-only accounts. Approved schemes are readable to teacher/adviser memberships in the same school. Heads and platform admins can configure and approve only within their authorized scope. Multi-role permissions remain cumulative.

Only an assigned subject teacher can classify an assessment. Database checks enforce scheme approval, school and school-year matching, period date eligibility and component membership. Direct authenticated writes are disabled. Save/approval/classification operations and their audit entries are atomic; row locks and expected versions handle conflicts. No service-role academic writes, hosted fixtures or test pages are added.

This release establishes periods, components, weights, approval and assessment links. Aggregation methods, missing-score handling, transmutation/rounding rules, calculated grades, teacher grade submission, adviser lock/unlock and completion dashboards remain subsequent work. No grade calculation is presented as complete.
