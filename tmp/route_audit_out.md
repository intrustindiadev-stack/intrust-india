# Route and Page Audit

This document maps out all existing routes and pages organized by panel.

## Admin Panel

### `app/(admin)/admin/analytics/page.js`
- **Purpose**: Renders 'AnalyticsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: transactions, user_profiles, merchants, shopping_order_groups, shopping_products, shopping_order_items

### `app/(admin)/admin/auto-mode/page.jsx`
- **Purpose**: Renders 'AutoModeAdminDashboard' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/auto-mode/[merchantId]/page.jsx`
- **Purpose**: Renders 'AutoMerchantDetailsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/banners/page.jsx`
- **Purpose**: Renders 'BannersPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, platform_banners

### `app/(admin)/admin/giftcards/new/page.jsx`
- **Purpose**: Renders 'NewGiftCardPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/giftcards/page.jsx`
- **Purpose**: Renders 'GiftCardsListPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/giftcards/[id]/page.jsx`
- **Purpose**: Renders 'EditGiftCardPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/invoice/page.jsx`
- **Purpose**: Renders 'ManualInvoiceGeneratorPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/lockin/page.jsx`
- **Purpose**: Renders 'AdminLockinPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/lockin/[id]/page.jsx`
- **Purpose**: Renders 'LockinDetailsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchant_lockin_balances

### `app/(admin)/admin/merchants/page.jsx`
- **Purpose**: Renders 'AdminMerchantsPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/merchants/udhari/page.jsx`
- **Purpose**: Renders 'AdminUdhariOverviewPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/merchants/[id]/page.jsx`
- **Purpose**: Renders 'AdminMerchantDetailPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: admin_permissions, user_profiles, merchants, payout_requests, merchant_transactions

### `app/(admin)/admin/merchants/[id]/udhari/page.jsx`
- **Purpose**: Renders 'AdminMerchantUdhariDetailPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/merchants/[id]/udhari-settings/page.jsx`
- **Purpose**: Renders 'AdminUdhariSettingsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/nfc/page.jsx`
- **Purpose**: Renders 'NFCAdminPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: nfc_orders, nfc_settings

### `app/(admin)/admin/page.jsx`
- **Purpose**: Renders 'AdminDashboard' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, transactions, shopping_order_groups, coupons, merchants

### `app/(admin)/admin/payouts/page.jsx`
- **Purpose**: Renders 'AdminPayoutsPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/settings/page.js`
- **Purpose**: Renders 'SettingsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/shopping/approvals/page.jsx`
- **Purpose**: Renders 'AdminProductApprovalsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_products

### `app/(admin)/admin/shopping/categories/edit/[id]/page.jsx`
- **Purpose**: Renders 'EditCategoryPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_categories

### `app/(admin)/admin/shopping/categories/new/page.jsx`
- **Purpose**: Renders 'NewCategoryPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/shopping/categories/page.jsx`
- **Purpose**: Renders 'AdminCategoriesPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_categories

### `app/(admin)/admin/shopping/edit/[id]/page.jsx`
- **Purpose**: Renders 'EditProductPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_products

### `app/(admin)/admin/shopping/new/page.jsx`
- **Purpose**: Renders 'NewProductPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/shopping/orders/page.jsx`
- **Purpose**: Renders 'AdminOrdersPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/shopping/orders/takeover/page.jsx`
- **Purpose**: Renders 'TakeoverOrdersPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: admin_get_takeover_orders (RPC)

### `app/(admin)/admin/shopping/orders/[orderId]/invoice/page.jsx`
- **Purpose**: Renders 'AdminInvoicePage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_order_groups

### `app/(admin)/admin/shopping/orders/[orderId]/page.jsx`
- **Purpose**: Renders 'AdminOrderDetailPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: platform_settings

### `app/(admin)/admin/shopping/page.jsx`
- **Purpose**: Renders 'AdminShoppingPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_products, shopping_order_groups

### `app/(admin)/admin/store-status/page.jsx`
- **Purpose**: Renders 'AdminStoreStatusPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: merchants

