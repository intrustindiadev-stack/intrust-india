# Intrust India — Fashion Storefront Architecture & UX Audit

---

## 1. Executive Summary

**Overall Health:** **Architecturally Unsafe & Substantially Duplicated (Demo/Mock State)**

The current Fashion implementation is **not safely integrated** with the core Intrust India ecommerce system. Instead, it exists in a disjointed state where:
1. **Catalog & DB Layer:** Specialized tables (`fashion_categories`, `fashion_variants`, `fashion_variant_media`) were added alongside `shopping_products`, but core commerce tables (`shopping_cart`, `shopping_order_items`, `user_wishlists`) have zero awareness or foreign keys to `fashion_variants`.
2. **Cart & Commerce Layer:** Completely disconnected. The PDP (`fashion-product-client.tsx`) and PLP Quick Add (`quick-add-sheet.tsx`) execute dummy `setTimeout` promises that display a fake `"Added to cart!"` toast without ever persisting items to `shopping_cart` or invoking `add_to_shopping_cart`.
3. **Wishlist Layer:** Pure client-side mock (`useState(false)`). Wishlist clicks never write to `user_wishlists` and do not appear on `/wishlist`.
4. **Checkout & Inventory Layer:** Even if a fashion item is added by base `product_id`, the checkout RPCs (`customer_checkout_v4`, `draft_cart_orders`) ignore variant prices, ignore variant-level inventory, decrement platform-level `admin_stock` instead, and fail to record size/color/SKU on `shopping_order_items`.
5. **Navigation & UI Layer:** A redundant standalone header (`fashion-mega-menu.tsx`) was built with its own logo (`"FASHION"`), fake search, and fake cart counter, while the PLP page fell back to rendering the global `Navbar.jsx`.
6. **Routing Conflict:** Placing the optional catch-all `[[...categoryPath]]` and `product/[id]` side-by-side inside `/shop/fashion` produced route collisions resolved only by a fragile runtime redirect hack.

---

## 2. Current Architecture

```text
                               INTRUST INDIA APP
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            │                                                     │
   EXISTING STORE ENGINE                               FASHION STOREFRONT (ISOLATED)
   ─────────────────────                               ─────────────────────────────
   Routes: /shop, /shop/[merchantSlug],                Routes: /shop/fashion/[[...categoryPath]]
           /shop/product/[productSlug]                         /shop/fashion/product/[id]
            │                                                     │
   Shared Global Layout / Navbar                       Dual Header Confusion (Navbar vs MegaMenu)
            │                                                     │
   Database:                                           Database:
     • shopping_products                                 • shopping_products (base)
     • shopping_categories                               • fashion_categories (tree)
     • merchant_inventory                                • fashion_variants (size/color/price)
     • shopping_cart                                     • fashion_variant_media
     • user_wishlists                                             │
     • shopping_order_groups                           Frontend State:
     • shopping_order_items                              • Add-to-cart: MOCKED (setTimeout)
            │                                            • Wishlist: MOCKED (useState)
   RPCs:                                                 • PDP Read: createAdminClient() (Bypasses RLS)
     • add_to_shopping_cart                              • PLP Facets: In-Memory 1000-row Aggregation
     • customer_checkout_v4                                       │
     • draft_cart_orders                                          ▼
     • finalize_gateway_orders                         [ BROKEN COMMERCE HANDOFF ]
            │                                          Cannot checkout variant sizes,
            ▼                                          colors, prices, or inventory.
   REAL CHECKOUT & ORDERS
```

---

## 3. Existing Ecommerce System

The core Intrust store operates on a multi-vendor/platform model:

