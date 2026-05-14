# Module 4: Shopping Core

This module manages the customer's shopping experience, including carts, order grouping, and wishlists.

## Tables

### 1. [shopping_cart](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/04_shopping_core.md#shopping_cart)
Stores items currently in a customer's shopping cart.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | uuid_generate_v4() | - |
| `customer_id` | uuid | NO | - | ID of the customer in `user_profiles`. |
| `inventory_id` | uuid | YES | - | ID of the item in `merchant_inventory`. |
| `product_id` | uuid | NO | - | ID of the base product. |
| `quantity` | integer | NO | - | - |
| `is_platform_item` | boolean | YES | false | - |

**RLS Policies:**
- `Users can manage own cart`: (ALL) Fully restricted to `customer_id = auth.uid()`.

---

### 2. [shopping_order_groups](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/04_shopping_core.md#shopping_order_groups)
Groups individual orders into a single checkout session or delivery group.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | uuid_generate_v4() | - |
| `customer_id` | uuid | NO | - | - |
| `total_amount_paise` | bigint | NO | - | - |
| `status` | text | YES | 'pending' | - |
| `delivery_status` | text | YES | 'pending' | - |
| `payment_method` | text | YES | 'wallet' | - |
| `payment_status` | text | NO | 'pending' | - |
| `commission_rate` | numeric | YES | 0.70 | Platform commission rate. |
| `merchant_profit_paise` | bigint | YES | 0 | Net profit for the merchant. |

**RLS Policies:**
- `Admins can view all order groups`: (SELECT) Via `is_admin()`.
- `Users view own order groups`: (SELECT) Restricted to `customer_id`.
- `Merchants view group if sold item`: (SELECT) Restricted to groups containing their products.
- `Merchants update own order group status`: (UPDATE) Only for their products.

---

### 3. [user_wishlists](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/04_shopping_core.md#user_wishlists)
Customer wishlists for tracking future purchases.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | gen_random_uuid() | - |
| `user_id` | uuid | NO | - | - |
| `product_id` | uuid | NO | - | - |

**RLS Policies:**
- `wishlist_owner_all`: (ALL) Fully restricted to `user_id = auth.uid()`.
