## Context

This is a cross-cutting audit of four interconnected subsystems — HRM, CRM, WhatsApp (Omniflow), and the employee onboarding pipeline — that have grown organically across 170+ migrations. No unified review has ever been conducted. Several migration files contain explicit `FORWARD-ACTION REQUIRED IN CODE` comments that were never acted on, and multiple schema/code divergences have been identified. The project runs on a remote Supabase VPS (SSH-only access; migrations must be applied via `apply_recent_migrations.py`).

## Goals / Non-Goals

**Goals:**
- Eliminate schema drift between migration definitions and API write paths (career_applications, audit_logs_hrm).
- Fix silent data-integrity bugs in CRM sync triggers and pipeline_stage/status divergence.
- Harden Omniflow inbound webhook against message flooding.
- Fix two broken WhatsApp template `buildComponents` functions that produce empty parameter arrays.
- Resolve the stale OTP-flow comment in the Omniflow webhook.
- Add `reviewed_by` to the leave-approval update path.

**Non-Goals:**
- Full rewrite of HRM/CRM UIs.
- Removing the unused HRM tables (`employees`, `attendance_logs`, `leave_balances`, `employee_documents`) from the live DB — they are inert and removal carries risk; we will only add a schema comment documenting them as deprecated.
- Implementing new features beyond the fixes identified in the audit.

## Decisions

### D1 – `career_applications` missing columns → reconcile migration (not ORM)
The `hire-candidate` API writes 7 columns that don't exist in the base schema. **Decision**: create a new migration `20260719_reconcile_career_applications_hire_columns.sql` using `ADD COLUMN IF NOT EXISTS` (same pattern as `20260612000000_reconcile_crm_leads_columns.sql`). This is the least-risky approach given the VPS constraint.

**Alternative considered**: Backfill via `ALTER TABLE` in the route itself at startup — rejected because it would run on every cold boot and require elevated privileges in the app process.

### D2 – `reviewed_by` in leave approval → frontend fix only
The `leave_requests` table already has a `reviewed_by UUID` column (defined in the HRM schema). The bug is purely in `hrm/page.jsx` where the update payload omits it. **Decision**: add `reviewed_by: user.id` (obtained from `supabase.auth.getUser()` which is already being called for the audit log) to the `supabase.from('leave_requests').update(...)` call.

### D3 – CRM sync trigger phone deduplication → DB trigger patch migration
The `sync_user_to_crm` function checks only `WHERE email = u.email`. When `email` is NULL (phone-only accounts), this condition is `NULL = NULL` which is always false in SQL, allowing duplicates. **Decision**: add a secondary phone check: `OR (phone = u.phone AND u.phone IS NOT NULL)` and guard against NULL email by also checking `email IS NOT NULL` before the email comparison.

**Alternative considered**: application-layer dedup before CRM insert — rejected because the trigger is the canonical entry point and fixing it there closes the gap for all future inserts.

### D4 – `crm_leads.pipeline_stage` vs `status` unification → sync trigger
`pipeline_stage` (TEXT) and `status` (ENUM `lead_status`) represent the same concept. The CRM dashboard exclusively reads `status`. `pipeline_stage` is seeded as `'new'` at insert time but never updated. **Decision**: add a `BEFORE INSERT OR UPDATE` trigger on `crm_leads` that keeps `pipeline_stage` in sync with `status`. This preserves backward compatibility (the column remains) while ensuring the Kanban view that reads `pipeline_stage` shows correct data.

**Alternative considered**: DROP `pipeline_stage` and migrate all reads to `status` — rejected because it risks breaking unknown Kanban-facing queries and requires a larger frontend audit.

### D5 – `crm_tasks` / `crm_lead_services` RLS → restrict to lead ownership
Both tables have `USING (true)` policies allowing any authenticated user full access. **Decision**: replace with lead-scoped policies mirroring `crm_lead_notes` — allow SELECT/INSERT/UPDATE to `actor_id = auth.uid()` or users with manager/admin roles, and only on tasks/services whose `lead_id` they own or manage.