```text
UI (StorefrontV2Client / ProductDetailClient)
 ↓
Auth Gate (useAuth / Session Cookie)
 ↓
RPC: add_to_shopping_cart(customer_id, inventory_id, product_id, quantity, is_platform)
 ↓
Table: public.shopping_cart (customer_id, inventory_id, product_id, quantity, is_platform_item)
 ↓
Cart Page: /shop/cart (CartClient.jsx)
 ↓
Validation API: POST /api/cart/validate (Checks admin_stock or merchant_inventory.stock_quantity)
 ↓
Checkout API / RPC:
 ├─ Wallet: POST /api/shopping/wallet-checkout → customer_checkout_v4(customer_id)
 └─ Gateway / Store Credit: draft_cart_orders(customer_id) → finalize_gateway_orders(...)
 ↓
Order Tables:
 ├─ public.shopping_order_groups (total_amount_paise, payment_status, delivery_address)
 └─ public.shopping_order_items (group_id, seller_id, product_id, inventory_id, quantity, unit_price_paise)
```

### Core Architecture Entity Map

| Entity | Source of Truth | DB Table | Frontend Component | Backend / Service Layer | Auth / Security Model |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Product** | Database | `public.shopping_products` | `ProductDetailClient.jsx` | `app/api/admin/shopping/products` | Public read `is_active=true` / Admin manage |
| **Category** | Database | `public.shopping_categories` | `ShopCategoriesCarousel.jsx` | `shopping_categories` query | Public read `is_active=true` |
| **Inventory** | Database | `public.merchant_inventory` & `shopping_products.admin_stock` | `ProductDetailClient.jsx` | `/api/cart/validate` | Public read active stock |
| **Cart** | Database | `public.shopping_cart` | `CartClient.jsx` | RPC `add_to_shopping_cart` | RLS + `auth.uid()` security definer |
| **Wishlist** | Database | `public.user_wishlists` | `WishlistClient.jsx` | Supabase Direct Client / RLS | RLS `auth.uid() = user_id` |
| **Checkout** | Database | `public.shopping_order_groups` | `CartClient.jsx` | `/api/shopping/wallet-checkout`, RPC `customer_checkout_v4` | Server service-role / KYC verified |
| **Orders** | Database | `public.shopping_order_items` | `OrdersClient.jsx` | `shopping_orders` query / RLS | RLS `buyer_id = auth.uid()` |

---

## 4. Fashion System

The Fashion system was created via migrations `20260827000000_fashion_categories.sql` and `20260827000001_fashion_admin_rpcs.sql`.

### Structure
* **Taxonomy:** Hierarchical `fashion_categories` with `parent_id`, `level`, `slug`, and unique `path` (e.g. `men/topwear/tshirts`).
* **Product-Category Association:** Many-to-many via `fashion_product_categories(product_id, category_id, is_primary)`.
* **Variants:** `fashion_variants` capturing `sku`, `color`, `size`, `fit`, `fabric`, `price_paise`, `compare_at_price_paise`, and `inventory_quantity`.
* **Media:** `fashion_variant_media(variant_id, image_url, alt_text, display_order)`.

---

## 5. Integration Matrix

| Fashion Capability | Current Implementation | Existing Intrust Equivalent | Shared or Duplicated? | Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Categories** | `fashion_categories` hierarchical tree | `shopping_categories` flat/simple list | **Separate Taxonomy Layer** | Medium (Taxonomy fragmentation) |
| **Products** | Extends `shopping_products` (foreign key) | `shopping_products` | **Shared Core** | Low (Clean FK linkage) |
| **Variants** | `fashion_variants` table | None (Flat products only) | **Fashion-Only** | High (Unintegrated with Cart) |
| **Inventory** | `fashion_variants.inventory_quantity` | `shopping_products.admin_stock` / `merchant_inventory.stock_quantity` | **Duplicated / Ignored** | **P0 (Critical checkout desync)** |
| **Media** | `fashion_variant_media` by variant | `shopping_products.product_images` array | **Extended** | Low |
| **Cart** | `setTimeout` mock in `fashion-product-client.tsx` | `public.shopping_cart` + `add_to_shopping_cart` RPC | **Bypassed / Mocked** | **P0 (Cannot add to cart)** |
| **Wishlist** | `useState(false)` in `product-card.tsx` | `public.user_wishlists` | **Bypassed / Mocked** | **P1 (No persistence)** |
| **Checkout** | Non-existent for variants | `customer_checkout_v4` & `draft_cart_orders` | **Bypassed** | **P0 (Cannot purchase variants)** |
| **Navigation** | `fashion-mega-menu.tsx` (Orphaned) | `Navbar.jsx` | **Duplicated & Orphaned** | Medium (Dead code & UX drift) |
| **Search** | Standalone icon / No implementation | Global Search (`/search`, `GlobalSearchModal.jsx`) | **Disconnected** | Low |
| **Authentication** | Customer Layout Auth / Global Auth | `AuthContext.jsx` & Supabase SSR | **Shared** | Low (Safely shared) |

