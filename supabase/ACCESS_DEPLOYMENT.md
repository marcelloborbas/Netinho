# Access levels migration

## Google OAuth diagnosis — 2026-10-17

The real Google authorization request was checked outside the preview iframe.
Google returned `400 redirect_uri_mismatch` before account selection. In the
Google Cloud OAuth web client whose ID starts with `782863745777-qlvnbg6`, add
the following exact authorized redirect URI (preserve existing entries):

```text
https://ajopipjydbphhwgtjfki.supabase.co/auth/v1/callback
```

Also verify that Supabase Authentication's allowed redirect URLs include
`http://127.0.0.1:5173/auth` for this local preview and the production `/auth`
URL for the published site. These are separate settings from Google's callback.
No Google Cloud settings have been changed. The preview login handler now opens
the standalone `/auth` page before starting OAuth, avoiding login in an iframe.
End-to-end sign-in remains pending the provider configuration and a real login.

Apply `20261016000000_catalog_access_levels.sql` to the existing database only
after verifying a trusted administrator already exists in `public.user_roles`.
New registrations no longer receive administrator or seller roles automatically.
Administrator provisioning is a trusted database operation, not a signup flow.

This repository has two migration histories. The baseline schema and order
function live in `drizzle/migrations/0000...` and `0001...`. An older Supabase
migration (`20261015000000_google_representative_access.sql`) references
`commercial_representatives` before the following migration creates that table.
For a fresh test database, apply the drizzle baseline, then Supabase migration
`20261015000100_commercial_representatives.sql`, then `20261015000000...`, then
the remaining Supabase migrations in chronological order. Do not replay the
drizzle temporary-access migration after this new access migration: it replaces
the signup trigger with the insecure automatic role grants this migration fixes.
Existing production migration history must be inspected before deployment.

Run `psql "$TEST_DATABASE_URL" -f supabase/tests/catalog_access_levels.sql`
against a disposable migrated database. Tests require a database owner session
that can create auth fixtures and switch to the `authenticated` role. They run
inside a transaction and roll back all fixtures. They have not been executed
against the production database.

Local validation on 2026-10-16 also passed using in-memory PostgreSQL via
PGlite (`node tmp/validation/validate-access.mjs`). The harness supplies a minimal
Supabase auth schema, JWT functions and database roles, applies the legacy and
new migrations, and runs the assertions above. It additionally verified all
244 FCO product price records remained unchanged, exactly 357 HD products were
seeded (two with sourced cash references), and reapplying market references did
not overwrite an existing HD price or note. This validates SQL and row policies;
Google OAuth provider settings, real Supabase grants/configuration and email
delivery still need verification in the actual configured environment.

Visitors use `catalog_products()` because direct product reads are commercial
only. The RPC explicitly returns null for all price columns, price notes and
stock. Profile selection on the frontend never changes database authorization.
Approved representatives can manage their own customers without a legacy
`seller` role. An administrator's existing password login remains available.
Other password-only and anonymous sessions receive no access context.

Orders can only be written through `create_order(payload)`; prices and totals
are calculated from database products, and customer ownership is checked before
creating the historical snapshots. Direct order/item writes are revoked.
Administrative status changes must use `update_order_status(order_id,new_status)`.

Representative email authorization requires a confirmed email and a Google-linked
account. Once a representative record is linked to a user ID, its email cannot
authorize a different account. Active status is checked for every database call;
revoking a representative does not depend on waiting for JWT expiration.
