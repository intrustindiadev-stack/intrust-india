# Module 2: Merchant Core

This module contains the core profiles and settings for merchants on the platform.

## Tables

### 1. [merchants](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/02_merchant_core.md#merchants)
The primary table for merchant information and business details.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | uuid_generate_v4() | - |
| `user_id` | uuid | NO | - | ID of the merchant user in `user_profiles`. |
| `business_name` | text | NO | - | - |
| `gst_number` | text | YES | - | - |
| `pan_number` | text | YES | - | - |
| `status` | text | NO | 'pending'::text | Current status: pending, approved, rejected, suspended. |
| `wallet_balance_paise` | bigint | NO | 0 | Current wallet balance in paise (1 rupee = 100 paise). |
| `total_commission_paid_paise` | bigint | NO | 0 | Total commission paid to platform. |
| `business_type` | text | YES | - | Sole Proprietor, Partnership, Private Ltd, etc. |
| `bank_account_number` | text | YES | - | - |
| `bank_ifsc_code` | text | YES | - | - |
| `slug` | text | NO | - | Unique URL-friendly identifier. |
| `is_open` | boolean | YES | true | Manual toggle for store visibility. |
| ... and more (total rows: 35) | | | | |

**RLS Policies:**
- `Public can view approved merchants`: (SELECT) Approved merchants are visible to all.
- `merchants_admin_select`: (SELECT) Own profile or admin access.
- `merchants_update_policy`: (UPDATE) Only owner can update.
- `merchants_insert_policy`: (INSERT) Only owner can insert.

---

### 2. [merchant_notification_settings](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/02_merchant_core.md#merchant_notification_settings)
Persistent notification preferences for merchants.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `merchant_id` | uuid | NO | - | - |
| `email_notifications` | boolean | NO | true | - |
| `sale_notifications` | boolean | NO | true | - |
| `marketing_updates` | boolean | NO | false | - |

**RLS Policies:**
- `Merchants can view/update their own settings`: Restricted to the merchant owner via subquery.

---

### 3. [merchant_udhari_settings](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/02_merchant_core.md#merchant_udhari_settings)
Configuration for the store credit / "Udhari" system for a merchant.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `merchant_id` | uuid | NO | - | - |
| `udhari_enabled` | boolean | NO | false | - |
| `max_credit_limit_paise` | bigint | YES | 500000 | - |
| `max_duration_days` | integer | YES | 15 | - |

**RLS Policies:**
- `Allow authenticated users to read`: (SELECT) Necessary for customers to check udhari availability during checkout.
- `Merchant management`: Only owners can update.

---

### 4. [merchant_ratings](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/02_merchant_core.md#merchant_ratings)
Customer ratings and feedback for merchants.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | uuid_generate_v4() | - |
| `merchant_id` | uuid | NO | - | - |
| `customer_id` | uuid | NO | - | - |
| `rating_value` | integer | NO | - | 1-5 scale. |
| `feedback_text` | text | YES | - | - |

**RLS Policies:**
- `Public can read all ratings`: (SELECT) Ratings are public.
- `Customers can insert own ratings`: (INSERT) Restricted to the customer who made the purchase.