---

## 6. Critical Problems (P0 / P1)

### P0 — Critical / Breaks Shopping Flow
1. **Mocked Add-to-Cart (`fashion-product-client.tsx` & `quick-add-sheet.tsx`)**
   Both PDP and Quick Add run fake timer simulations:
   ```ts
   // fashion-product-client.tsx
   setIsAdding(true);
   // TODO: Integrate with existing cart logic for variants
   setTimeout(() => {
     setIsAdding(false);
     toast.success('Added to cart!');
   }, 800);
   ```
   No record is ever created in `shopping_cart`.
2. **Missing `variant_id` in Cart & Order Schema**
   `shopping_cart` and `shopping_order_items` only possess `(product_id, inventory_id)`. They lack `variant_id`. Even if `add_to_shopping_cart` were called with `product_id`, the customer's selected size, color, SKU, and variant-specific price are completely lost.
3. **Checkout Pricing & Stock Desynchronization**
   `customer_checkout_v4` charges `COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)` and validates `p.admin_stock`. It does not check or debit `fashion_variants.inventory_quantity` or charge `fashion_variants.price_paise`.
4. **Invalid Schema Column Reference in PDP (`fashion/product/[id]/page.tsx`)**
   The query requests `fashion_variant_media(..., sort_order)` and executes `.order('sort_order')`. The table column in migration is `display_order`. This causes PostgREST query errors.

### P1 — Major Architecture & Conversion Issues
1. **Mocked Wishlist (`product-card.tsx` & `fashion-product-client.tsx`)**
   Wishlist heart buttons only toggle local state `setIsWishlisted(!isWishlisted)`. No rows are inserted into `user_wishlists`.
2. **App Router Route Collision & Middleware Bypass**
   Placing `app/(customer)/shop/fashion/[[...categoryPath]]` alongside `app/(customer)/shop/fashion/product/[id]` triggers route ambiguity in Next.js App Router, requiring an awkward `if (pathArray[0] === 'product') redirect(...)` guard.
3. **Service Role Privilege Escalation for Public PDP Reads (`fashion/product/[id]/page.tsx`)**
   Customer-facing product detail reads instantiate `createAdminClient()`, bypassing RLS unnecessarily where `createStaticSupabaseClient()` should be used.
4. **In-Memory Facet Aggregation Bottleneck (`lib/fashion/facets.ts`)**
   Pulls 1,000 deep relational records into Node.js memory on every PLP request to compute facet counts instead of utilizing an indexed Postgres aggregation or RPC.
5. **Hardcoded Fallback Redirect Breakage (`fashion/[[...categoryPath]]/page.tsx`)**
   Navigating to `/shop/fashion` executes `redirect('/shop/fashion/women')`. If `women` is unseeded (as in migration `20260827000001_fashion_men_category.sql` which only seeded `men`), this throws an instant 404.

---

## 7. Keep / Extend / Refactor / Replace / Remove

