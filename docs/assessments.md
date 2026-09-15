# Assessments and scores

## Enable on the deployed site

Apply `supabase/migrations/202609150001_assessments.sql` in the Supabase project connected to Deskonekt, after the existing migrations. Deploy the website changes. Vercel deployment does not apply database migrations. No new environment variables are required.

## Teacher workflow

1. Open a subject from My classes, then select **Assessments**. Advisory-only rosters do not create subject assessments.
2. Choose **Create assessment** and enter a title, assessment date and positive maximum score.
3. Enter student scores, then **Save draft scores**. Blank means not recorded; zero is a real score. Up to two decimal places are supported.
4. Review the saved scores. Unsaved edits disable publishing until saved. Confirm the review checkbox, then **Publish scores**.
5. Published assessments become read-only. Students with saved scores see only their own published result in the student portal. Students with blank scores receive no result for that assessment.

Creating assessments, saving scores and publishing require both the school's Teacher membership and a linked teacher profile assigned to that subject offering. Platform administrator, school-head and adviser roles alone do not grant score-write authority. Existing authorized staff may read assessments/rosters according to their current scope.

## Data and privacy

- Assessment and score tables enforce tenant-aware foreign keys and RLS. Direct authenticated writes are disabled.
- Teacher mutations are fixed server-side RPCs with fresh assignment checks, audit records and atomic score batches.
- Expected-version checks and row locks prevent stale saves or publication after another teacher's change. Refresh and review before retrying a conflict.
- Student results come from a separate own-identity projection, including for mixed-role accounts. The student interface does not query the staff score table or receive classmates' scores.
- Published assessments cannot be altered through the application RPCs. Entries cannot exceed the maximum or target a student outside subject enrollment.

## Current limits

The editor supports up to 500 students; larger rosters show an explicit limit instead of enabling partial editing/publication. Teacher lists and student results show the most recent 100 assessments/results. Assessment title/date/maximum editing, deletion, post-publication corrections, absent/exempt statuses, grading categories, weighted grade calculations and reports are later work. No automatic publication, email notification or grade calculation occurs.

Blank-score publication is deliberate and explicitly confirmed: only recorded scores are released. Once published, additional missing scores cannot be added in this release. Use drafts until ready to release.

The new migration and boundary tests run in isolated embedded PostgreSQL. No hosted migration, live academic data change, or real teacher/student Auth journey was performed during implementation.
