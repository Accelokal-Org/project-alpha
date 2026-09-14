# Removing sample data

The website no longer provides `/preview`, sample school creation, sample login creation, or the admin testing tab. Automatic Supabase seeding and the live test-school creation script are disabled/removed.

## Apply to the hosted database

Deploying Vercel does not run database migrations. Apply `supabase/migrations/202609140003_remove_sample_data.sql` in the SQL Editor of the Supabase project connected to Deskonekt, or use `npx supabase db push` if that project is already linked and its migration history is synchronized. Run the complete file as one transaction. Do not use `db reset` for this cleanup.

The migration:

- Removes schools explicitly marked `is_test`, plus the original seeded school only when both its fixed UUID and name match. It removes their dependent academic records, memberships and sample-school audit rows in foreign-key order.
- Deletes generated `@example.test` Auth users only with a creation audit or known seed-account membership. Users with real-school memberships/profiles, platform authority, or audit activity outside sample schools are preserved. Unproven/unlinked accounts are preserved rather than guessed from their email.
- Preserves platform administrators and moves legacy APP_MANAGER authority attached to a removed sample school into `platform_admins`.
- Removes the test-account RPC and school marker, and replaces the setup RPC with the real-school operations only.

An unmarked school created manually is not automatically classified as sample data. A renamed original seed school is also preserved. Review such records separately before deletion.

The migration is validated in isolated embedded PostgreSQL. It has not been applied to your hosted project by this workspace. Existing historical migrations remain unchanged; new installations apply the cleanup as part of the full migration sequence.