| Component / System | File Location | Classification | Evidence & Rationale |
| :--- | :--- | :--- | :--- |
| **Fashion DB Tables** | `20260827000000_fashion_categories.sql` | **KEEP** | `fashion_categories`, `fashion_variants`, `fashion_variant_media` provide a solid normalized schema for fashion catalog data. |
| **Admin Fashion RPCs** | `20260827000001_fashion_admin_rpcs.sql` | **KEEP** | `upsert_fashion_product_data` and `delete_fashion_product_data` work cleanly with the admin product form. |
| **Admin Variants Editor** | `FashionVariantsEditor.jsx` | **KEEP** | Clean UI for managing colors, sizes, SKUs, and variant images in admin/merchant portals. |
| **Public Global Navbar** | `components/layout/Navbar.jsx` | **KEEP** | Authoritative global navigation containing auth, wallet, theme toggle, and notifications. |
| **Cart Schema & RPCs** | `shopping_cart`, `add_to_shopping_cart`, `customer_checkout_v4` | **EXTEND** | Must be extended with optional `variant_id UUID REFERENCES fashion_variants(id)` to support variant pricing and stock deduction. |
| **Wishlist System** | `user_wishlists`, `WishlistClient.jsx` | **EXTEND** | Must be extended with optional `variant_id` to allow saving specific sizes/colors. |
| **PLP Page & Client Wrapper** | `[[...categoryPath]]/page.tsx`, `plp-client-wrapper.tsx` | **REFACTOR** | Refactor routing structure, clean up layout wrappers, and connect Quick Add to the real cart API. |
| **Fashion PDP Client** | `fashion-product-client.tsx` | **REFACTOR** | Replace mock `setTimeout` and `useState` with real `add_to_shopping_cart` RPC and `user_wishlists` mutations. |
| **Facet Calculation** | `lib/fashion/facets.ts` | **REFACTOR** | Replace in-memory 1000-row JS iteration with efficient Postgres query or RPC aggregation. |
| **PDP Server Component** | `fashion/product/[id]/page.tsx` | **REFACTOR** | Fix `sort_order` → `display_order` bug; replace `createAdminClient` with `createStaticSupabaseClient`. |
| **Standalone Mega Menu** | `components/navigation/fashion-mega-menu.tsx` | **REMOVE** | Duplicate, orphaned navigation header with hardcoded mock cart and search. Taxonomy discovery should integrate into the shared navigation system. |
| **Duplicate Category Hero / Breadcrumbs** | `components/category/category-hero.tsx`, `components/category/breadcrumbs.tsx` | **REMOVE** | Unused orphaned files duplicating inlined page code. |

---

## 8. Cart Integration Findings

### Flow Trace: Expected vs. Actual

```text
EXPECTED COMMERCE FLOW:
Fashion Product (PDP/PLP) → Select Color & Size (Variant ID) → Call add_to_shopping_cart(..., variant_id)
 ↓
shopping_cart row stored with (customer_id, product_id, variant_id, quantity)
 ↓
Cart Page (/shop/cart) loads item with variant title, size badge, color swatch, and variant price
 ↓
POST /api/cart/validate revalidates fashion_variants.inventory_quantity
 ↓
Checkout (Wallet or Gateway) → customer_checkout_v4 / finalize_gateway_orders
 ↓
shopping_order_items stores (group_id, product_id, variant_id, variant_price, size/color metadata)
 ↓
fashion_variants.inventory_quantity decremented atomically
```

```text
ACTUAL CURRENT FLOW:
Fashion Product (PDP/PLP) → Select Color & Size
 ↓
Click "Add to Cart" → setTimeout(800ms) → toast.success('Added to cart!')
 ↓
[ CART DATABASE IS NEVER TOUCHED — CART REMAINS EMPTY ]
```

### Gap Analysis
* **Identifiers:** Existing cart requires `(customer_id, product_id, inventory_id, is_platform_item)`. It does not support `variant_id`.
* **SKU / Attributes:** Not stored in `shopping_cart`.
* **Pricing:** `CartClient.jsx` and `customer_checkout_v4` compute pricing from `shopping_products.suggested_retail_price_paise` / `platform_price_paise`. Variant price overrides are ignored.
* **Inventory:** Revalidation endpoint (`/api/cart/validate/route.js`) only queries `shopping_products.admin_stock` and `merchant_inventory.stock_quantity`.
* **Coexistence:** Standard Intrust products and Fashion products *can* coexist once `variant_id` is made a nullable column in `shopping_cart` and `shopping_order_items`.

