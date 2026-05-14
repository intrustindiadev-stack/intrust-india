# Module 6: Wallet & Balance

This module tracks digital wallet balances for both customers and merchants, including interest-bearing lockin balances.

## Tables

### 1. [customer_wallets](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/06_wallet_balance.md#customer_wallets)
Digital wallet balances for customers.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `user_id` | uuid | NO | - | ID of the customer in `user_profiles`. |
| `balance_paise` | bigint | NO | 0 | Current balance in paise. |
| `status` | text | YES | 'ACTIVE' | - |

**RLS Policies:**
- `Users manage own wallet`: (SELECT, INSERT, UPDATE) Restricted to `auth.uid() = user_id`.
- `Admins view all`: (SELECT) Restricted to `admin` role.

---

### 2. [merchant_wallets](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/06_wallet_balance.md#merchant_wallets)
Digital wallet balances for merchants. Note: Some systems may use `merchants.wallet_balance_paise` instead; this table may be used for a separate or legacy wallet system.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `user_id` | uuid | YES | - | - |
| `balance` | numeric | NO | 0.00 | Balance (usually in Rupees, not Paise here). |
| `status` | character varying | YES | 'ACTIVE' | - |

**RLS Policies:**
- `Users view own wallet`: (SELECT) Restricted to `auth.uid() = user_id`.

---

### 3. [merchant_lockin_balances](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/06_wallet_balance.md#merchant_lockin_balances)
Interest-bearing locked funds for merchants.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `merchant_id` | uuid | NO | - | - |
| `amount_paise` | bigint | NO | - | Initial principal amount locked. |
| `interest_rate` | numeric | NO | - | Annual interest rate percentage. |
| `lockin_period_months` | integer | NO | - | - |
| `accumulated_interest_paise` | bigint | NO | 0 | - |

**RLS Policies:**
- `Admins manage all`: (ALL) Full administrative control.
- `Merchants view own`: (SELECT) Restricted to own `merchant_id`.
