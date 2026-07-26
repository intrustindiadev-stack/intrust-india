## Why

Proactively audit the CRM (Customer Relationship Management) panel in the Next.js & Supabase codebase prior to manual end-to-end testing to identify critical data validation gaps, state desynchronization bugs, RLS security vulnerabilities, and pipeline logic edge cases across sales executive and manager roles.

## What Changes

- **Lead Input & Batch Validation**: Add schema-level validation (phone formats, email syntax, numeric deal values, required titles) across manual lead creation, quick status drawers, CSV batch imports, and detail modals.
- **RLS & Access Control Security**: Tighten Supabase RLS policies for `crm_leads`, `crm_tasks`, `crm_lead_notes`, `crm_lead_activities`, and `crm_lead_services` to enforce strict executive vs manager visibility boundaries and eliminate unassigned lead authorization bypasses.
- **Kanban & Pipeline Sync Integrity**: Fix optimistic UI update rollback failures in Kanban drag-and-drop (`app/(crm)/crm/pipeline/page.jsx`) when DB updates fail or when switching between filtered source views.
- **Database Trigger & Auto-sync Fixes**: Resolve potential trigger loops between `crm_leads.status` and `crm_leads.pipeline_stage` and handle NULL edge cases in auto-generated CRM leads during customer signup (`sync_user_to_crm`).

## Capabilities

### New Capabilities
- `crm-lead-management`: Validated lead lifecycle, CSV batch import sanitization, and real-time state synchronization.
- `crm-access-control`: Role-based data scoping and RLS policy verification for sales executives, sales managers, and admins.

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing -->

## Impact

- **Frontend Routes & Components**: `app/(crm)/crm/page.jsx`, `app/(crm)/crm/leads/page.jsx`, `app/(crm)/crm/leads/[id]/page.jsx`, `app/(crm)/crm/pipeline/page.jsx`, `app/(crm)/crm/reports/page.jsx`
- **Database & RLS**: `supabase/migrations/20260425_crm_schema_and_rls.sql`, `supabase/migrations/20260719_crm_integrity_fixes.sql`
- **Validation & Helpers**: New validation utility for CRM schema parsing and sanitization.