---

## 9. Wishlist Integration Findings

* **Database Table:** `public.user_wishlists` has schema `(id, user_id, product_id, merchant_id, inventory_id, is_platform_item, added_at)` with `UNIQUE(user_id, product_id)`.
* **Existing Storefront:** `ProductDetailClient.jsx` performs real Supabase upserts on `user_wishlists` with full authentication checks.
* **Fashion Storefront:**
  * `product-card.tsx`: `const handleWishlist = (e) => { e.preventDefault(); setIsWishlisted(w => !w); };`
  * `fashion-product-client.tsx`: `onClick={() => setIsWishlisted(!isWishlisted)}`
* **Verdict:** Wishlist in Fashion is **100% mocked** and disconnected from `public.user_wishlists`.

---

## 10. Product & Variant Findings

```text
┌──────────────────────────────────────────────────────────┐
│              public.shopping_products                    │
│  id (Canonical Product UUID)                             │
│  title, description, base prices, admin_stock            │
└────────────────────────────┬─────────────────────────────┘
                             │ 1:N
                             ▼
┌──────────────────────────────────────────────────────────┐
│               public.fashion_variants                    │
│  id (Canonical Variant UUID)                             │
│  product_id (FK -> shopping_products.id)                 │
│  sku (Unique Variant SKU)                                │
│  color, size, fit, fabric                                │
│  price_paise, compare_at_price_paise                     │
│  inventory_quantity, is_active                           │
└────────────────────────────┬─────────────────────────────┘
                             │ 1:N
                             ▼
┌──────────────────────────────────────────────────────────┐
│             public.fashion_variant_media                 │
│  id (Media UUID)                                         │
│  variant_id (FK -> fashion_variants.id)                  │
│  image_url, alt_text, display_order                      │
└──────────────────────────────────────────────────────────┘
```

* **Canonical IDs:** `shopping_products.id` is the canonical base product ID; `fashion_variants.id` is the canonical purchasable SKU/variant ID.
* **Authoritative Price:** `fashion_variants.price_paise` (fallback to `shopping_products.suggested_retail_price_paise` if no variant is specified).
* **Authoritative Inventory:** `fashion_variants.inventory_quantity` for fashion items.
* **Discrepancy:** The UI displays `fashion_variants.price_paise`, but checkout charges `shopping_products.platform_price_paise` or `suggested_retail_price_paise`.

---

## 11. Database Findings

### Schema & Constraints
* `fashion_categories`: PK `id`, FK `parent_id REFERENCES fashion_categories(id) ON DELETE SET NULL`, `path TEXT NOT NULL UNIQUE`.
* `fashion_product_categories`: Composite PK `(product_id, category_id)`, FKs with `ON DELETE CASCADE`.
* `fashion_variants`: PK `id`, FK `product_id REFERENCES shopping_products(id) ON DELETE CASCADE`, `sku TEXT UNIQUE NOT NULL`.
* `fashion_variant_media`: PK `id`, FK `variant_id REFERENCES fashion_variants(id) ON DELETE CASCADE`, `display_order INTEGER DEFAULT 0`.

### RLS Policies & Security
* Public `SELECT` is safely enabled on `fashion_categories`, `fashion_product_categories`, `fashion_variants`, and `fashion_variant_media`.
* Mutation is restricted to `service_role`.
* RPCs `upsert_fashion_product_data` and `delete_fashion_product_data` are `SECURITY DEFINER` and granted only to `service_role`.
* **Issue:** In `upsert_fashion_product_data`, executing `DELETE FROM fashion_variants WHERE product_id = p_product_id` destroys variant UUIDs on every update. Once `shopping_order_items` references `variant_id`, this hard delete will cause FK constraint violations. It must be updated to upsert by `sku`/`id`.

