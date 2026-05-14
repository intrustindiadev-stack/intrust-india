# Module 08: Payouts

Management of giftcards and merchant payout requests.

## Tables

### payout_requests
Requests from merchants to withdraw funds from their wallets.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| merchant_id | uuid | NO | - | Reference to merchants |
| amount | numeric | NO | - | - |
| status | text | NO | 'pending' | e.g., 'pending', 'approved', 'rejected' |
| bank_account_number | text | NO | - | - |
| bank_ifsc | text | NO | - | - |
| bank_account_holder | text | NO | - | - |
| bank_name | text | YES | - | - |
| admin_note | text | YES | - | Notes from admin |
| requested_at | timestamp with time zone | NO | now() | - |
| reviewed_by | uuid | YES | - | Admin who reviewed |
| reviewed_at | timestamp with time zone | YES | - | - |

**RLS Policies:**
- `merchant_view_own_payout_requests`: User can view where `auth.uid() = user_id`.
- `payout_requests_admin_select`: is_admin() can view all.
- `payout_requests_admin_update`: is_admin() can update all.

---

### giftcards
Available giftcards for purchase or distribution.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| title | text | NO | - | - |
| description | text | YES | - | - |
| price | numeric | NO | - | - |
| brand | text | YES | - | - |
| stock | integer | YES | 0 | - |
| is_active | boolean | YES | true | - |
| created_at | timestamp without time zone | YES | now() | - |
