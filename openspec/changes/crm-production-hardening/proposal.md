## Why

The CRM panel has critical gaps in production readiness. It currently lacks audit logs for high-value events (lead reassignment, deal value changes), relies on hard-deletes, has insecure or missing RLS policies (e.g., no DELETE policy on `crm_leads`), and suffers from performance issues due to missing database indexes and N+1 query patterns in the frontend. Hardening these areas is essential for security, compliance, and scalability before scaling team usage.

## What Changes

- Add `crm_leads` DELETE policy (manager-only) to prevent unauthorized deletions.
- Create an `audit_logs_crm` table and DB triggers to log sensitive CRM events (reassignment, status changes, etc.).
- Implement soft-delete functionality (`archived_at`) for leads instead of destructive hard deletes.
- Add database indexes on frequently queried columns across all CRM tables (e.g., `status`, `assigned_to`, `created_at`).
- Refactor data fetching in `leads/[id]/page.jsx` to parallelize queries and eliminate N+1 waterfall patterns.
- Add debouncing to the real-time subscription in the pipeline page.

## Capabilities

### New Capabilities
- `crm-audit-logs`: Tracks all changes to leads, tasks, and services for compliance.
- `crm-performance-optimizations`: Ensures fast load times via DB indexes and optimized frontend fetching.
- `crm-security-policies`: Strengthens RLS and introduces soft-deletes to protect CRM data.

### Modified Capabilities
- None

## Impact

- **Database**: New tables (`audit_logs_crm`), modified schemas (`archived_at` on leads), new indexes, and updated RLS policies.
- **Frontend**: Modified CRM pages (`leads/[id]/page.jsx`, `pipeline/page.jsx`) to handle soft-deletes, optimized data fetching, and debouncing.
- **Security**: Strengthened access control and full auditability for CRM operations.