---

## 12. Routing Findings

### App Router Structure
```text
app/(customer)/shop/
├── page.jsx                        -> /shop (Hub)
├── [merchantSlug]/                 -> /shop/[merchantSlug]
├── cart/                           -> /shop/cart
├── product/[productSlug]/          -> /shop/product/[productSlug] (Standard PDP)
└── fashion/
    ├── [[...categoryPath]]/        -> /shop/fashion/[[...categoryPath]] (PLP Catch-All)
    └── product/[id]/               -> /shop/fashion/product/[id] (Fashion PDP)
```

### Route Conflict
Because `[[...categoryPath]]` is an **optional catch-all** located in `/shop/fashion`, requests to `/shop/fashion/product/xyz` match the catch-all with `params.categoryPath = ['product', 'xyz']`.
The temporary workaround in `fashion/[[...categoryPath]]/page.tsx` redirects:
```ts
if (pathArray[0] === 'product' && pathArray.length >= 2) {
  redirect(`/shop/fashion/product/${pathArray[1]}`);
}
```
### Cleanest Target Architecture
Separate the catch-all category route from the base landing and product routes:
* `/shop/fashion` → Base category landing / hub (`app/(customer)/shop/fashion/page.tsx`)
* `/shop/fashion/c/[...categoryPath]` → Category PLP (`app/(customer)/shop/fashion/c/[...categoryPath]/page.tsx`)
* `/shop/fashion/product/[id]` or `/shop/fashion/p/[slug]` → Fashion PDP (`app/(customer)/shop/fashion/product/[id]/page.tsx`)

---

## 13. UI/UX Findings (Ranked P0 – P3)

