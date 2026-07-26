## Context

The HRM panel requires enterprise-grade refactoring across security, performance, and reliability. This change details the architectural design for database encryption, MFA-gated RLS policies, RSC data streaming, Zod schema validation, composite indexing, and optimistic UI transitions.

## Goals / Non-Goals

**Goals:**
- Implement PII column encryption with `pgcrypto`.
- Add `aal2` MFA assurance level checks to Supabase RLS policies.
- Introduce Zod schemas (`lib/hrm/validation.ts`) and rate-limiting middleware.
- Transition `/hrm` routes to RSC with `Promise.all` data fetching and Suspense.
- Add composite SQL indexes for high-frequency HRM queries.
- Add strict TypeScript interfaces and React `useOptimistic` hooks.

**Non-Goals:**
- Rewriting non-HRM modules or breaking existing database relationships.

## Decisions

### 1. Database Column Encryption
- **Decision**: Use `pgcrypto` functions `encrypt_pii` / `decrypt_pii` with a secure key stored in Supabase Vault.

### 2. MFA Enforcement in RLS
- **Decision**: Check `(auth.jwt() ->> 'aal') = 'aal2'` in RLS `USING` and `WITH CHECK` clauses for critical HR tables.

### 3. Server Components & Suspense
- **Decision**: Convert client components fetching data via `useEffect` into React Server Components, moving dynamic user interactions into isolated client leaf components under `_components/`.

## Risks / Trade-offs

- **[Risk]**: Users without TOTP/MFA enabled will be blocked from modifying salary records.
  - **Mitigation**: Add clean UI error handling prompting HR managers to enable MFA in profile settings if `aal` level is insufficient.
