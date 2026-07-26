## Context

The CRM panel has completed initial development but lacks production-grade features. Specifically, it lacks an audit trail for sensitive changes (reassignment, deal value updates), relies on hard-deletes, is missing fundamental security policies (no `DELETE` policy on `crm_leads`), lacks any database indexing, and suffers from performance issues (N+1 waterfall queries) on the lead detail page. Fixing these is required before wider deployment.

## Goals / Non-Goals

**Goals:**
- Secure the CRM data layer (soft deletes, strict RLS).
- Provide a robust, tamper-proof audit trail for CRM events using Postgres triggers.
- Eliminate N+1 query bottlenecks on the frontend and missing indexes on the backend.
- Optimize real-time subscription performance.

**Non-Goals:**
- Complete architectural rewrite to Server Components (this is deferred to a future phase).
- New CRM features (e.g., custom pipelines, automated workflows).
- UI/UX redesigns.

## Decisions

### 1. Database-Level Audit Logging
**Decision**: Implement `audit_logs_crm` and populate it via Postgres triggers.
**Rationale**: Using database triggers ensures that *all* changes are logged, even if they happen via API or directly in the database. Relying on the frontend to log activities is error-prone and insecure.
**Alternative**: Application-level logging (rejected because it can be bypassed).

### 2. Soft-Deletes for Leads
**Decision**: Add an `archived_at` timestamp to `crm_leads`. Update `DELETE` RLS to block hard deletes (except for super admins/managers).
**Rationale**: Hard deleting leads destroys history (notes, tasks, activities). Soft-deleting preserves relational integrity and allows for recovery.

### 3. Query Optimization Strategy
**Decision**: Add B-Tree indexes on `status`, `assigned_to`, `created_at`, `email`, and `phone` in `crm_leads`, and foreign keys in child tables (`crm_tasks`, etc.). Use `Promise.all` in the frontend `leads/[id]/page.jsx`.
**Rationale**: These columns are frequently used in `WHERE` and `ORDER BY` clauses across the application. `Promise.all` resolves the N+1 waterfall issue without requiring a full rewrite to Server Components.

## Risks / Trade-offs

- **Risk: Trigger Performance Overhead** → **Mitigation**: The CRM load is low enough that trigger overhead on `INSERT/UPDATE` is negligible. Ensure triggers only fire when relevant columns change.
- **Risk: Unintended Data Leakage in Soft-Deletes** → **Mitigation**: Ensure all `SELECT` queries across the frontend automatically filter out `archived_at IS NOT NULL` where appropriate (or adjust RLS to enforce this).
- **Risk: Breaking Existing Real-Time Subs** → **Mitigation**: Debouncing is added client-side; the shape of the real-time payloads remains unchanged.