```text
┌──────┬────────────────────────────────────────────────────────────────────────┐
│ Rank │ Issue Description & Location                                           │
├──────┼────────────────────────────────────────────────────────────────────────┤
│  P0  │ Add to Cart is a fake simulated timer on PDP & Quick Add Sheet.        │
│  P0  │ Missing/broken cart & checkout persistence for variant items.          │
│  P0  │ PDP sort_order query bug causing crashes on variant media fetch.       │
│  P0  │ Unconditional redirect to /shop/fashion/women breaking if unseeded.    │
├──────┼────────────────────────────────────────────────────────────────────────┤
│  P1  │ Wishlist heart clicks do not persist to user account.                  │
│  P1  │ Duplicate, disconnected Mega Menu navigation component in codebase.    │
│  P1  │ Filter drawer lacks Fit, Fabric, and Discount filters present in DB.   │
│  P1  │ Route collision causing redirects between catch-all and PDP.           │
├──────┼────────────────────────────────────────────────────────────────────────┤
│  P2  │ FilterDrawer Apply button displays stale count before filter applied.  │
│  P2  │ Secondary hover images load eagerly for all product cards on PLP.      │
│  P2  │ Color swatches on product cards have small (16px) touch targets.       │
│  P2  │ Size Guide link on PDP is non-functional with no modal.                │
├──────┼────────────────────────────────────────────────────────────────────────┤
│  P3  │ Category Hero banner uses unoptimized CSS background-image.            │
│  P3  │ Low dark-mode border contrast on product cards (border-white/[0.04]).  │
│  P3  │ Subcategory pill row lacks horizontal scroll fade cues on mobile.      │
└──────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Accessibility Findings

1. **Non-Semantic Color Swatches (`fashion-product-client.tsx`)**
   Color buttons use inline `style={{ backgroundColor: color.toLowerCase() }}` without `aria-pressed`, `role="radio"`, or fallback high-contrast borders for light colors (e.g. White on White).
2. **Missing Focus Trap & Esc Listener in Dialogs (`quick-add-sheet.tsx` & `filter-drawer.tsx`)**
   Modals specify `role="dialog"` but fail to trap keyboard focus, allowing users to Tab behind the overlay.
3. **Small Touch Targets on PLP Cards (`product-card.tsx`)**
   Color swatches on product cards are `w-4 h-4` (16x16px), failing WCAG 2.2 Level AA target size minimums (24x24px / 44x44px).
4. **Body Scroll Lock Missing on Mobile**
   Opening the `QuickAddSheet` or `FilterDrawer` does not lock `document.body.style.overflow = 'hidden'`, causing background scrolling on touch devices.

---

## 15. Performance Findings

1. **In-Memory Live Facet Aggregation (`lib/fashion/facets.ts`)**
   Fetches 1,000 product + variant rows over the wire on every PLP navigation to aggregate counts in JavaScript.
2. **Duplicate Parallel Data Fetching on PLP**
   `fashion/[[...categoryPath]]/page.tsx` executes `getProductsForCategory` and `getFacetsForCategory` concurrently, running two heavy relational queries against Postgres for the exact same category.
3. **Secondary Image Preloading in PLP Cards (`product-card.tsx`)**
   Product cards render secondary hover images in the initial DOM with `opacity-0`, downloading twice as many images on initial load.

---

## 16. Security Findings

1. **Service Role on Customer PDP (`fashion/product/[id]/page.tsx`)**
   `createAdminClient()` (service_role) is used to load public product details. Should use `createStaticSupabaseClient()`.
2. **Destructive Variant Replacement in RPC (`20260827000001_fashion_admin_rpcs.sql`)**
   `upsert_fashion_product_data` does `DELETE FROM public.fashion_variants WHERE product_id = p_product_id`. Once orders reference `variant_id`, this hard delete will cause database integrity violations or orphan order records.

---

## 17. Target Architecture

```text
                             INTRUST INDIA ECOSYSTEM
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                                                         │
   CORE STOREFRONT                                           FASHION STOREFRONT
   ───────────────                                           ──────────────────
   • Standard Catalog UI                                     • Fashion Taxonomy (L1-L4)
   • Single-item / Merchant products                         • Color/Size Variant Matrix
   • Platform Direct / Merchant items                        • Variant Media Galleries
           │                                                 • Faceted Filter Engine
           └────────────────────────────┬────────────────────────────┘
                                        │
                         SHARED COMMERCE INTEGRATION LAYER
                         ─────────────────────────────────
                         Contract: (product_id, variant_id?, inventory_id?, qty)
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
      SHARED CART                SHARED WISHLIST              SHARED CHECKOUT
    public.shopping_cart        public.user_wishlists        customer_checkout_v4
  (supports variant_id)        (supports variant_id)        draft_cart_orders
           │                            │                            │
           └────────────────────────────┴────────────────────────────┘
                                        │
                             SHARED ORDER MANAGEMENT
                             ───────────────────────
                           public.shopping_order_groups
                           public.shopping_order_items
                           (records variant_id & metadata)
```

---

## 18. Remediation Roadmap

```text
Phase 1: DB Schema & RPC Hardening (Shared Commerce Contract)
  ├── 1.1 Add nullable variant_id to shopping_cart, shopping_order_items, user_wishlists
  ├── 1.2 Update add_to_shopping_cart RPC with optional p_variant_id
  ├── 1.3 Update customer_checkout_v4 & draft_cart_orders to handle variant pricing & inventory
  └── 1.4 Refactor upsert_fashion_product_data to upsert variants instead of hard delete

Phase 2: Fashion PDP & Cart Integration
  ├── 2.1 Fix sort_order -> display_order in fashion/product/[id]/page.tsx
  ├── 2.2 Switch PDP data fetch from createAdminClient to createStaticSupabaseClient
  ├── 2.3 Wire fashion-product-client.tsx handleAddToCart to real add_to_shopping_cart RPC
  └── 2.4 Wire PDP & Card wishlist toggle to public.user_wishlists

Phase 3: Routing & Navigation Rationalization
  ├── 3.1 Restructure fashion routes to avoid catch-all collisions (/shop/fashion/c/[...path])
  ├── 3.2 Remove orphaned components/navigation/fashion-mega-menu.tsx
  └── 3.3 Ensure global Navbar.jsx category links navigate cleanly into fashion categories

