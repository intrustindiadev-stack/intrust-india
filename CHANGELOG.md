# Changelog - InTrust India

Summary of recent updates to the platform.

---

## [2026-04-06] - Merchant Ratings & UI Enhancements
**Commit ID:** `e5aa103`

### Features
- **Merchant Rating System**: Implemented a comprehensive rating and feedback system for customers.
- **Database Schema Updates**: 
    - Created `database_scripts/20260406_merchant_ratings_feature.sql`.
    - Added tables for `merchant_ratings` and `order_feedback`.
    - Implemented database triggers to automatically manage `delivered_at` timestamps for orders.
    - Simplified aggregation views for merchant quality metrics.

### UI/UX Improvements
- **Order Details (Customer)**: Integrated the rating interface directly into the order detail view for delivered items.
- **Order Details (Admin)**: Enhanced the admin view to display rating information and delivery status more clearly.

---

## [2026-04-06] - Financial Integrity & Platform Hardening
**Commit ID:** `c212eef`

### Features
- **Professional Invoice Generation**:
    - Replaced the navigation-based invoice viewer with a high-performance, in-memory PDF generation system.
    - Standardized design with a blue-and-white professional branding.
- **Auto-Mode Atomicity**:
    - Refactored the "Auto-Mode" subscription workflow into a single atomic Supabase RPC function.
    - Guarantees transaction integrity between payment, balance deduction, and status updates.

### Infrastructure & Security
- **Transaction Normalization**:
    - Standardized all currency handling to handle "Paise to Rupees" conversion correctly across multiple payment gateways.
- **Data Privacy**:
    - Masked customer phone numbers on merchant dashboards to ensure GDPR/DPD compliance.
- **Bug Fixes**:
    - Resolved PostgreSQL function overloading errors in the `update_order_delivery_v3` RPC.
    - Fixed wallet balance display inconsistencies across the admin and merchant platforms.

---