### D6 – `KYC_REMINDER_TEMPLATE` and `UDHARI_DUE_REMINDER_TEMPLATE` → fix buildComponents
`KYC_REMINDER_TEMPLATE.buildComponents` returns `[]` despite accepting `(firstName, daysPending)`. The approved Meta template presumably has `{{1}}` = firstName and `{{2}}` = daysPending pending count. **Decision**: populate the parameters array to match the expected template shape. If the actual template is variable-free, the function should accept no arguments and have a JSDoc note explaining this. We will fix it to return the body parameters that match the template spec comment (none currently documented). Given the template name and signature, the correct fix is to add a `body` component with `firstName` and `daysPending` as `{{1}}` and `{{2}}`.

`UDHARI_DUE_REMINDER_TEMPLATE` drops `merchantName` and `status` from its body despite listing them in the signature. **Decision**: add them as `{{1}}` and map the remaining params to `{{2}}`, `{{3}}`, `{{4}}` to match the presumed approved template body.

### D7 – Omniflow inbound rate-limit → in-memory per-user throttle
There is no protection against a user sending 100 messages in 10 seconds, each triggering a full AI inference call. **Decision**: add a lightweight in-process `Map<userId, lastMessageTimestamp>` throttle with a 10-second cooldown. If the same user sends again within 10s, respond with a canned "I'm still processing your previous message…" reply and skip the AI call. This is stateless across pods but acceptable for the current single-instance VPS deployment.

**Alternative considered**: Redis-backed rate limiter — overkill for current scale; can be upgraded later.

### D8 – Stale "FLOW A: OTP reply" comment → remove/clarify
The Omniflow webhook POST handler JSDoc mentions "A) OTP reply → complete phone linking" but no such branch exists. Inspecting the codebase: phone linking is done exclusively via `app/api/auth/verify-otp/route.js` and `lib/whatsapp/ensureBinding.js`. The Omniflow webhook was never designed to receive OTP replies — that was an early design idea that was superseded. **Decision**: remove the stale "FLOW A" comment and replace with accurate documentation of the two real flows: (1) outbound status updates and (2) inbound chat routing.

## Risks / Trade-offs

- **[Risk] Migration on live DB** → Mitigation: all migrations use `IF NOT EXISTS` / `CREATE OR REPLACE` / idempotent patterns; apply via the established `apply_recent_migrations.py` SSH script.
- **[Risk] Changing CRM sync trigger may cause duplicate detection false-positives if phones are reused across accounts** → Mitigation: the phone check is guarded by `IS NOT NULL`; the existing email check remains primary.
- **[Risk] Hardening `crm_tasks` RLS may break existing tasks that lack a `lead_id`** → Mitigation: query for orphan tasks before migration; add an RLS bypass for admin/super_admin roles.
- **[Risk] `pipeline_stage` sync trigger could cause unexpected side-effects on bulk inserts** → Mitigation: use `BEFORE UPDATE OR INSERT` with a `NEW.pipeline_stage := NEW.status::text` assignment which is cheap and side-effect-free.
- **[Risk] In-memory rate limiter resets on server restart** → Accepted trade-off for current scale.

## Migration Plan

1. Apply `20260719_reconcile_career_applications_hire_columns.sql` via SSH migration script.
2. Apply `20260719_crm_integrity_fixes.sql` (trigger dedup fix + `pipeline_stage` sync + `crm_tasks`/`crm_lead_services` RLS hardening) via SSH migration script.
3. Deploy code changes: `lib/omniflow.js` (template fixes + rate limiter), `app/(hrm)/hrm/page.jsx` (reviewed_by), `app/api/webhooks/omniflow/route.js` (comment cleanup + rate-limit guard).
4. Verify: manually trigger a test leave approval and confirm `reviewed_by` is set; send a rapid burst of WhatsApp messages and confirm the throttle reply fires; check CRM leads for a phone-only user and confirm no duplicate entry.

**Rollback**: The migrations are additive (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE TRIGGER`, `DROP POLICY + CREATE POLICY`). Code rollback via git revert. No data is deleted.

## Open Questions

- Is `KYC_REMINDER_TEMPLATE` actually approved in Meta? If not, the `buildComponents` fix is moot until approval. *(Recommendation: verify template status via `/api/admin/whatsapp-templates` before shipping.)*
- Should `pipeline_stage` eventually be deprecated entirely in favour of `status` once the Kanban view is confirmed to use `status` directly? *(Deferred — log as a follow-up change.)*
