## Context

The backend encounters a PostgREST schema cache error because the `terms_accepted`, `terms_accepted_at`, and `terms_version` columns are missing from the remote database's `kyc_records` table on the VPS, even though a local migration file `supabase/migrations/20260625000000_add_kyc_terms_consent.sql` exists.

## Goals / Non-Goals

**Goals:**
- Apply the existing local migration `20260625000000_add_kyc_terms_consent.sql` to the remote Supabase database on the VPS.
- Force a PostgREST schema cache reload so the new columns are immediately detected.
- Verify that `submitKYC` and `getKYCRecord` server actions in `app/actions/kyc.js` run without PostgREST errors.

**Non-Goals:**
- Modifying the existing local migration sql or schema definitions.

## Decisions

- **Use `apply_recent_migrations.py` to apply the migration**: Because the remote database's PostgreSQL port is blocked by the VPS firewall, we must execute the migration via SSH/SFTP as documented in the VPS Connection Guide.
- **Reload PostgREST cache via `NOTIFY`**: PostgREST maintains a cache of the database schema. When we run the migration, we will execute `NOTIFY pgrst, 'reload schema';` or restart/reload PostgREST to ensure the cache is refreshed.

## Risks / Trade-offs

- **Risk**: PostgREST schema cache does not reload automatically.
  - *Mitigation*: Run `NOTIFY pgrst, 'reload schema';` explicitly inside the Supabase DB after applying migrations.
