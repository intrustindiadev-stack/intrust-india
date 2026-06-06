# Incident: J J STORE Wallet Lost-Update — 2026-06-06

## TL;DR

A ₹33,000 wallet credit committed successfully at 05:08:51 was **silently reverted** at 07:49:31 by an unrelated, service-role merchant-row write carrying a stale snapshot of `wallet_balance_paise`. The trigger guard permits this via its `service_role`/`postgres` bypass and writes no ledger row. Result: `merchants.wallet_balance_paise` (₹10,02,907) diverged from the ledger anchor (₹10,35,907) — a ₹33,000 shortfall.

---

## Evidence Table

| Source | Value |
|--------|-------|
| `wallet_adjustment_logs` `29c7afee-6739-49b5-ab52-48439c22a683` (05:08:51) | CREDIT ₹33,000 · before `100290700` · after `103590700` · status `completed` |
| `wallet_transactions` `7b9a43b0…` (05:08:51) | CREDIT 33000 · balance_after `1035907.00` |
| Latest ledger `balance_after` | **₹10,35,907** |
| `merchants.wallet_balance_paise` at time of incident | **`100290700` (₹10,02,907)** — pre-credit value |
| `merchants.updated_at` | `2026-06-06 07:49:31` (after the credit at 05:08) |
| `payout_requests` for merchant | **none** |
| `merchant_transactions` after 05:08 | **none** |
| Event at 07:48:21 | "Bank Account Verified ✅" — admin called `POST /api/admin/verify-bank` |

---

## Root Cause

### What did NOT cause this

- **Not** a blocked `perform_wallet_adjustment` RPC. The RPC is owned by `postgres`, which is unconditionally bypassed by the guard. The 05:08 credit committed fully — audit row `29c7afee`, ledger row `7b9a43b0`, and the balance column all agreed at ₹10,35,907 immediately after.
- **Not** the `auditLog == null` fallback in `WalletService.creditWallet` / `debitWallet` ([`lib/wallet/walletService.js`](../../lib/wallet/walletService.js)). Both code paths run as `service_role` and are bypassed by the guard; neither was invoked here.

### What did cause this

A **subsequent stale-snapshot, service-role write to `merchants.wallet_balance_paise`** that:

1. Read the merchant row at or before 05:08 (getting `wallet_balance_paise = 100290700`).
2. Built an UPDATE payload containing that stale value.
3. Submitted it at 07:49:31 via a `service_role` Supabase client, alongside other (legitimate) column changes.
4. The trigger guard saw `role = service_role` and returned `NEW` immediately, never inspecting the financial column.
5. The stale `wallet_balance_paise = 100290700` was written to the row.
6. **No ledger, no audit, no transaction row was written.**

This is a classic **lost-update / read-modify-write race** enabled by the guard's broad bypass clause.

### The Guard Bypass (Production Drift)

The trigger body active in production at the time of the incident (captured in `20260606120000_capture_merchants_sensitive_column_guard.sql`) contains:

```sql
IF current_setting('app.internal_bypass', true) = 'true'
   OR current_setting('role', true) = 'service_role'
   OR current_user = 'postgres'
THEN
    RETURN NEW;
END IF;
```

The repo migrations only recorded the first clause (`app.internal_bypass`). The `service_role` and `postgres` arms are **production drift** absent from both earlier migrations:
- [`20260422_fix_rls_security_holes.sql`](../../supabase/migrations/20260422_fix_rls_security_holes.sql) — original guard, no bypass at all.
- [`20260423_fix_merchant_settlement_trigger.sql`](../../supabase/migrations/20260423_fix_merchant_settlement_trigger.sql) — added `app.internal_bypass` bypass only.

### Contributing Surfaces Active in the 07:48–07:49 Window

Both of these routes use `createAdminClient()` (a `service_role` Supabase client):

1. **[`app/api/admin/verify-bank/route.js`](../../app/api/admin/verify-bank/route.js)** — `POST /api/admin/verify-bank` at 07:48:21 set `bank_verified = true` on the merchant row. This UPDATE itself only touches `bank_verified`, which is a **protected column**; the live guard bypasses the check for `service_role`, so it succeeds silently. This write alone does not change `wallet_balance_paise`.
2. **[`app/api/merchant/bank-details/route.js`](../../app/api/merchant/bank-details/route.js)** — `POST /api/merchant/bank-details` submits a full bank payload including `updated_at`. This route uses `requireMerchantSubscription` which also resolves to a `service_role` (`admin`) client. If the merchant submitted new bank details around this time, the payload included a snapshot of the merchant row read before the 05:08 credit.

