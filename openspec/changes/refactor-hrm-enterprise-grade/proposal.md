## Why

Following the initial HRM audit and bug fixes, the HRM panel needs to be refactored and optimized to achieve enterprise-level production standards. This requires enforcing PII encryption, MFA assurance in Supabase RLS, Zod validation for API routes, RSC server-side data fetching with Suspense, database composite indexing, and optimistic UI state management.

## What Changes

- **Enterprise PII Encryption**: Implement `pgcrypto` column-level encryption for sensitive salary and employee metadata.
- **MFA Assurance Level Policies**: Enforce `aal2` MFA session validation for sensitive HR management operations via Supabase RLS.
- **Strict Zod API Validation**: Add runtime Zod schema parsing and rate-limiting middleware to all server actions and API routes.
- **RSC Data Fetching & Edge Processing**: Refactor dashboard and list components to Next.js Server Components with Suspense fallbacks, and offload PDF payslip generation to Edge Functions.
- **Database Index Optimization**: Add composite DB indexes for attendance, salary records, and career applications.
- **Strict TypeScript & Optimistic UI**: Add type-safe interfaces (`types/hrm.ts`) and React `useOptimistic` hooks for lag-free status updates.

## Capabilities

### New Capabilities
- `enterprise-hrm`: Covers PII encryption, MFA RLS enforcement, Zod API validation, RSC fetching, DB indexing, and optimistic UI state management for the HRM panel.

### Modified Capabilities
<!-- None -->

## Impact

- **Affected Files**: `app/(hrm)/**`, `app/api/hrm/**`, `lib/hrm/**`, `types/hrm.ts`, `supabase/migrations/`
- **Infrastructure**: Supabase DB (`pgcrypto`, RLS policies, indexes), Next.js App Router, Edge runtime handlers.
