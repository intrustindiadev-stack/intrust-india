# Intrust Platform - Customer Panel Complete Workflow

This document outlines the complete workflow of the Customer Panel on the Intrust platform, mapping the Business Requirements Document (BRD) to the actual implementation (Next.js 14 App Router + Supabase).

---

## 1. Authentication & Onboarding (`app/(auth)`)

The entry point for all customers ensures secure, multi-channel access and account deduplication.

*   **Sign Up & Login:** 
    *   Traditional Email + Password authentication.
    *   OTP-based login via SMS.
    *   **OAuth Integration:** Google Sign-in and WhatsApp OTP login for frictionless access.
*   **Account Linking (`/link-complete`):** A robust security feature that detects duplicate accounts (e.g., if a user logs in via phone and later via email) and seamlessly merges them.
*   **Account Recovery:** Standard Forgot and Reset Password workflows.

---

## 2. Protected Dashboard & Account Management (`app/(customer)/(protected)`)

Once authenticated, customers land on their secure dashboard which acts as the hub for all account activities.

*   **Dashboard Overview (`/dashboard`):** A centralized view of wallet balance, recent orders, and quick links to services.
*   **Profile Management (`/profile`):** Update personal details, manage saved addresses for e-commerce, and handle basic account settings.
*   **Digital Wallet (`/wallet` & `/transactions`):** 
    *   *Implemented beyond original BRD scope.*
    *   Customers can view their wallet balance, top up via SabPaisa payment gateway, and view a detailed, audit-logged transaction history.
*   **Rewards & Gamification (`/rewards`):**
    *   **Points System:** Earn points via purchases and convert them to wallet cash.
    *   **Daily Login:** Claim daily rewards to encourage retention.
    *   **Referral Network (`/refer` & `/rewards/tree`):** Generate referral links and view the multi-tier referral tree.
    *   **Leaderboard (`/rewards/leaderboard`):** Gamified ranking of top platform users based on activity and referrals.

---

## 3. eCommerce & Shopping Hub (`app/(customer)/shop`)

The core commerce engine where customers interact with merchants.

*   **Global Shop Hub (`/shop`):** Browse trending products, flash sales, and search across the entire platform's inventory.
*   **Merchant Storefronts (`/shop/[merchantSlug]`):** Visit dedicated vendor pages to browse specific merchant catalogs.
*   **Shopping Workflow:**
    *   **Cart (`/shop/cart`):** Manage items ready for purchase.
    *   **Checkout (`/shop/checkout`):** Secure checkout using Wallet balance or external payment gateway (SabPaisa). Supports coupon application.
    *   **Wishlist (`/wishlist`):** Save favorite products for later purchase.
*   **Order Management (`/orders`):** View past and active orders, track status, and view generated invoices.
*   **NFC Orders (`/nfc-service` & `/customer/nfc-orders`):** Specialized flow for placing and tracking in-person tap-to-pay/NFC orders at physical merchant locations.

---

## 4. Value-Added Financial & Ecosystem Services

These services expand the Intrust ecosystem beyond standard e-commerce, offering unique financial flexibilities.

*   **Gift Cards (`/gift-cards` & `/my-giftcards`):** 
    *   Purchase digital gift cards for various brands.
    *   View, reveal, and redeem purchased or received gift cards.
*   **Store Credits (`/store-credits`):** Customers can request store credit directly from trusted merchants, allowing them to purchase goods and settle the balance later.
*   **Udhari (Credit/Debt) System:** Peer-to-peer and Merchant-to-Customer credit requests and payment reminders.
*   **Merchant Onboarding (`/merchant-apply`):** A seamless application flow for existing customers who wish to upgrade their account to become a selling Vendor/Merchant on the platform.
*   **Careers Portal (`/career`):** Customers can view internal job postings (managed by the HRM module) and apply directly, integrating with the KYC upload system.
*   **Solar Solutions (`/solar`):** Explore and apply for solar panel installations and related services provided by Intrust.

---

## 5. Customer Support & AI

*   **AI Chatbot Widget:** A web-based text assistant available globally across the customer panel. It answers FAQs, assists with platform navigation, and handles basic service queries in real-time.
*   **Trust & Safety:** Integrated trust badges on high-value items (like Gift Cards) and secure database-level atomic rate limiters ensure platform integrity.

---

## Summary of Workflow Journey

1. **Acquisition:** User arrives via organic search, referral link, or WhatsApp invite.
2. **Onboarding:** Logs in using Google, WhatsApp, or standard OTP.
3. **Engagement:** Checks in daily for rewards, views the leaderboard.
4. **Discovery:** Browses the Shop Hub, adds items to Wishlist or Cart.
5. **Transacting:** Tops up Digital Wallet via SabPaisa, uses Wallet + Store Credits to checkout.
6. **Fulfillment:** Tracks order from the Orders dashboard.
7. **Expansion:** Buys a Gift Card for a friend, applies for a job via the Career portal, or applies to become a Merchant.
8. **Support:** Uses the AI Chatbot for any queries during the journey.
