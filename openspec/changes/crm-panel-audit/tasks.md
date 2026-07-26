## 1. CRM Input Validation & Schema Enforcement

- [x] 1.1 Create Zod validation schema for CRM lead creation, single edit, and CSV bulk import in `lib/crm/validation.ts`
- [x] 1.2 Implement input validation and error feedback in `AddLeadDrawer` and `EditLeadModal` in `app/(crm)/crm/leads/page.jsx` and `app/(crm)/crm/leads/[id]/page.jsx`
- [x] 1.3 Add validation for task creation, activity logging, and sales intent logging in `app/(crm)/crm/leads/[id]/page.jsx`

## 2. Row Level Security (RLS) & Scope Hardening

- [x] 2.1 Audit and update RLS policies on `crm_leads` for unassigned lead access and sales manager role checks
- [x] 2.2 Verify task, note, activity, and service RLS policies for strict lead ownership scoping in `supabase/migrations/20260719_crm_integrity_fixes.sql`

## 3. UI State Synchronization & Error Recovery

- [x] 3.1 Implement optimistic update rollback in Kanban pipeline drag-and-drop (`app/(crm)/crm/pipeline/page.jsx`)
- [x] 3.2 Add debouncing for real-time `postgres_changes` subscriptions on `app/(crm)/crm/page.jsx` and `app/(crm)/crm/leads/page.jsx`

## 4. End-to-End Verification

- [x] 4.1 Run build check (`npm run build` or `next build`) to ensure zero syntax or type errors in CRM code
- [x] 4.2 Validate full audit report recommendations against test user scenarios
