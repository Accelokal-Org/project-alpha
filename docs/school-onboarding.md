# School onboarding

Apply **only** `supabase/migrations/202609200002_school_onboarding.sql` after existing migrations, then deploy. Do not rerun earlier migrations. Existing Supabase/Resend invitation configuration is required; there are no new environment variables.

## Workflow

Open **Superadmin → Set up school** at `/deskonekt/admin/setup` and enter:

- Name of school
- School head email address
- First name
- Last name

Confirm the details and select **Set up school**. The school starts with timezone `Asia/Manila`, matching the previous creation form; change it in School settings when needed.

For a new Auth email, Deskonekt sends the existing Supabase invitation through Resend SMTP, pre-fills account profile names, and assigns only the `SCHOOL_HEAD` role for the new school. The recipient accepts the email, confirms their name and sets a password using the existing account-setup flow. School-head-only access does not create a teacher profile or assign classes.

If an Auth account already exists, Deskonekt connects it as School Head without another email or overwriting its profile/password. Other roles and school memberships remain unchanged. They can use their existing sign-in or previously received invitation. An existing account that has never completed password setup may still require operator assistance; this flow does not add password recovery.

The result links to school structure, Accounts, user imports and the saved setup status. The administrator can add school years and classes; the head can open the teacher workspace to import users and configure school grading. No sample records or automatic enrollments are created.

## Duplicate prevention and recovery

`school_onboarding` preserves the school, requested head details and invitation status. The form uses a request id; repeat submissions and the same normalized school-name/email pair reuse the saved school. Changing details on an already-saved request is rejected. Open the school settings or Accounts to make subsequent changes. Two distinct schools with the same name and head email need distinct school names in this onboarding flow.

**Recent school setups** displays the latest 20 records; saved setup URLs work for older records. Delivery acceptance is not inbox receipt or proof of completed account setup.

- **Ready to invite:** continue the saved setup.
- **Rate limited:** wait for the email provider's limit to reset, then continue. The existing school is reused.
- **Processing / review if interrupted:** delivery was claimed. Refresh saved status; if it remains unresolved, inspect Supabase Users and email logs before any further send.
- **Needs review:** delivery or access linking was uncertain. If the head's Auth user exists, connect missing School Head access through the school's existing Accounts controls. Do not create another school or automatically resend an invitation.
- **Invited and linked / Existing account linked:** access was assigned when the operation completed. This status is historical, not a live membership or activation audit.

Email delivery and database role assignment are separate operations. A recipient may receive an email before role linking finishes. Failures preserve the school and request; no Auth users or schools are automatically deleted. Manual account linking does not automatically reconcile onboarding status. Reopening a processing/review record never sends another invitation automatically.

## Authorization and verification

The page and Server Action require superadmin access. All three SQL RPCs independently require platform-manager authority, including final linking after a send. School heads cannot create schools or use these RPCs. RLS restricts onboarding records to managers; direct authenticated writes are denied. School creation, existing-user linking, and final invited-user linking use the caller JWT; the elevated Auth client is isolated to invitation delivery. No authorization is taken from editable user metadata.

Automated tests cover duplicate prevention, exact email matching, existing accounts, preserved roles, revoked authority, interrupted sends, rate limits, invalid inputs and route protection. Hosted SMTP delivery and authenticated onboarding UI remain to be verified after deployment; no real invitations were sent during development.
