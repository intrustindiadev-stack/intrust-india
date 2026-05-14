# Module 5: Product & Inventory

This module handles the catalog of products, categories, merchant-specific inventory, and coupons.

## Tables

### 1. [shopping_products](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/05_product_inventory.md#shopping_products)
The master catalog of products available on the platform.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | uuid_generate_v4() | - |
| `title` | text | NO | - | - |
| `wholesale_price_paise` | bigint | NO | - | Price at which merchants buy from platform. |
| `suggested_retail_price_paise` | bigint | YES | - | - |
| `admin_stock` | integer | NO | 0 | Stock available at platform level. |
| `approval_status` | text | NO | 'live' | - |

**RLS Policies:**
- `Admins can manage products`: (ALL) Via `is_admin()`.
- `Anyone can view active products`: (SELECT) Public visibility for `is_active = true`.

---

### 2. [shopping_categories](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/05_product_inventory.md#shopping_categories)
Product categories for organization and filtering.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | gen_random_uuid() | - |
| `name` | text | NO | - | - |
| `is_active` | boolean | YES | true | - |

**RLS Policies:**
- `Anyone can view active categories`: (SELECT) Public visibility.

---

### 3. [merchant_inventory](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/05_product_inventory.md#merchant_inventory)
Inventory listed by specific merchants.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `merchant_id` | uuid | NO | - | - |
| `retail_price_paise` | bigint | NO | - | Price set by the merchant. |
| `stock_quantity` | integer | NO | 0 | - |

**RLS Policies:**
- `Anyone can view active inventory`: (SELECT) Visible if `stock_quantity > 0`.
- `Merchants manage own inventory`: (ALL) Restricted to own `merchant_id`.

---

### 4. [coupons](file:///c:/Users/2003a/Desktop/Projects/intrust-india/intrust-india-main/docs/database/modules/05_product_inventory.md#coupons)
Discount coupons and giftcards available on the platform or marketplace.

| Column | Type | Nullable | Default | Description |
| --- | --- | --- | --- | --- |
| `face_value_paise` | bigint | NO | - | Monetary value of the coupon. |
| `selling_price_paise` | bigint | NO | - | Cost to purchase the coupon. |
| `status` | coupon_status | NO | 'available' | - |
| `listed_on_marketplace` | boolean | YES | false | - |

**RLS Policies:**
- `Admins can manage all`: (ALL) Full administrative control.
- `Customers can view marketplace`: (SELECT) Visible if listed and available.
- `Merchants view/update own`: (SELECT, UPDATE) Restricted to own coupons.
