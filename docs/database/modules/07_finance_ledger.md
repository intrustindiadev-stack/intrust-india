# Module 07: Finance & Ledger

Comprehensive financial tracking across the platform, including customer and merchant wallets, platform-level ledger, and external payment transaction logs.

## Tables

### customer_wallet_transactions
Individual transaction records for customer wallets.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Unique transaction ID |
| wallet_id | uuid | NO | - | Reference to customer_wallets |
| user_id | uuid | NO | - | Reference to the customer (user_profiles) |
| type | text | NO | - | Transaction type (e.g., 'credit', 'debit') |
| amount_paise | bigint | NO | - | Amount in paise |
| balance_before_paise | bigint | NO | - | Balance before transaction |
| balance_after_paise | bigint | NO | - | Balance after transaction |
| description | text | YES | - | Human-readable description |
| reference_id | text | YES | - | External reference ID |
| reference_type | text | YES | - | Type of reference (e.g., 'order') |
| created_at | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `Admins can view all customer wallet transactions`: Admins can view all.
- `App admins can view all wallet txs`: is_admin() can view all.
- `Users can view their own transactions`: User can view where `auth.uid() = user_id`.

---

### merchant_transactions
Financial records for merchant earning and spending.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Unique ID |
| merchant_id | uuid | NO | - | Reference to merchants |
| transaction_type | text | NO | - | Type (e.g., 'earning', 'payout') |
| amount_paise | bigint | NO | - | Transacted amount (negative for debits) |
| commission_paise | bigint | YES | 0 | Platform commission |
| balance_after_paise | bigint | NO | - | Wallet balance after transaction |
| coupon_id | uuid | YES | - | Related coupon (if any) |
| customer_transaction_id | uuid | YES | - | Related customer transaction |
| description | text | NO | - | - |
| metadata | jsonb | YES | - | - |
| created_at | timestamp with time zone | NO | now() | - |

**RLS Policies:**
- `Merchants can view own transactions`: User can view transactions of their own merchant.
- `Service role has full access to merchant_transactions`: Full access for service role.
- `merchant_transactions_admin_select`: is_admin() can view all.

---

### platform_ledger
Centralized ledger for tracking all platform-level financial movements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | - |
| transaction_id | uuid | NO | - | Reference to the main transaction |
| entry_type | USER-DEFINED | NO | - | Type of entry |
| amount_paise | bigint | NO | - | - |
| balance_after_paise | bigint | NO | - | - |
| description | text | NO | - | - |
| created_at | timestamp with time zone | NO | now() | - |

---

### transactions
External payment gateway (SabPaisa/Razorpay) transaction records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | - |
| user_id | uuid | NO | - | Reference to user_profiles |
| expected_amount_paise | bigint | YES | - | Canonical amount derived server-side |
| paid_amount_paise | bigint | YES | - | Actual amount paid |
| status | USER-DEFINED | NO | 'initiated' | transaction_status (e.g., 'success', 'failed') |
| payment_method | text | YES | 'upi' | - |
| payment_reference | text | YES | - | External reference |
| sabpaisa_txn_id | text | YES | - | SabPaisa specific ID |
| rrn | text | YES | - | Retrieval Reference Number |
| refund_status | text | YES | - | - |
| created_at | timestamp with time zone | NO | now() | - |

**RLS Policies:**
- `Users can view own transactions`: User can view where `auth.uid() = user_id`.
- `Users can insert own transactions`: User can insert where `auth.uid() = user_id`.

---

### wallet_adjustment_logs
Audit trail for manual wallet adjustments performed by admins.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| admin_user_id | uuid | NO | - | Admin who performed adjustment |
| target_user_id | uuid | NO | - | User whose wallet was adjusted |
| amount_paise | bigint | NO | - | Always positive; operation determines sign |
| operation | USER-DEFINED | NO | - | credit or debit |
| wallet_type | USER-DEFINED | NO | - | Wallet category |
| reason | text | NO | - | Reason for adjustment |
| status | USER-DEFINED | NO | 'pending' | adjustment_status_enum |
| idempotency_key | uuid | NO | - | Prevents duplicate adjustments |
| created_at | timestamp with time zone | NO | now() | - |

**RLS Policies:**
- `Admins can view all adjustment logs`: Admins can view all.
- `Users can view own adjustment logs`: Users can view their own.

---

### wallet_transactions
Legacy or secondary wallet transaction table (numeric-based).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| amount | numeric | NO | - | - |
| balance_before | numeric | NO | - | - |
| balance_after | numeric | NO | - | - |
| transaction_type | character varying | NO | - | - |
| created_at | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `Admins can view all wallet transactions`: Admins can view all.
- `Users can view their own transactions`: User can view where `auth.uid() = user_id`.

---

### transaction_logs
Low-level logs for payment processing events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| event_type | text | NO | - | - |
| payload | jsonb | YES | - | - |
| message | text | YES | - | - |
| created_at | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `No read access on logs for users`: Denies all public read access.
