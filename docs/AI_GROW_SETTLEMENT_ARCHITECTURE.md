# AI Grow Settlement Architecture & Remediation Manual

## 1. Overview
The AI Grow program allows merchants to allocate capital into simulated order fulfillment pools, earning administrative/simulated profits recorded in `merchant_investment_orders.profit_paise`. 
Prior to this remediation, settlements suffered from:
1. **Wallet Column Trigger Violations**: Attempted direct Node.js mutations of `merchants.wallet_balance_paise` blocked by `merchants_sensitive_column_guard`.
2. **Partial State Financial Desynchronization**: Multi-step non-atomic operations where vault debit succeeded while wallet credit failed.
3. **UX Ambiguity**: Identical confirmation modals for "Settled in Cash" vs "Wallet Settlement", leading administrators to inadvertently mark investments as paid offline (as occurred in the Surya Enterprises incident).

---

## 2. Core Architecture & Accounting Model

```
+---------------------------------------------------------------+
|                      AI Grow Settlement                       |
|                                                               |
|  Principal:   merchant_investments.amount_paise               |
|  Profit:      SUM(merchant_investment_orders.profit_paise)   |
|  Total:       Principal + Profit                              |
+---------------------------------------------------------------+
                                |
             +------------------+------------------+
             |                                     |
   [Destination: WALLET]               [Destination: OFFLINE_CASH]
             |                                     |
    1. Debit AI Grow Vault               1. Debit AI Grow Vault
    2. Credit Merchant Wallet            2. NO Digital Wallet Credit
    3. Merchant Ledger (+Total)          3. Offline Settlement Audit
    4. AI Grow Ledger (-Principal)       4. AI Grow Ledger (-Principal)
    5. Mark 'completed'                  5. Mark 'completed'
```

- **Principal** (`amount_paise`): Exits the merchant's `ai_grow_wallets` vault balance.
- **Simulated Profit** (`profit_paise`): Calculated dynamically from completed simulation orders. Unfunded prior to settlement; materialized as a platform credit liability to the merchant's digital wallet upon wallet settlement.
- **Paise Precision**: All operations use 64-bit integer (`BIGINT`) arithmetic in paise (`₹1 = 100 paise`). Floating-point currency arithmetic is strictly prohibited.

---

## 3. Database RPC Specifications

### A. `public.settle_ai_grow_investment`
Executes growth plan settlement as a single atomic PostgreSQL transaction.

```sql
SELECT public.settle_ai_grow_investment(
  p_investment_id         UUID,
  p_admin_id              UUID,
  p_settlement_destination TEXT,  -- 'wallet' | 'offline_cash'
  p_idempotency_key       TEXT,
  p_notes                 TEXT
);
```

#### Invariants & Sequence:
1. **Security**: `SECURITY DEFINER`, `search_path = public`. Verifies caller is super admin or service role.
2. **Pessimistic Locking**: `FOR UPDATE` on `merchant_investments`, `merchants`, and `ai_grow_wallets`.
3. **Idempotency**: If status is already `completed` or `released`, returns `already_settled: true` safely without modifying balances or ledgers.
4. **Vault Debit**: Debits `ai_grow_wallets.balance_paise` by principal amount. Records `ai_grow_wallet_transactions` entry with `transaction_type = 'SETTLEMENT_WITHDRAWAL'`.
5. **Destination Routing**:
   - `wallet`:
     - Activates `app.internal_bypass = 'true'` within the local transaction.
     - Updates `merchants.wallet_balance_paise += total_payout_paise`.
     - Resets `app.internal_bypass`.
     - Inserts record into `merchant_transactions` (`type = 'CREDIT'`, `source = 'AI_GROW'`, `category = 'INVESTMENT_RETURN'`).
   - `offline_cash`:
     - Digital wallet balance remains strictly unchanged (`+₹0.00`).
     - Logs `OFFLINE_CASH_SETTLEMENT` audit entry.
