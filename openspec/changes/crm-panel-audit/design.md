## Context

The Intrust CRM panel is implemented as a Next.js App Router application (`app/(crm)/...`) integrated with Supabase PostgreSQL and real-time channels. It supports sales lead creation, lead assignment, drag-and-drop Kanban pipeline updates, CSV bulk imports, interaction timelines, and role-based access control (Sales Executive, Sales Manager, Admin, Super Admin).

Before end-to-end testing, an audit was conducted to review the full workflow, input validation, state synchronization, database triggers, and Row Level Security (RLS) policies.

## Goals / Non-Goals

**Goals:**
- Provide a complete audit mapping out the CRM workflow architecture across frontend, API/Server actions, and Supabase RLS.
- Document a numbered list of potential bugs, vulnerabilities, missing input constraints, and UI state desynchronizations found during the audit.
- Provide actionable recommendations for fixes across validation, RLS, Kanban drag-and-drop, and trigger safety.

**Non-Goals:**
- Implementing new CRM features (e.g. email marketing automation or third-party CRM integrations).

## Decisions

### Decision 1: Strict Zod Validation Schema for CRM Operations
- **Choice**: Enforce central Zod validation schemas for all CRM lead mutations (creation, CSV import, status update, note creation, task creation).
- **Rationale**: Prevents empty/malformed leads (missing titles, invalid phone numbers, invalid emails) from persisting in Supabase and crashing real-time components or export scripts.

### Decision 2: Refined RLS Policy Bounds & Executive Scope
- **Choice**: Explicitly enforce `(assigned_to = auth.uid() OR created_by = auth.uid() OR role IN ('sales_manager', 'admin', 'super_admin'))` across `crm_leads`, `crm_tasks`, `crm_lead_notes`, `crm_lead_activities`, and `crm_lead_services`.
- **Rationale**: Eliminates security gaps where unassigned leads could be modified by unauthorized executives or where cross-tenant task insertion was permitted.

### Decision 3: Rollback & Re-sync Strategy for Drag-and-Drop Kanban Board
- **Choice**: Wrap optimistic state updates in `app/(crm)/crm/pipeline/page.jsx` with an explicit catch-and-revert state mechanism if the `supabase.from('crm_leads').update({ status })` call fails.
- **Rationale**: Ensures the frontend state immediately reflects backend reality if network disconnects or RLS denials occur during drag-and-drop.

## Risks / Trade-offs

- **[Risk]**: RLS queries performing role lookups (`SELECT role FROM user_profiles WHERE id = auth.uid()`) could impact query latency on large lead datasets.
  - **Mitigation**: Ensure an index exists on `user_profiles(id, role)` and cache role checks in JWT metadata where appropriate.
- **[Risk]**: Real-time channel listeners (`postgres_changes`) triggering full dataset refetches on every row update.
  - **Mitigation**: Implement debouncing on real-time refetch handlers in `app/(crm)/crm/page.jsx` and `app/(crm)/crm/leads/page.jsx`.
