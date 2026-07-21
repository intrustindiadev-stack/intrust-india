## ADDED Requirements

### Requirement: CRM user sync deduplication covers phone-only accounts
The `sync_user_to_crm` DB trigger SHALL check both email and phone when determining whether a CRM lead already exists for a user, so that phone-only accounts (where `user_profiles.email IS NULL`) are not inserted as duplicate leads.

#### Scenario: Phone-only user registers — no duplicate lead created
- **WHEN** a new `user_profiles` row is inserted with `role='customer'`, `email=NULL`, and a non-null `phone`
- **THEN** the trigger inserts at most one `crm_leads` row for that phone, and a second registration attempt with the same phone does not create a second lead

#### Scenario: Email-only user registers — existing dedup logic unchanged
- **WHEN** a new `user_profiles` row is inserted with `role='customer'`, a non-null `email`, and `phone=NULL`
- **THEN** the trigger deduplicates on email as before and inserts at most one lead

### Requirement: pipeline_stage stays in sync with status on crm_leads
The `crm_leads.pipeline_stage` column SHALL always equal `status::text` after any INSERT or UPDATE so that views/queries relying on `pipeline_stage` reflect the current pipeline position.

#### Scenario: Lead status updated to 'qualified' — pipeline_stage auto-synced
- **WHEN** a CRM lead's `status` is updated from `'new'` to `'qualified'`
- **THEN** `pipeline_stage` is automatically set to `'qualified'` within the same transaction

#### Scenario: New lead inserted — pipeline_stage matches initial status
- **WHEN** a new lead is inserted with `status='new'`
- **THEN** `pipeline_stage` is set to `'new'` at insertion time

### Requirement: crm_tasks access is scoped to lead ownership
The `crm_tasks` table SHALL restrict SELECT, INSERT, and UPDATE operations so that a `sales_exec` can only access tasks belonging to leads they own or are assigned to. Managers and admins retain full access.

#### Scenario: Sales exec cannot see tasks for leads they don't own
- **WHEN** a `sales_exec` queries `crm_tasks`
- **THEN** only tasks whose `lead_id` maps to a `crm_leads` row where `assigned_to = auth.uid()` OR `created_by = auth.uid()` are returned

#### Scenario: Sales manager can see all tasks
- **WHEN** a `sales_manager` queries `crm_tasks`
- **THEN** all task rows are returned regardless of `assigned_to`

### Requirement: crm_lead_services access is scoped to lead ownership
The `crm_lead_services` table SHALL apply the same ownership-scoped RLS as `crm_tasks`.

#### Scenario: Sales exec cannot see services for leads they don't own
- **WHEN** a `sales_exec` queries `crm_lead_services`
- **THEN** only services whose `lead_id` maps to a lead they own are returned
