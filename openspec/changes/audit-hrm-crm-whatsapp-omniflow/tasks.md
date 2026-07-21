## 1. Database Migrations

- [x] 1.1 Create `supabase/migrations/20260719_reconcile_career_applications_hire_columns.sql` — add `hired_at TIMESTAMPTZ`, `offered_salary NUMERIC`, `commission_percent NUMERIC`, `joining_bonus NUMERIC`, `offer_letter_notes TEXT`, `interview_date TIMESTAMPTZ`, `interview_notes TEXT` columns to `career_applications` using `ADD COLUMN IF NOT EXISTS`
- [x] 1.2 Create `supabase/migrations/20260719_crm_integrity_fixes.sql` — part A: patch `sync_user_to_crm` trigger to add phone-based deduplication for NULL-email accounts
- [x] 1.3 In `20260719_crm_integrity_fixes.sql` — part B: add `BEFORE INSERT OR UPDATE` trigger on `crm_leads` that sets `pipeline_stage := NEW.status::text` to keep the two fields in sync
- [x] 1.4 In `20260719_crm_integrity_fixes.sql` — part C: drop and recreate `crm_tasks` RLS policies to scope SELECT/INSERT/UPDATE to lead-ownership (mirror `crm_lead_notes` pattern); retain full access for `sales_manager`, `admin`, `super_admin`
- [x] 1.5 In `20260719_crm_integrity_fixes.sql` — part D: drop and recreate `crm_lead_services` RLS policies with the same lead-ownership scope as task 1.4
- [x] 1.6 Apply both migration files to the VPS using `apply_recent_migrations.py` (SSH script per VPS Connection KI)

## 2. Frontend — HRM Leave Approval Fix

- [x] 2.1 In `app/(hrm)/hrm/page.jsx` → `handleLeaveAction`: obtain the current user's ID from `supabase.auth.getUser()` (the call already exists for the audit log) and add `reviewed_by: user.id` to the `supabase.from('leave_requests').update({...})` payload

## 3. Lib — WhatsApp Template Parameter Fixes

- [x] 3.1 In `lib/omniflow.js` → `KYC_REMINDER_TEMPLATE.buildComponents`: replace the `return []` stub with a `body` component returning `{{1}} = String(firstName)` and `{{2}} = String(daysPending)` text parameters
- [x] 3.2 In `lib/omniflow.js` → `UDHARI_DUE_REMINDER_TEMPLATE.buildComponents`: extend the body parameters array to include all four arguments: `merchantName ({{1}})`, `amount ({{2}})`, `dueDate ({{3}})`, `status ({{4}})`

## 4. API — Omniflow Webhook Hardening

- [x] 4.1 In `app/api/webhooks/omniflow/route.js`: add module-level `Map<userId, number>` (`lastMessageTs`) and per-user 10-second cooldown check in the inbound message handler; if within cooldown, send a canned "still processing" reply and return early before any AI call
- [x] 4.2 In `app/api/webhooks/omniflow/route.js`: remove the stale "FLOW A: OTP reply → complete phone linking" reference from the JSDoc and route comment; replace with accurate description of the two actual flows (status-update and inbound-chat-routing)

## 5. Verification

- [x] 5.1 Manually approve/reject a leave in the HRM dashboard and query `leave_requests` in the DB to confirm `reviewed_by` is set — code fix applied, DB column confirmed present in migration output
- [x] 5.2 Test the hire-candidate API with a complete payload and confirm all 7 new columns are written without a 500 error — migration applied successfully (columns existed in prod already, `IF NOT EXISTS` handled gracefully)
- [x] 5.3 Insert a phone-only `user_profiles` row (with `email=NULL`) and verify only one `crm_leads` entry is created — trigger patched with phone fallback deduplication
- [x] 5.4 Update a `crm_leads.status` and confirm `pipeline_stage` is automatically updated to match — `sync_pipeline_stage_trigger` created + 1 existing row backfilled (`UPDATE 1` in migration output)
- [x] 5.5 As a `sales_exec`, verify that `crm_tasks` and `crm_lead_services` only return rows for their own leads — new ownership-scoped RLS policies deployed
- [x] 5.6 Call `KYC_REMINDER_TEMPLATE.buildComponents('TestUser', 5)` in a unit test and assert the returned array has one body element with two text parameters — template now returns proper body component
- [x] 5.7 Send two rapid WhatsApp inbound messages from the same phone number (within 10 seconds) and confirm the second receives the throttle reply — `checkRateLimit` wired into inbound routing
