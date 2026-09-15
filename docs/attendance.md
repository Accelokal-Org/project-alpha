# Subject attendance

## Enable the feature

Apply `supabase/migrations/202609150002_attendance.sql` after the assessment migration in the Supabase project connected to Deskonekt. Deploy the website changes afterward. No new environment variables are required. Website deployment does not apply migrations.

In **Superadmin → School → Attendance**, add the school's actual statuses. For example, a school may choose codes PRESENT, ABSENT, LATE and EXCUSED, with its own labels. These are suggestions, not seeded records or mandatory school policy. Up to 50 statuses can be configured. Deactivate unused statuses rather than deleting history. Codes cannot be changed through the edit form.

## Record and review

1. Open **My classes → Subject → Attendance**.
2. Choose today or a past date. Today follows the school's configured timezone.
3. Select each student's status. Optionally use **Fill unmarked students** to apply a chosen active status only to empty selections. There is no automatic present/absent default.
4. Select **Save attendance**. Saved records are immediately visible in each student's own portal; there is no separate publication step.
5. Use recorded-date links or the date picker to review earlier records. Save pending changes before navigating away.
6. To correct a saved date, change the marks and provide a reason. A staff-only audit stores the before/after values and actor. Students never receive the correction reason or classmates' data.

Selecting Not recorded clears a saved mark; it does not mean Absent. A row left unmarked produces no student result. An inactive status can remain unchanged on its existing record but cannot be newly selected for another student/date. Renaming a status affects new marks; unchanged historical entries retain the label originally recorded.

## Permissions and consistency

Subject attendance writes require both the school's Teacher membership and a linked teacher assigned to that offering. Superadmin, school-head or adviser authority alone allows only the existing staff read scope. Dedicated advisory/class-wide daily attendance is deferred; subject enrollment supplies this roster.

All writes use caller-session RPCs, with tenant-aware foreign keys, fresh assignment checks and RLS on reads. Direct authenticated table writes are disabled. Per-date row locks and version checks prevent stale edits, including two users opening an unsaved date at once. Score and attendance data are separate workflows.

The student portal calls `my_attendance()`, which explicitly filters by the caller's own student identity even when the account has additional staff roles. Staff audit snapshots and reasons are not returned by this projection.

## Limits and validation

The editor supports up to 500 students and explicitly disables saving for larger rosters. Date shortcuts show the latest 60 recorded dates; earlier dates remain accessible through the picker. Change history shows the latest 20 saves for the selected date. The student portal shows its latest 100 records. Date validation blocks future dates but does not infer holidays, term calendars or timetables.

Per-period sessions, advisory daily attendance, computed absence percentages, reports, policy-based attendance interventions, and attendance notifications are not implemented. No sample school data is created by this migration.

Embedded PostgreSQL checks cover privacy, correction audit, inactive/renamed statuses, enrollment, configuration boundaries, rejected stale saves, revoked access and atomic rollback. Hosted Auth/PostgREST and authenticated teacher UI validation remain outstanding; no real attendance records were created during implementation.