### `app/(admin)/admin/tasks/page.jsx`
- **Purpose**: Renders 'TasksPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/(admin)/admin/transactions/page.js`
- **Purpose**: Renders 'TransactionsPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: transactions, orders, customer_wallet_transactions, merchant_transactions, wallet_adjustment_logs, user_profiles, merchants

### `app/(admin)/admin/users/page.jsx`
- **Purpose**: Renders 'AdminUsersPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/(admin)/admin/users/[id]/page.jsx`
- **Purpose**: Renders 'AdminUserDetailPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: admin_permissions, user_profiles, merchants, kyc_records, orders, customer_wallets

### `app/(admin)/admin/vendors/page.js`
- **Purpose**: Renders 'VendorsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(admin)/admin/wallet-adjustments/page.jsx`
- **Purpose**: Renders 'WalletAdjustmentsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, wallet_adjustment_logs

### `app/api/admin/admins/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/api/admin/analytics/summary/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, transactions, merchants, shopping_order_groups, shopping_order_items, shopping_products

### `app/api/admin/approve-merchant/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, notifications, audit_logs

### `app/api/admin/auto-mode/orders/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_order_groups

### `app/api/admin/coupons/route.js`
- **Purpose**: API Route (POST, PUT)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, coupons

### `app/api/admin/lockin/route.js`
- **Purpose**: API Route (POST, GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchant_lockin_balances, merchants, notifications, user_profiles

### `app/api/admin/merchants/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, user_profiles, merchant_transactions

### `app/api/admin/merchants/udhari/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, merchant_udhari_settings, udhari_requests

### `app/api/admin/merchants/[id]/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, user_profiles

### `app/api/admin/merchants/[id]/toggle-suspend/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, audit_logs

### `app/api/admin/merchants/[id]/udhari/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: udhari_requests, user_profiles, coupons, merchant_transactions

### `app/api/admin/merchants/[id]/udhari-settings/route.js`
- **Purpose**: API Route (GET, PATCH)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchant_udhari_settings, audit_logs

### `app/api/admin/notifications/route.js`
- **Purpose**: API Route (GET, PATCH)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, notifications

### `app/api/admin/orders/takeover/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/admin/payout-requests/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: payout_requests

### `app/api/admin/payout-requests/[id]/route.js`
- **Purpose**: API Route (PATCH)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: payout_requests, merchant_lockin_balances, merchants, wallet_transactions, notifications

### `app/api/admin/reject-merchant/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, audit_logs

### `app/api/admin/revenue/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, admin_revenue_summary

### `app/api/admin/shopping/approve-product/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, shopping_products, merchant_inventory, notifications, audit_logs

### `app/api/admin/shopping/products/route.js`
- **Purpose**: API Route (POST, PATCH, DELETE)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_products

### `app/api/admin/tasks/route.js`
- **Purpose**: API Route (GET, POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: admin_tasks, user_profiles, notifications

### `app/api/admin/tasks/[id]/route.js`
- **Purpose**: API Route (GET, PATCH, DELETE)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: admin_tasks

### `app/api/admin/update-giftcard/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, coupons

### `app/api/admin/users/[id]/suspend/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/api/admin/verify-bank/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, notifications

### `app/api/admin/wallet-adjust/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, notifications

### `app/test-admin/page.jsx`
- **Purpose**: Renders 'TestAdminPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

## Merchant Panel

### `app/(merchant)/merchant/analytics/page.jsx`
- **Purpose**: Renders 'AnalyticsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, coupons, merchant_transactions, shopping_orders, shopping_order_items, merchant_inventory

### `app/(merchant)/merchant/coupons/add/page.jsx`
- **Purpose**: Renders 'AddCouponPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(merchant)/merchant/dashboard/page.jsx`
- **Purpose**: Renders 'MerchantDashboardPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, coupons, udhari_requests, merchant_lockin_balances, shopping_order_items, shopping_order_groups

### `app/(merchant)/merchant/inventory/page.jsx`
- **Purpose**: Renders 'InventoryPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, coupons, merchant_transactions

### `app/(merchant)/merchant/lockin/page.jsx`
- **Purpose**: Renders 'MerchantLockinPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, merchant_lockin_balances

### `app/(merchant)/merchant/lockin/[id]/page.jsx`
- **Purpose**: Renders 'MerchantLockinDetailPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchant_lockin_balances

### `app/(merchant)/merchant/nfc-orders/page.jsx`
- **Purpose**: Renders 'MerchantNFCOrdersPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(merchant)/merchant/nfc-service/page.jsx`
- **Purpose**: Renders 'MerchantNFCServicePage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: user_profiles, nfc_settings

### `app/(merchant)/merchant/page.jsx`
- **Purpose**: Renders 'MerchantIndexPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(merchant)/merchant/profile/page.jsx`
- **Purpose**: Renders 'ProfilePage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: avatars, merchant_banners, merchants, user_profiles

### `app/(merchant)/merchant/purchase/page.jsx`
- **Purpose**: Renders 'PurchasePage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, coupons

### `app/(merchant)/merchant/ratings/page.jsx`
- **Purpose**: Renders 'MerchantRatingsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, merchant_rating_stats, merchant_ratings

### `app/(merchant)/merchant/settings/page.jsx`
- **Purpose**: Renders 'MerchantSettingsPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, kyc_records

### `app/(merchant)/merchant/settings/udhari/page.jsx`
- **Purpose**: Renders 'MerchantUdhariSettingsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(merchant)/merchant/shopping/auto-mode/page.jsx`
- **Purpose**: Renders 'AutoModePage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, shopping_order_groups

### `app/(merchant)/merchant/shopping/inventory/edit/[id]/page.jsx`
- **Purpose**: Renders 'MerchantEditProductPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, shopping_products

### `app/(merchant)/merchant/shopping/inventory/new/page.jsx`
- **Purpose**: Renders 'NewMerchantProductPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants

### `app/(merchant)/merchant/shopping/inventory/page.jsx`
- **Purpose**: Renders 'MerchantShopPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, merchant_inventory

### `app/(merchant)/merchant/shopping/orders/page.jsx`
- **Purpose**: Renders 'MerchantOrdersPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants

### `app/(merchant)/merchant/shopping/orders/[orderId]/page.jsx`
- **Purpose**: Renders 'MerchantOrderDetailPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants

### `app/(merchant)/merchant/shopping/wholesale/history/page.jsx`
- **Purpose**: Renders 'WholesaleHistoryPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, shopping_orders

### `app/(merchant)/merchant/shopping/wholesale/page.jsx`
- **Purpose**: Renders 'WholesaleHubPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, shopping_products, shopping_categories

### `app/(merchant)/merchant/suspended/page.jsx`
- **Purpose**: Renders 'MerchantSuspendedPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants

### `app/(merchant)/merchant/udhari/page.jsx`
- **Purpose**: Renders 'MerchantUdhariPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(merchant)/merchant/wallet/page.jsx`
- **Purpose**: Renders 'WalletPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants

### `app/(merchant)/merchant/wallet/transactions/[id]/page.jsx`
- **Purpose**: Renders 'TransactionDetailPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: payout_requests, merchant_transactions, shopping_products, shopping_order_groups, shopping_order_items, wallet_transactions

### `app/(merchant)/merchant/wallet/withdrawals/page.jsx`
- **Purpose**: Renders 'WithdrawalsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(merchant)/merchant-status/pending/page.jsx`
- **Purpose**: Renders 'MerchantPendingPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(merchant)/merchant-status/rejected/page.jsx`
- **Purpose**: Renders 'MerchantRejectedPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants

### `app/(merchant)/merchant-status/suspended/page.jsx`
- **Purpose**: Renders 'MerchantSuspendedPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/merchant/apply/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, user_profiles, notifications

### `app/api/merchant/auto-mode/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants

### `app/api/merchant/notifications/route.js`
- **Purpose**: API Route (GET, PATCH)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: notifications

### `app/api/merchant/payout-request/route.js`
- **Purpose**: API Route (GET, POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: payout_requests, merchants, merchant_lockin_balances, wallet_transactions, user_profiles, notifications

### `app/api/merchant/purchase/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/merchant/shopping/submit-product/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, user_profiles, shopping_products, merchant_inventory, notifications

### `app/api/merchant/shopping/wholesale/draft/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, shopping_products, wholesale_order_drafts

### `app/api/merchant/udhari-settings/route.js`
- **Purpose**: API Route (GET, PATCH)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, merchant_udhari_settings

## Customer Facing

### `app/(auth)/forgot-password/page.jsx`
- **Purpose**: Renders 'ForgotPasswordPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(auth)/link-complete/page.jsx`
- **Purpose**: Renders 'LinkCompletePage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(auth)/login/page.jsx`
- **Purpose**: Renders 'LoginPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/(auth)/reset-password/page.jsx`
- **Purpose**: Renders 'ResetPasswordPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(auth)/signup/page.jsx`
- **Purpose**: Renders 'SignupPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(auth)/verified/page.jsx`
- **Purpose**: Renders 'VerifiedPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(customer)/customer/nfc-orders/page.jsx`
- **Purpose**: Renders 'NFCOrdersPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(customer)/dashboard/page.jsx`
- **Purpose**: Renders 'CustomerDashboardPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, kyc_records, customer_wallets, orders, customer_wallet_transactions, merchants

### `app/(customer)/gift-cards/page.jsx`
- **Purpose**: Renders 'GiftCardsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: coupons

### `app/(customer)/gift-cards/[id]/page.jsx`
- **Purpose**: Renders 'GiftCardDetailPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: coupons, user_profiles, merchant_udhari_settings

### `app/(customer)/merchant-apply/page.jsx`
- **Purpose**: Renders 'MerchantApplyPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: merchants

### `app/(customer)/merchant-apply/success/page.jsx`
- **Purpose**: Renders 'ApplicationSuccessPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(customer)/my-giftcards/page.jsx`
- **Purpose**: Renders 'MyCouponsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, orders, udhari_requests

### `app/(customer)/nfc-service/page.jsx`
- **Purpose**: Renders 'NFCServicePage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(customer)/orders/page.jsx`
- **Purpose**: Renders 'CustomerOrdersPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(customer)/orders/[orderId]/invoice/page.jsx`
- **Purpose**: Renders 'InvoicePage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_order_groups

### `app/(customer)/orders/[orderId]/page.jsx`
- **Purpose**: Renders 'OrderDetailsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_order_groups, user_profiles

### `app/(customer)/profile/kyc/page.jsx`
- **Purpose**: Renders 'ProfileKYCPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(customer)/profile/page.jsx`
- **Purpose**: Renders 'CustomerProfilePage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, customer_wallets, udhari_requests, coupons, shopping_orders

### `app/(customer)/refer/page.jsx`
- **Purpose**: Renders 'ReferAndEarnPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, customer_wallet_transactions

### `app/(customer)/services/page.jsx`
- **Purpose**: Renders 'ServicesPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/(customer)/shop/cart/page.jsx`
- **Purpose**: Renders 'CartPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: platform_settings

### `app/(customer)/shop/page.jsx`
- **Purpose**: Renders 'MerchantHubPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, user_profiles, merchant_rating_stats, user_wishlists, shopping_cart, platform_settings

### `app/(customer)/shop/product/[productSlug]/page.jsx`
- **Purpose**: Renders 'ProductDetailPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_products, merchant_inventory, user_profiles, platform_settings

### `app/(customer)/shop/[merchantSlug]/page.jsx`
- **Purpose**: Renders 'MerchantStorefrontPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_products, user_profiles, platform_settings, merchants, merchant_rating_stats, merchant_inventory

### `app/(customer)/store-credits/page.jsx`
- **Purpose**: Renders 'StoreCreditsPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: udhari_requests

### `app/(customer)/transactions/page.jsx`
- **Purpose**: Renders 'TransactionsPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: coupons, customer_wallet_transactions

### `app/(customer)/wallet/page.jsx`
- **Purpose**: Renders 'CustomerWalletPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: customer_wallets, customer_wallet_transactions, transactions

### `app/(customer)/wishlist/page.jsx`
- **Purpose**: Renders 'WishlistPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_wishlists

## Shared API Routes

### `app/api/auth/email/invalidate-sessions/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: audit_logs

### `app/api/auth/email/link-after-google/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, audit_logs

### `app/api/auth/email/link-provider/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/api/auth/email/resend-verification/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: auth_tokens

### `app/api/auth/email/signin/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, audit_logs

### `app/api/auth/email/signup/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, audit_logs

### `app/api/auth/google/callback/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, audit_logs, customer_wallets

### `app/api/auth/google/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/auth/logout/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/auth/send-otp/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: otp_codes

### `app/api/auth/verify-otp/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: otp_codes, user_profiles

### `app/api/auth/verify-phone/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: otp_codes, user_profiles

### `app/api/coupons/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: coupons

### `app/api/create-order/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/cron/order-timeout/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: admin_takeover_stale_orders (RPC)

### `app/api/gift-cards/buy-wallet/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, coupons, customer_wallets, orders, customer_wallet_transactions, notifications, merchants

### `app/api/kyc/submit/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: kyc_records

### `app/api/my-coupons/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: coupons, transactions

### `app/api/my-coupons/[id]/decrypt/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: udhari_requests, coupons

### `app/api/nfc/order/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, customer_wallets, nfc_orders, customer_wallet_transactions, merchant_transactions

### `app/api/nfc/orders/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: nfc_orders

### `app/api/notifications/route.js`
- **Purpose**: API Route (GET, PATCH)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: notifications

### `app/api/payment/wallet-pay/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/api/purchase/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/sabpaisa/callback/route.js`
- **Purpose**: API Route (GET, POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchant_transactions, merchants, udhari_requests, notifications, user_profiles, shopping_order_groups, nfc_orders, coupons, orders, audit_logs

### `app/api/sabpaisa/create-transaction/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: transactions

### `app/api/sabpaisa/initiate/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_order_groups, merchants, coupons, user_profiles, nfc_orders, transactions

### `app/api/shopping/notify-order/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: shopping_order_groups, notifications, user_profiles, shopping_order_items, merchants

### `app/api/shopping/request-store-credit/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/shopping/settle-store-credit/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: udhari_requests, merchants, notifications

### `app/api/test-sprint/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/test-wallet/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchant_transactions

### `app/api/udhari/list/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: udhari_requests, merchants, orders

### `app/api/udhari/pay/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: udhari_requests, merchant_udhari_settings, customer_wallets, merchants, notifications

### `app/api/udhari/pay-sabpaisa/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: udhari_requests, merchant_udhari_settings, transactions

### `app/api/udhari/reminders/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: udhari_requests, udhari_reminders, notifications

### `app/api/udhari/request/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, coupons, merchant_udhari_settings, udhari_requests, notifications

### `app/api/udhari/respond/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, udhari_requests, coupons, shopping_order_groups, shopping_order_items, merchant_inventory, notifications

### `app/api/user/onboarding/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/api/verify-payment/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/api/wallet/balance/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles, merchants, customer_wallets, customer_wallet_transactions, wallet_transactions, merchant_transactions, payout_requests

## Other / Uncategorized

### `app/(merchant-subscribe)/merchant-subscribe/page.jsx`
- **Purpose**: Renders 'MerchantSubscribePage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: merchants, user_profiles

### `app/(vendor)/vendor/dashboard/page.jsx`
- **Purpose**: Renders 'VendorDashboardPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/about/page.js`
- **Purpose**: Renders 'AboutPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/auth/callback/route.js`
- **Purpose**: API Route (GET)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/auth/logout/route.js`
- **Purpose**: API Route (POST)
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/coming-soon/page.jsx`
- **Purpose**: Renders 'ComingSoonPage' component
- **Status**: Has placeholder content
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/contact/page.js`
- **Purpose**: Renders 'ContactPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/debug-auth/page.jsx`
- **Purpose**: Renders 'DebugAuthPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `app/legal/page.jsx`
- **Purpose**: Renders 'LegalCenterPage' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

### `app/page.js`
- **Purpose**: Renders 'Home' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: user_profiles

### `pages/_app.jsx`
- **Purpose**: Renders 'MyApp' component
- **Status**: Appears complete
- **DB Tables/RPCs Read/Written**: None detected directly

