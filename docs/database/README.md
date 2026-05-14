# Supabase Database Documentation

This documentation provides a comprehensive overview of the Supabase database schema for project `bhgbylyzlwmmabegxlfc`. 

## Database Domains

Categorized into 13 logical groups for easier navigation and understanding:

### 1. [Auth & Admin Permissions](./modules/01_auth_admin.md)
User permissions, authentication tokens, and administrative audit trails.

### 2. [Merchant Core](./modules/02_merchant_core.md)
Merchant profiles, business configurations, and operational settings.

### 3. [KYC & Identity](./modules/03_kyc_identity.md)
Records of KYC verification, identity checks, and automated verification logs.

### 4. [Shopping Core](./modules/04_shopping_core.md)
Customer carts, order groups, product listings, and category management.

### 5. [Product & Inventory](./modules/05_product_inventory.md)
Inventory tracking, wholesale pricing, and platform coupon management.

### 6. [Wallet & Balance](./modules/06_wallet_balance.md)
Balance tracking for both customers and merchants, including locked funds.

### 7. [Finance & Ledger](./modules/07_finance_ledger.md)
Immutable financial transactions, double-entry ledger, and audit logs for monetary actions.

### 8. [Payouts](./modules/08_payouts.md)
Merchant payout requests and bank detail configurations.

### 9. [Order Management](./modules/09_order_management.md)
Specialized order flows (e.g., NFC orders) and revenue summaries.

### 10. [Delivery & Logistics](./modules/10_delivery_logistics.md)
Logistics tracking and delivery status management.

### 11. [Support & Notifications](./modules/11_support_notifications.md)
In-app notifications, banners, and support-related status tracking.

### 12. [System & Audit](./modules/12_system_audit.md)
Global settings, OTP verification, ratings, and shared user profile metadata.

### 13. [Storage](./modules/13_storage.md)
Metadata and bucket configurations for Supabase Storage.

---

## Global References

- [Enum Reference Sheet](./enums.md) - All custom database types.
- [Security & RLS Summary](./security.md) - Authentication and authorization rules.
- [Functions & RPCs Reference](./functions_rpcs.md) - Triggers, logic, and automation.
