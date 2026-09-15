# Adviser locks and school grade completion

## Install

Apply **only** `supabase/migrations/202609160002_grade_locks.sql` once after grade review, then deploy the latest application to Vercel. Earlier successful migrations should not be rerun. No new environment variables or seeded records are needed. Existing submissions keep their current status and snapshots.

Read-only installation check:

```sql
select to_regprocedure('public.set_grade_lock(uuid,integer,boolean,text)') as grade_lock,
       to_regprocedure('public.school_grade_completion(uuid,uuid,integer,text)') as completion;
```

If both exist, do not rerun. Investigate a partial installation before applying more SQL.

## Adviser workflow

Open **Advisory class → Grades → subject period**. Mark a submitted revision Reviewed first, then explicitly confirm **Lock grades**.

Locked submissions cannot be returned, marked reviewed again, corrected through the returned-period score RPC, or resubmitted. The assigned adviser can **Unlock grades** with a required reason of 1–1,000 characters. Unlocking restores Reviewed status; use Return for correction separately if needed.

Lock/unlock increments the review version and records actor, timestamp, revision, action and reason in the review history atomically. Stale requests fail. Only the currently assigned class adviser with ADVISER membership can change the lock; school-head and superadmin roles alone do not confer that authority. Historical snapshots have no action controls.

The lock applies to the submitted grade record. Source assessment drafts and enrollment retain their existing edit permissions, and their later changes do not update a locked snapshot. School grading schemes and calculation rules remain immutable under their existing approval rules. No student grade release is triggered.

## School-head completion dashboard

School heads use **Teacher workspace → School grading setup → choose school → Completion dashboard**. Superadmins use **School administration → Completion**. Both views enforce the selected school’s management authority.

Choose a school year and filter Not submitted, Submitted, Returned, Reviewed or Locked. Rows show class, subject, period, status and revision, with a link to the subject grade view. The list uses server pagination (50 rows per page); counts always cover the entire selected school year. The selector offers up to 100 recent school years, defaulting to the active year where present.

The overview is complete only when there is at least one configured subject period, every configured period is Locked, no subject lacks its fixed scheme, and no class is missing subject offerings. Future periods are included; this is school-year completion, not an overdue-work report.

Before a subject’s first submission fixes its scheme, it appears once as Not submitted with “Scheme not fixed.” It cannot be treated as complete, and no expected periods are invented. Classes without subjects are separately flagged. An empty school year is never marked complete.

This dashboard checks submission status. It does not prove that enrollment or curriculum configuration is complete, validate report cards, or authorize student release. Report-card completeness, reasoned overrides and release remain subsequent work.
