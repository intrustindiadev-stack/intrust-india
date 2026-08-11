# INTRUST India — Security Remediation Report

**Date:** August 12, 2026
**Incident:** Privilege Escalation & Unauthorized Wallet Manipulation (Aug 11, 2026)

## 1. What was vulnerable

The August 11 production incident was made possible by a class of authorization vulnerabilities where:
- Privileged `SECURITY DEFINER` RPC functions lacked internal identity verification (`auth.uid()`).
- These functions were granted `EXECUTE` privileges to the `anon` and `authenticated` roles.
- This allowed attackers to invoke them directly via the Supabase REST API, supplying arbitrary parameters (e.g., granting themselves the `admin` role, or crediting their wallet with arbitrary amounts).
- Critical database tables (e.g., `user_profiles`) lacked column-level security guards for sensitive fields (e.g., `role`, `is_active`).

## 2. What was fixed

- **Wallet Hardening:** The `atomic_customer_wallet_credit` function was locked down. Direct `EXECUTE` access from users was revoked. The function now requires `service_role` access (backend-only) and internally blocks any invocation where `auth.uid()` is present (rejecting user client requests).
- **Privilege Escalation Blocked:** `EXECUTE` grants were revoked from `anon` for all admin functions, including `admin_update_user_role`. 
- **Column Guards Extended:** The `user_profiles_sensitive_column_guard` database trigger was extended to protect the `is_active` and `employee_number` columns.
- **Unauthenticated Backend Access Removed:** The `/api/test-wallet` API route, which exposed the `service_role` key without authentication, was permanently deleted.
- **HRM Profile Updates Secured:** Replaced direct client-side `supabase.update()` calls on `user_profiles` with a secure server-side endpoint (`/api/hrm/employees/[id]`) that strictly enforces HR roles and only allows modifications to a whitelist of safe fields.
- **RLS Policy Fix:** The "HR managers can update all profiles" policy was updated to perform a secure database lookup for the user's role instead of trusting the mutable JWT `user_metadata`.

## 3. What remains

- **P0-4 Payout Authorization:** Functions like `admin_approve_payout` and `admin_reject_payout` currently rely on a caller-supplied `p_admin_user_id`. While anon access is blocked, these must be updated to securely derive identity from `auth.uid()` to prevent BOLA (Broken Object Level Authorization) attacks by authenticated admins.
- **Broader Financial Audit:** The initial financial function audit revealed dozens of other functions (e.g., `customer_purchase_from_merchant`, `customer_checkout_v4`, `finalize_gateway_orders`) that lack internal `auth.uid()` checks. These must be analyzed to ensure their `EXECUTE` grants are strictly restricted to `service_role`.
- **Search Path Hardening:** Over 50 `SECURITY DEFINER` functions currently lack `SET search_path = 'public'`, presenting a minor, but valid, search-path injection risk.

## 4. Exact files changed

- `app/(hrm)/hrm/employees/[id]/page.jsx`
- `app/api/test-wallet/route.js`
- `app/api/hrm/employees/[id]/route.js` (NEW)
- `e2e_tests/security_hardening_tests.mjs` (NEW)
- `scripts/dev/apply_security_hardening.py` (NEW)

## 5. Exact migrations created

- `supabase/migrations/20260812_p0_security_hardening_execute_grants.sql`
- `supabase/migrations/20260812_p1_security_hardening_column_guard.sql`
- `supabase/migrations/20260812_p2_harden_atomic_wallet_credit_internal_auth.sql`

## 6. Database functions changed

- `public.atomic_customer_wallet_credit`
- `public.user_profiles_block_sensitive_column_updates`

## 7. EXECUTE privileges changed

`EXECUTE` privileges were revoked from `anon` and `authenticated` (restricted to `service_role`) for:
- `atomic_customer_wallet_credit`
- `merge_duplicate_user_data`
- `admin_takeover_stale_orders`

`EXECUTE` privileges were revoked from `anon` for:
- `admin_update_user_role`
- `admin_suspend_user`
- `admin_unsuspend_user`
- `admin_approve_payout`
- `admin_reject_payout`
- `admin_bulk_insert_coupons`
- `admin_bulk_insert_coupons_v2`
- `admin_insert_shopping_product`
- `admin_update_shopping_product`
- `admin_update_product_stock`
- `adjust_employee_leave_balance`
- `admin_get_all_orders`
- `admin_get_order_detail`
- `admin_get_takeover_orders`
- `admin_mark_expired_coupons`
- `admin_takeover_single_order`
- `reset_otp_rate_limit`
- `admin_link_email_identity`
- `admin_reassign_lead`
- `admin_review_leave_request`

## 8. RLS policies changed

- **Table:** `user_profiles`
- **Policy:** `"HR managers can update all profiles"`
- **Change:** Switched from `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = ANY (...)` to an `EXISTS (SELECT 1 FROM public.user_profiles ...)` lookup.
- **Policy:** `"HR managers can view all profiles"`
- **Change:** Applied the same secure lookup pattern.

## 9. API routes changed

- `/api/test-wallet/route.js`: Deleted (Returns 410 Gone).
- `/api/hrm/employees/[id]/route.js`: Created to handle HR profile updates securely.

## 10. Security tests

| Attack | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- |
| `anon` → `atomic_customer_wallet_credit` | Permission denied | Error 42501 (Permission denied) | PASS |
| `anon` → `admin_update_user_role` | Permission denied / Failure | Error 42501 (Permission denied) | PASS |
| `anon` → `admin_suspend_user` | Permission denied / Failure | Error 42501 (Permission denied) | PASS |
| `anon` → `admin_approve_payout` | Permission denied / Failure | Error 42501 (Permission denied) | PASS |
| GET `/api/test-wallet` | 410 Gone | HTTP 410 | PASS |

## 11. Production deployment order

1. Execute database migrations using `scripts/dev/apply_security_hardening.py`.
2. Delete `/api/test-wallet/route.js`.
3. Deploy new `/api/hrm/employees/[id]` endpoint.
4. Deploy updated `app/(hrm)/hrm/employees/[id]/page.jsx`.
5. Run automated E2E tests (`e2e_tests/security_hardening_tests.mjs`).

## 12. Rollback plan

- **Grants:** Execute `GRANT EXECUTE ON FUNCTION <name> TO anon;` (or `authenticated`) for the affected functions.
- **Column Guard:** Drop the trigger and revert the `user_profiles_block_sensitive_column_updates` function to its previous definition (omitting `is_active` and `employee_number`).
- **Test Wallet:** Restore `app/api/test-wallet/route.js` from version control.
- **HRM Update:** Revert the changes to the React component and delete the new API route.

## 13. Residual risks

The application is still not fully secured against this class of vulnerabilities.
- We must systematically analyze and lock down the remaining functions identified in the financial audit (`customer_purchase_from_merchant`, `customer_checkout_v4`, `finalize_gateway_orders`, etc.).
- Administrative functions still accept caller-supplied user IDs for the actor, leaving the door open for lateral movement (BOLA) among authenticated administrators.
- The lack of `SET search_path` on many `SECURITY DEFINER` functions presents a latent, though currently unexploitable, risk.