The most probable trigger: a merchant settings or profile save that read the merchant row (snapshot captured before or near 05:08) and re-submitted a full merchant payload — reaching the DB at 07:49:31 with the stale `wallet_balance_paise`. Both routes bypass the guard via `service_role`.

---

## Sequence of Events

```
05:08:51  Admin calls perform_wallet_adjustment(credit ₹33,000)
          → guard bypass: current_user = 'postgres'
          → merchants.wallet_balance_paise: 100290700 → 103590700
          → wallet_adjustment_logs 29c7afee inserted (status=completed)
          → wallet_transactions 7b9a43b0 inserted (balance_after=1035907.00)
          ✓ Books AND balance agree at ₹10,35,907

07:48:21  Admin POSTs /api/admin/verify-bank (bank_verified = true)
          → service_role UPDATE on merchants row

07:49:31  Service-role write lands with stale wallet_balance_paise=100290700
          → guard bypass: role = service_role
          → merchants.wallet_balance_paise: 103590700 → 100290700 ← LOST UPDATE
          → NO wallet_adjustment_logs row
          → NO wallet_transactions row
          ✗ Balance reverts to ₹10,02,907; ledger still shows ₹10,35,907
          ✗ Shortfall: ₹33,000
```

---

## Reproduction on Non-Prod Branch (Procedure)

> **Never reproduce on production.** Use a Supabase dev branch created via `create_branch`.

### Setup

1. Create a dev branch (automatically gets repo migrations applied).
2. Apply `20260606120000_capture_merchants_sensitive_column_guard.sql` so the branch mirrors production's full bypass guard.

### Step 1 — Verify the RPC persists normally

```sql
-- As service_role, call perform_wallet_adjustment for a seeded merchant
SELECT perform_wallet_adjustment(
  p_target_user_id := '<seed_user_id>',
  p_wallet_type    := 'merchant',
  p_operation      := 'credit',
  p_amount_paise   := 3300000,
  ...
);
-- Assert:
SELECT wallet_balance_paise FROM merchants WHERE user_id = '<seed_user_id>';
-- Expect: previous + 3300000
SELECT * FROM wallet_adjustment_logs ORDER BY created_at DESC LIMIT 1;
SELECT * FROM wallet_transactions     ORDER BY created_at DESC LIMIT 1;
```

### Step 2 — Reproduce the bug

```sql
-- 1. Read snapshot BEFORE credit (simulate stale read)
-- (Record wallet_balance_paise = X)

-- 2. Call the RPC → balance becomes X + credit

-- 3. Run a stale-snapshot UPDATE via service_role
UPDATE public.merchants
SET bank_verified = true,
    wallet_balance_paise = X   -- stale value
WHERE id = '<merchant_id>';

-- 4. Observe:
SELECT wallet_balance_paise FROM merchants WHERE id = '<merchant_id>';
-- Returns X (reverted) — reproduces J J STORE

SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 3;
-- No new row for the revert — NO audit trail
```

### Teardown

Delete the dev branch via `delete_branch`.

---

## Remediation

Three actions are taken:

| # | Action | File |
|---|--------|------|
| 1 | This root-cause document | `docs/incident/20260606_jjstore_wallet_lost_update.md` |
| 2 | Capture production guard as tracked migration | `supabase/migrations/20260606120000_capture_merchants_sensitive_column_guard.sql` |
| 3 | Restore J J STORE balance to ₹10,35,907 with a zero-net auditable ledger entry | Applied via `apply_migration` |

### What was NOT done (intentionally)

- **No second `perform_wallet_adjustment` call.** The ledger already contains the ₹33,000 credit (`7b9a43b0`). A new call would double-count to ₹10,68,907.
- **No new "Wallet Credited" notification.** The merchant received one at 05:08:52. This is a silent books↔balance reconciliation.

---

## Hardening Recommendations (Future Phase)

1. **Never include `wallet_balance_paise` in a non-financial UPDATE payload.** Callers should select only the columns they intend to change, not full-row snapshots.
2. **Narrow the `service_role` bypass.** Replace the broad `role = 'service_role'` bypass with explicit function-level guards (e.g., `current_setting('app.internal_bypass') = 'true'`), so only designated RPCs can touch financial columns.
3. **Add a DB-level constraint** or generated column that asserts `wallet_balance_paise` matches the sum of `wallet_transactions` for the user — making divergence immediately detectable.
4. **Add a `balance_drift_monitor`** cron job (e.g., daily) that alerts when `merchants.wallet_balance_paise` diverges from the latest `wallet_transactions.balance_after` by more than ±1 paise.
