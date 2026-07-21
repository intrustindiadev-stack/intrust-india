## Why

The HRM, CRM, Omniflow, and WhatsApp integration subsystems have grown incrementally across 170+ migrations and were never subjected to a unified architectural audit. Multiple deferred fixes, schema drifts, incomplete edge-case handling, and stale migration comments exist — creating silent data-flow risks and audit gaps that could surface as production bugs or compliance failures.

## What Changes

- **HRM – `audit_logs_hrm` double-schema problem**: The original `20260425_hrm_schema_and_rls.sql` creates `audit_logs_hrm` as a "future / not deployed" table (under the unused `employees` layout). A later migration (`20260507_add_hrm_audit_columns_and_policies.sql`) adds columns and RLS to it as if it were live. The HRM dashboard (`hrm/page.jsx`) already writes to it. This split-brain definition needs to be reconciled with a single authoritative spec and the dead unused tables (`employees`, `attendance_logs`, `leave_balances`, `employee_documents`) need to be formally marked for deprecation/removal.
- **HRM – `hire-candidate` route missing `hired_at` / `offered_salary` columns on `career_applications`**: The API writes `hired_at`, `offered_salary`, `commission_percent`, `joining_bonus`, `offer_letter_notes`, `interview_date`, `interview_notes`, and `panel_access_granted` to `career_applications`, but the base `20260425_career_schema_and_rls.sql` does not define those columns. A reconcile migration must be created (mirrors the `20260612000000_reconcile_crm_leads_columns.sql` pattern used for CRM).
- **HRM – Leave approval writes `reviewed_by` but the column is never populated**: `handleLeaveAction` in `hrm/page.jsx` updates `status` and `reviewed_at` but never sets `reviewed_by = auth.uid()`. This breaks auditability.
- **CRM – `sync_user_to_crm` trigger deduplication uses `email` only**: The trigger (`20260426_crm_sync_triggers.sql`) checks `WHERE email = u.email` to avoid duplicates, but `user_profiles.email` can be NULL (phone-only accounts). This silently allows duplicate CRM leads for phone-first users. The deduplication must be extended to check phone as a secondary key.
- **CRM – `crm_tasks` / `crm_lead_services` RLS is permissive (`USING (true)`)**: Both tables allow any authenticated user to read/write all rows. This is a security gap — tasks and service proposals should be scoped to the lead they belong to, the same way `crm_lead_notes` is restricted.
- **CRM – `crm_leads.pipeline_stage` column is redundant with `status`**: Both `status` (ENUM) and `pipeline_stage` (TEXT, default `'new'`) exist on `crm_leads` and represent the same concept. The CRM dashboard reads only `status`; `pipeline_stage` is never updated. This causes the Kanban pipeline view to always show leads as `'new'` regardless of their actual `status`. The two fields need to be unified or `pipeline_stage` kept in sync via trigger.
- **WhatsApp/Omniflow – `user_channel_bindings` `onConflict` key was supposed to migrate**: Migration `20260508_merchant_whatsapp.sql` added a `FORWARD-ACTION REQUIRED IN CODE` comment requiring that the upsert `onConflict` key in `app/api/webhooks/omniflow/route.js` and `app/api/whatsapp/verify-otp/route.js` change to `'user_id,audience'`. The `ensureBinding.js` library already uses the correct key. The webhook route never does a binding upsert (it only reads bindings) so that specific comment was already moot — but there is no verify-otp route under `app/api/whatsapp/` (only under `app/api/auth/`). The forwarding comment must be formally resolved and the `app/api/auth/verify-otp/route.js` upsert key confirmed correct.
- **WhatsApp – `KYC_REMINDER_TEMPLATE.buildComponents` returns empty array**: The `KYC_REMINDER_TEMPLATE` in `lib/omniflow.js` accepts `(firstName, daysPending)` but its `buildComponents` returns `[]` (no parameters), meaning the WhatsApp template will always send with no variable substitutions. This is a silent data-loss bug.
- **WhatsApp – `UDHARI_DUE_REMINDER_TEMPLATE` drops `merchantName` and `status`**: The `buildComponents(merchantName, amount, dueDate, status)` function only passes `amount` and `dueDate` to the template body, ignoring `merchantName` and `status` despite the function signature listing them.
- **Omniflow – Inbound OTP-reply flow (`FLOW A`) is referenced in the route JSDoc but not implemented**: The route comment documents "FLOW A: OTP reply → complete phone linking", but no `OTP reply` branch exists in the POST handler body — it jumps straight to message routing. The OTP linking handshake was either removed or never implemented, and the comment is misleading.
- **Omniflow – No rate-limiting on inbound webhook chat messages**: The customer and merchant inbound handlers call the expensive `sendMessageToAgent` (LLM + round-trip) on every inbound message with zero debounce or rate-limit, opening the system to DoS via message flooding.

## Capabilities

### New Capabilities
- `hrm-schema-reconcile`: Canonical HRM schema — reconcile `audit_logs_hrm`, deprecate dead tables, and align `career_applications` with all columns the API writes.
- `crm-data-integrity`: CRM sync trigger deduplication fix, `pipeline_stage`↔`status` unification, and RLS hardening for `crm_tasks` / `crm_lead_services`.
- `whatsapp-template-params`: Fix `KYC_REMINDER_TEMPLATE` and `UDHARI_DUE_REMINDER_TEMPLATE` so `buildComponents` returns correct parameter arrays.
- `omniflow-webhook-hardening`: Resolve the stale OTP-flow comment, confirm `onConflict` keys, add per-user inbound rate limiting on chat messages.

### Modified Capabilities
<!-- No existing openspec/specs/ entries to delta — these are all net-new audit fixes -->

## Impact

- **Database**: New SQL migration for `career_applications` missing columns; optional cleanup migration to drop/rename unused HRM tables.
- **API routes**: `app/api/hrm/hire-candidate/route.js` (no changes needed — columns added via migration), `app/api/webhooks/omniflow/route.js` (rate-limit guard, OTP comment removal), `app/api/auth/verify-otp/route.js` (confirm `onConflict` key).
- **Frontend**: `app/(hrm)/hrm/page.jsx` — add `reviewed_by` to the leave-approval update payload.
- **Lib**: `lib/omniflow.js` — fix `KYC_REMINDER_TEMPLATE.buildComponents` and `UDHARI_DUE_REMINDER_TEMPLATE.buildComponents`.
- **DB triggers**: `sync_user_to_crm` — extend deduplication to cover phone; `crm_leads` — add trigger or constraint to keep `pipeline_stage` in sync with `status`.
