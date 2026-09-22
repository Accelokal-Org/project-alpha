# Account invitations

## Deployment

1. Apply `supabase/migrations/202609140004_account_invitations.sql` to the same Supabase project as Deskonekt, after earlier migrations. This adds the caller-authorized preflight/role-assignment RPC. Website deployment does not apply migrations.
2. Configure these server environment variables in Vercel for the environment receiving invitations:
   - `APP_URL=https://deskonekt.com` (the canonical deployed website origin)
   - `SUPABASE_SERVICE_ROLE_KEY` from that Supabase project. Never prefix it with NEXT_PUBLIC.
   Existing public Supabase URL/publishable key remain required.
3. In Supabase Authentication URL Configuration, use the real website Site URL and allow `https://deskonekt.com/auth/accept` as a redirect URL. Use an explicit matching origin for any separate development deployment.
4. In Supabase Authentication → Email Templates → Invite user, set the subject to `Set up your Deskonekt account` and copy the entire `supabase/templates/invite.html` template. It uses `{{ .RedirectTo }}?token_hash={{ .TokenHash }}`. The default ConfirmationURL template does not implement this server-side setup flow.
5. Confirm Supabase custom SMTP is configured for Resend with a verified sending domain. Keep email click tracking off. Deploy the app before sending invitations.

Sources: [Supabase invitation API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [server-side email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Resend SMTP setup](https://resend.com/docs/send-with-supabase-smtp).

## Superadmin workflow

Open **School → Accounts → Invite a new account**. Enter an email, select school roles, and choose the matching unlinked profile. Create teacher/student profiles in People first. Staff can combine Teacher, Adviser and School head; Student is selected separately. School-head-only accounts need no profile. Platform administrator access cannot be granted with this form.

The recipient opens the email, clicks Accept invitation, sets a password of at least 12 characters, then chooses a workspace. Opening the email landing page alone does not consume the token; confirmation requires a form submission. Role choice never comes from user-editable Auth metadata.

Existing Auth users should use **Connect a login account** to add roles without replacing their account or password. Invitations do not assign teaching subjects or advisory classes; use Assignments for those relationships.

## Failures and limits

The app checks authority, school, roles and profile before sending. Supabase Auth delivery and PostgreSQL role assignment are separate operations and cannot be one transaction. If the email was sent but role assignment failed, the UI reports that explicitly; finish linking the existing email using Connect a login account. All selected roles are assigned atomically in the RPC. Accounts are not deleted on partial failure.

A successful send response means Supabase accepted the invitation request, not that the message reached the inbox. Inspect Supabase Auth and Resend delivery logs for delivery problems. Never keep resending after an ambiguous request without checking whether the user was created.

Expired/used links show a clear error. Already-configured users can sign in normally. A self-service password recovery flow and invitation reissue UI are not yet implemented; incomplete or expired invitations require operator assistance through Supabase. No existing account is overwritten to resend an invitation.

The service-role client is limited to the authorized invitation Auth API; academic records and school role writes use the administrator's JWT. The DB function rechecks authority and profile ownership before finalizing. Setup audit entries record role changes and invitation completion without tokens/passwords.

No live invitation has been sent during implementation. Hosted migration, environment variables, email template and SMTP settings must be configured before the first real invitation.

For school-head bulk creation from CSV, see [school account imports](school-account-imports.md). Existing single-account invitations and account linking remain available.

## Wrong email link or otp_expired

An email link pointing at Supabase `/auth/v1/verify` uses the default verification flow, not this app's confirmation form. Replace the hosted Invite user email with `supabase/templates/invite.html`. Its link must be `{{ .RedirectTo }}?token_hash={{ .TokenHash }}`. This setting is saved in Supabase, not deployed by Vercel. Existing emails do not change when the template is updated.

An `otp_expired` callback means the verification link was rejected as invalid/expired (including already-used links); the URL alone cannot distinguish expiry from email-scanner consumption. The app now shows this error from URL fragments as well as query parameters. It never echoes provider error descriptions or exchanges legacy fragment tokens. Arrange a fresh invitation through operator assistance for the existing account; do not delete its profile/roles or repeatedly create it again. Opening the new token-hash landing page does not verify the token until the recipient presses Accept invitation.
