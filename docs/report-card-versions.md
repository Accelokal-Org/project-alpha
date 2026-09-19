# Saved report-card versions and staff approval

## Install

Apply **only** `supabase/migrations/202609160004_report_card_versions.sql` after the report-card preview migration, then deploy. Do not rerun earlier successful migrations. No new environment variables are required.

Read-only installation check:

```sql
select to_regprocedure('public.save_report_card(uuid,uuid,integer,text)') as save_report,
       to_regprocedure('public.approve_report_card(uuid,integer,text)') as approve_report;
```

## Workflow

1. Open **My classes → advisory class → Report cards** and choose a student.
2. Review the live preview, confirm it, and save a version. Assigned advisers, school heads and superadmins with school authority can save. Incomplete reports can be saved as drafts.
3. Open the saved version. A school head or superadmin can approve the latest version after confirming review, provided every completeness check passes and its source still matches the live preview.
4. If grades, lock status, enrollment or displayed student details change, open the live preview and save a new version. Previously saved snapshots and their historical approvals remain preserved.

A subject-teacher role alone does not grant access. Roles remain cumulative; a head who is also an adviser can prepare and approve. No separate-person approval rule is imposed.

## Persistence and safeguards

`report_cards` identifies each class/student report; `report_card_versions` stores server-generated snapshots and approval metadata; `report_card_events` records saving and approval. Direct authenticated writes are denied. SQL RPCs check current authority, expected version and a server-derived source token. Duplicate unchanged saves and repeated approvals are rejected. Submitted browser data cannot replace snapshot grades.

The screen lists the latest 50 versions and events. Saved versions can be selected through `report_version=N`. Current class enrollment is required to open the screen, including a historical version; removal from the class does not delete saved database records. Source changes after approval show a warning when a version is viewed; the original approval remains historical. Approval is a check at the time of the operation, not a permanent freeze on underlying academic records.

These remain staff records. This implementation does not release grades to students, send email, create printable official documents, apply overrides or calculate annual averages. Future release must recheck source freshness and authorization.

## Validation boundary

Automated SQL tests use an isolated PGlite database. Browser checks cover unauthenticated route protection and destination preservation; hosted Supabase and authenticated staff UI require verification after migration and deployment. No hosted data was changed during implementation.
