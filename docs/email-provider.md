# Resend email provider

## Supabase authentication delivery

Deskonekt uses Supabase Auth. Configure Resend as custom SMTP in the hosted Supabase project; no Resend SDK or Vercel environment variable is needed for this delivery path.

1. Add a domain you control in Resend → Domains. Add the exact DNS records Resend provides at your DNS host, then wait for Verified status. The sender address must use the verified domain.
2. Create a Resend API key for sending from that domain. Enter the key directly into Supabase's SMTP password field; do not put it in source control or a NEXT_PUBLIC variable.
3. In the Supabase project connected to Deskonekt, open Authentication → Email (under Notifications) → SMTP Settings. Enable custom SMTP and save:

| Setting | Value |
| --- | --- |
| Sender name | Deskonekt |
| Sender email | An address on your verified domain |
| Host | smtp.resend.com |
| Port | 465 |
| Username | resend |
| Password | Your Resend API key |

4. Set Supabase Authentication URL Configuration → Site URL to the actual deployed Deskonekt URL. Redirect URLs must match implemented application flows; no recovery/accept-invitation route exists yet.
5. Keep click tracking off for authentication links and review Supabase Auth rate limits alongside your Resend sending allowance.

Sources: [Resend Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp), [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Application scope

SMTP configuration enables delivery for emails requested by Supabase Auth. It does not add invitation buttons, password recovery pages, account acceptance flows or school roles to Deskonekt. Ordinary password sign-in does not send an email. The existing bootstrap script explicitly confirms the new administrator and sends no email.

Future Auth invitations can use Supabase's invitation API and this same SMTP provider. Invitation acceptance and password setup still need implementation before onboarding users by email. Other application notifications can use Resend's server-side API when their workflows are implemented; do not add an unused runtime key or public send-email endpoint now.

## Setup status

The provider settings above were verified against official documentation on 2026-09-14. The sending domain, DNS verification and hosted SMTP configuration have not yet been confirmed. No emails have been sent and no external settings have been changed by this workspace.