Phase 4: PLP & Quick Add Integration
  ├── 4.1 Connect quick-add-sheet.tsx to add_to_shopping_cart RPC
  ├── 4.2 Expand filter-drawer.tsx with Fit, Fabric, and Price range inputs
  └── 4.3 Replace in-memory facets in lib/fashion/facets.ts with Postgres aggregation query

Phase 5: Cart & Checkout Verification
  ├── 5.1 Update /api/cart/validate to check fashion_variants.inventory_quantity when variant_id present
  └── 5.2 Update CartClient.jsx to display variant attributes (size/color) on cart line items

Phase 6: Accessibility, Performance & UI Polish
  ├── 6.1 Add ARIA roles and keyboard focus management to FilterDrawer and QuickAddSheet
  ├── 6.2 Increase touch target sizes on color swatches (min 24x24px)
  └── 6.3 Lazy-load secondary card images on hover
```

---

## 19. Files Likely to Change

### Must Change
* `app/(customer)/shop/fashion/product/[id]/page.tsx` — Fix column name, remove admin client.
* `components/product/fashion-product-client.tsx` — Connect add-to-cart and wishlist to Supabase RPC/tables.
* `components/product/quick-add-sheet.tsx` — Connect quick add to real cart RPC.
* `components/product/product-card.tsx` — Connect wishlist to `user_wishlists`.
* `app/api/cart/validate/route.js` — Validate variant inventory.
* `app/(customer)/shop/cart/CartClient.jsx` — Display variant details and variant pricing.
* Migration SQL files for `shopping_cart`, `shopping_order_items`, `user_wishlists`, `add_to_shopping_cart`, and `customer_checkout_v4`.

### Probably Change
* `app/(customer)/shop/fashion/[[...categoryPath]]/page.tsx` — Clean up route structure and default category fallback.
* `lib/fashion/facets.ts` — Optimize aggregation logic.
* `components/filters/filter-drawer.tsx` — Add missing facets and accessibility attributes.

### Do Not Change Unless Necessary
* `components/layout/Navbar.jsx` — Stable global navigation.
* `app/(customer)/layout.jsx` — Stable customer layout and auth gating.
* `components/admin/shopping/FashionVariantsEditor.jsx` — Stable admin editor.

---

## 20. Verification Plan

```text
1. Static Analysis & Build Checks:
   npm run lint
   npm run build

2. Database Schema & RPC Regression Tests:
   • Execute schema validation for variant_id columns on shopping_cart, shopping_order_items, user_wishlists.
   • Test add_to_shopping_cart RPC with both standard products and fashion variants.
   • Test customer_checkout_v4 and draft_cart_orders with variant items.
   • Verify atomic inventory decrement in fashion_variants.inventory_quantity.

3. End-to-End Shopping Flow Tests:
   • PLP Navigation: /shop/fashion -> Select Category -> Apply Size/Color/Price Filters.
   • PLP Quick Add: Quick Add button -> Select Size -> Real Cart Confirmation -> Verified in DB.
   • PDP Flow: /shop/fashion/product/[id] -> Select Color -> Select Size -> Add to Cart -> Verified in DB.
   • Wishlist Flow: Toggle Heart on PDP/PLP -> Verify row in user_wishlists -> Visit /wishlist -> Move to Cart.
   • Cart & Checkout Flow: Mixed Cart (Fashion Variant + Standard Product) -> /shop/cart -> Validate Stock -> Pay via Wallet -> Check Order Items (Size/Color/SKU preserved) -> Check Order Confirmation.

4. Accessibility & Mobile Usability:
   • Verify keyboard Tab navigation and focus traps in FilterDrawer and QuickAddSheet.
   • Test Escape key closing on all modals.
   • Test on mobile viewport (375px - 430px) for touch targets and sticky CTA layout.
```
