## Why

The backend encounters a PostgREST schema cache error because the `terms_accepted`, `terms_accepted_at`, and `terms_version` columns are missing from the remote database's `kyc_records` table, despite a local migration file describing them. This prevents successful KYC submission and retrieval.

## What Changes

- Apply the existing migration (`20260625000000_add_kyc_terms_consent.sql`) to the VPS database to add `terms_accepted`, `terms_accepted_at`, and `terms_version` columns to the `kyc_records` table.
- Reload the PostgREST schema cache so PostgREST recognizes the new columns.
- Ensure the frontend and server action handlers correctly align with these column types.

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- Database schema of `kyc_records` on VPS is updated.
- Server action `submitKYC` and `getKYCRecord` in `app/actions/kyc.js` will correctly insert/query without PostgREST errors.
