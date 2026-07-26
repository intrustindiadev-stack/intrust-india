## 1. Database Migrations

- [x] 1.1 Create migration to add `archived_at` timestamp to `crm_leads`.
- [x] 1.2 Create migration to define the `audit_logs_crm` table schema.
- [x] 1.3 Create migration to create Postgres trigger functions for auditing `crm_leads`.
- [x] 1.4 Create migration to add B-Tree indexes on `crm_leads` (`status`, `assigned_to`, `created_at`, `email`, `phone`) and foreign keys on `crm_tasks`, `crm_lead_notes`, `crm_lead_activities`, `crm_lead_services`.
- [x] 1.5 Update `crm_leads` RLS policies in the migration to block `DELETE` for non-managers and to ignore rows where `archived_at IS NOT NULL` on `SELECT`.

## 2. Frontend Security & Stability

- [x] 2.1 Update `leads/[id]/page.jsx` to use a soft-delete API call (`archived_at: now()`) instead of hard deletion.
- [x] 2.2 Ensure the UI hides or flags archived leads across all dashboard and list views.

## 3. Frontend Performance Optimization

- [x] 3.1 Refactor `fetchData()` in `leads/[id]/page.jsx` to use `Promise.all` for concurrent data fetching (lead details, tasks, notes, services, activities).
- [x] 3.2 Add debounce logic to the real-time subscription in `pipeline/page.jsx` to prevent excessive re-rendering during bulk updates.

## 4. VPS Deployment (If Applicable)

- [x] 4.1 Apply the new SQL migrations safely to the remote VPS Supabase instance using `apply_recent_migrations.py`.
