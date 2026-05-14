# Module 09: Order Management

End-to-end order tracking, lifecycle management, and revenue analytics.

## Tables

### shopping_orders
High-level order records for customer and merchant purchases.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | - |
| buyer_id | uuid | NO | - | Reference to user or merchant |
| buyer_type | text | NO | - | 'customer' or 'merchant' |
| product_id | uuid | NO | - | Reference to products |
| quantity | integer | NO | - | - |
| total_price_paise | bigint | NO | - | - |
| status | text | YES | 'completed' | - |
| order_type | text | NO | - | - |
| created_at | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `Users can view own purchase history`: Buyers (customers/merchants) and sellers can view relevant order groups.

---

### shopping_order_items
Individual line items within a shopping order group.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | - |
| group_id | uuid | NO | - | Reference to shopping_order_groups |
| product_id | uuid | NO | - | Reference to products |
| quantity | integer | NO | - | - |
| unit_price_paise | bigint | NO | - | - |
| cost_price_paise | bigint | NO | - | - |
| profit_paise | bigint | NO | - | - |
| commission_amount_paise | bigint | YES | 0 | - |
| gst_amount_paise | bigint | YES | 0 | - |
| created_at | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `Merchants view sold items`: Sellers can view items they sold.
- `Users view own items`: Customers can view items in their order groups.

---

### wholesale_order_drafts
Temporary drafts for wholesale orders before confirmation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| merchant_id | uuid | YES | - | Reference to merchants |
| items | jsonb[] | NO | - | List of requested items |
| total_amount_paise | bigint | NO | - | - |
| status | text | NO | 'pending' | - |
| created_at | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `Merchants can view their own wholesale drafts`: Owners can view.
- `Users can see their own wholesale drafts`: Owners or Admins can view.

---

### nfc_orders
Orders specifically for NFC-enabled physical cards.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | - |
| user_id | uuid | YES | - | Reference to user_profiles |
| card_holder_name | text | NO | - | - |
| phone | text | NO | - | - |
| delivery_address | text | NO | - | - |
| status | text | YES | 'pending' | - |
| payment_status | text | YES | 'pending' | - |
| sale_price_paise | bigint | NO | - | - |
| payment_method | text | YES | 'online' | wallet or online |
| created_at | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `Nexus: View Own Order`: Owners can view.
- `Nexus: Admin Orders`: Admins have full access.

---

### nfc_settings
Configuration settings for NFC features.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| key | text | NO | - | - |
| value | text | NO | - | - |
| updated_at | timestamp with time zone | YES | now() | - |

**RLS Policies:**
- `Nexus: Read Settings`: Public read access.
- `Nexus: Admin Settings`: Admin full access.

---

### admin_revenue_summary
Platform-wide revenue tracking view (or table).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| total_transactions | bigint | YES | - | - |
| total_platform_revenue_paise | numeric | YES | - | - |
| total_gmv_paise | numeric | YES | - | - |
| unique_buyers | bigint | YES | - | - |
| last_transaction | timestamp with time zone | YES | - | - |

---

### orders (Legacy/Generic)
Generic orders table, likely for miscellaneous or legacy purchases.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| user_id | uuid | YES | - | - |
| amount | numeric | NO | - | - |
| payment_status | text | YES | 'created' | - |
| created_at | timestamp without time zone | YES | now() | - |

**RLS Policies:**
- `users_view_own_orders`: Owners can view.
- `users_insert_own_orders`: Owners can insert.