6. **Status & Notification**: Updates `merchant_investments.status = 'completed'` and generates an in-app notification explicitly stating the settlement destination.

### B. `public.settle_ai_grow_vault_to_wallet`
Atomically moves uninvested liquid vault capital back to the merchant's digital wallet.

```sql
SELECT public.settle_ai_grow_vault_to_wallet(
  p_merchant_id     UUID,
  p_admin_id        UUID,
  p_amount_rupees   NUMERIC,
  p_reason          TEXT,
  p_settlement_type TEXT,
  p_idempotency_key TEXT
);
```
- Validates vault balance sufficiency.
- Locks merchant and vault records `FOR UPDATE`.
- Debits vault and credits wallet under `app.internal_bypass = 'true'`.
- Writes dual ledger entries atomically.

---

## 4. Security & Permissions

1. **Restricted Execution**:
   - Grants revoked from `PUBLIC` and `anon`.
   - Granted exclusively to `authenticated` and `service_role`.
   - Hard authorization check within the RPC:
     ```sql
     IF v_role <> 'super_admin' AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
         RAISE EXCEPTION 'Access denied: Super admin role required for AI Grow settlement' USING ERRCODE = '42501';
     END IF;
     ```
2. **Protection Guard Compliance**:
   - `merchants_block_sensitive_column_updates()` is never disabled or removed.
   - Internal bypass is executed strictly within `SECURITY DEFINER` context with `is_local = true`.

---

## 5. Mobile-First Admin UX Architecture

### Unified Component: `InvestmentSettlementFlow.jsx`
Both `/admin/investments` and `/admin/portfolio/[merchantId]` use this unified component.

- **Step 1 (Destination Selector)**:
  - Card A: **Settle to Merchant Wallet (Recommended)** — Emphasizes "+₹Total to Merchant Digital Wallet".
  - Card B: **Mark as Paid Offline** — Explicitly states "₹0 Digital Wallet Credit. Payment made outside app".
- **Step 2 (Confirmation Modal)**:
  - Displays Merchant, Investment Plan, Principal, Profit, and Total Payout.
  - Displays **Destination Badge** (`MERCHANT DIGITAL WALLET` vs `OFFLINE CASH / NO WALLET CREDIT`).
  - Displays Before & After wallet balances (`₹X → ₹X + Total` vs `₹X → ₹X (No change)`).
  - For offline cash: requires an explicit acknowledgement checkbox:
    `"I understand that this payout will NOT be added to the merchant's digital wallet."`
  - Distinct CTA buttons:
    - Wallet: `Credit ₹XX,XXX to Wallet`
    - Cash: `Mark ₹XX,XXX as Paid Offline`

---

## 6. Historical Data Reconciliation: Surya Enterprises

### Incident Summary
- Merchant ID: `fdfc3555-f5e8-44c8-91c4-3e15226a42a9`
- Plans:
  1. `4a1c5d98-63be-4ddc-8fc5-9189b88746dc` (Principal ₹17,998 + Profit ₹1,202 = ₹19,200)
  2. `23e74be8-c89d-4c38-89c0-67c87424bc27` (Principal ₹9,600 + Profit ₹802 = ₹10,402)
- Total Expected Payout: ₹29,602.00 (2,960,200 paise).
- Historical Action: Settled via legacy `/settle-cash` route. Vault was debited, but digital wallet received ₹0.

### Remediation Procedure
A dedicated reconciliation tool is provided at `scripts/dev/remediate_surya_enterprises.py`.

```bash
# 1. Dry run (default): inspects balances without modifying data
python scripts/dev/remediate_surya_enterprises.py

# 2. Production execution (requires explicit prompt confirmation)
python scripts/dev/remediate_surya_enterprises.py --execute
```

> **IMPORTANT**: DO NOT execute this remediation until business operations confirm that physical cash was NOT disbursed to Surya Enterprises.
