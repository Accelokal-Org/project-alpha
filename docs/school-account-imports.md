# School-head account imports

Apply **only** `supabase/migrations/202609200001_school_account_imports.sql` after the existing migrations, then deploy. Do not rerun earlier migrations. This creates no sample data and sends no emails during installation.

## Workflow

1. Open **Teacher workspace → School accounts**, then choose the school. The link is available to school heads and platform managers, regardless of other roles they hold.
2. Download the header-only CSV template. Fill in **Username, Last Name, First Name, Email, Role**, retaining the header order, and export as UTF-8 CSV from Excel or Google Sheets. XLSX files are not supported. The download is named `deskonekt-user-import.csv` and uses UTF-8 with a BOM and CRLF line endings for Excel compatibility.
3. Use `TEACHER`, `ADVISER`, or `STUDENT` in Role. One role per row. Additional cumulative roles can be connected through existing superadmin Accounts controls. Importing privileged school-head or platform-manager roles is not permitted.
4. Upload and review the parsed table. Confirm to create profiles and prepare invitations. Files are limited to 100 KB and 100 users. Validation rejects missing names, invalid emails/identifiers, duplicate rows and existing accounts/profile codes. Database conflicts roll back the entire preparation.
5. Open the saved batch and choose **Send pending invitations**. Keep the page open; each user runs in a separate server request, with durable status between requests. No background worker continues after the page closes. Reopen a batch to resume pending rows.
6. Recipients accept the invitation, confirm their account profile names, and choose a password. Email remains the sign-in identifier. School usernames become employee/student codes, unique across imported users within that school. Academic display names remain school-controlled; account profile names are editable metadata and never authorize roles.

Gmail, Google Workspace and other valid email domains are accepted. No Gmail account or Google OAuth connection is created. Profiles are created automatically; class/subject enrollments and teaching/advisory assignments still follow separately.

## Delivery and recovery

Invitations use Supabase Auth `inviteUserByEmail` and the existing Resend SMTP configuration. Keep the existing `APP_URL`, server-only `SUPABASE_SERVICE_ROLE_KEY`, public Supabase URL/key, `/auth/accept` redirect allowlist, and custom invite email template from [account invitations](account-invitations.md). No additional Resend API key is needed in Vercel. Check Supabase Auth and Resend rate limits for the expected import volume.

- **Ready to send:** no delivery has been claimed.
- **Delivery started:** a request claimed the row. If interrupted, ask a superadmin to investigate before another email attempt.
- **Invited and linked:** the provider accepted the invitation and school access was linked. This is not an inbox receipt or account activation confirmation.
- **Rate limited:** wait for the provider limit to reset, then resume the batch.
- **Superadmin review needed:** delivery is uncertain or an Auth user already exists. Check Supabase Users and email logs. If the account exists, use existing **Connect a login account** with the prepared school profile and intended role. Do not re-import it or send duplicate invitations. If no account exists, investigate the provider failure before an operator resets that row to pending. There is no automatic reset for uncertain sends.

Supabase Auth email delivery and PostgreSQL role linking are separate operations. An email can arrive before access linking completes. Finalization errors retain the claimed row for investigation; no accounts are automatically deleted. Manual linking does not automatically change the import status. Recently imported profiles appear in normal school setup, even if their invitation has not yet been sent.

## Authorization and persistence

`school_account_imports` stores each batch row, school, intended role, profile id and delivery state. RLS limits reads to the school's head or a platform manager. Ordinary direct writes are denied. `prepare_school_accounts` and `claim_school_invitation` validate caller-JWT authority. The service-only `finish_school_invitation` RPC verifies the initiating head/manager still has access, matches the actual Auth user email, atomically links the profile/role, and records an audit event. Client-provided roles or names cannot alter this finalization.

The recent list covers the latest 1,000 imported rows; each batch supports 100. Preserve batch URLs for older imports. The application stops on the first delivery failure so the operator can address it before continuing. Historical import status is delivery status, not a live access audit.

## Verification

Local automated tests cover CSV validation, mixed roles, atomic rollback, school isolation, permission revocation, duplicate claims, service-only finalization, rate-limit handling and ambiguous failures. Browser checks verify route protection and the public blank template. Hosted SMTP delivery and authenticated staff/recipient journeys require verification after applying the migration and deployment; no real emails were sent during development.

References: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

The template link embeds the blank CSV directly, so downloading does not require a server request or JavaScript initialization. `/templates/user-import.csv` remains available as a direct download URL.
