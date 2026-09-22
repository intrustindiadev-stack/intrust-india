# InTrust India — Available Email & WhatsApp Templates Catalog

> **Client & Partner Reference Guide**  
> Comprehensive inventory of all active and available **Email** and **WhatsApp** communication templates across the InTrust India ecosystem.

---

## 📑 Table of Contents
1. [Communication Channels Overview](#communication-channels-overview)
2. [WhatsApp Templates (Meta & Omniflow)](#whatsapp-templates-meta--omniflow)
   - [Authentication & Account Security](#1-authentication--account-security-whatsapp)
   - [Customer Utility & Wallet Alerts](#2-customer-utility--wallet-alerts-whatsapp)
   - [Invoicing & Orders](#3-invoicing--orders-whatsapp)
   - [Merchant Operations & Payouts](#4-merchant-operations--payouts-whatsapp)
   - [Marketing & Daily Engagement (Opt-In)](#5-marketing--daily-engagement-opt-in-whatsapp)
   - [CRM Direct Lead Messaging](#6-crm-direct-lead-messaging-whatsapp)
3. [Email Templates (HTML Transactional)](#email-templates-html-transactional)
   - [User Authentication & Security](#1-user-authentication--security-email)
   - [Customer Orders & Store Credit (Udhari)](#2-customer-orders--store-credit-udhari-email)
   - [Invoicing & Finance Receipts](#3-invoicing--finance-receipts-email)
   - [Merchant Onboarding & KYC](#4-merchant-onboarding--kyc-email)
   - [Merchant Operations & Catalog](#5-merchant-operations--catalog-email)
   - [CRM & Lead Lifecycle](#6-crm--lead-lifecycle-email)
   - [HRM & Employee Portal](#7-hrm--employee-portal-email)
   - [Administrative & Platform Alerts](#8-administrative--platform-alerts-email)

---

## Communication Channels Overview

| Channel | Delivery Engine | Features | Sender / Origin |
|---|---|---|---|
| **WhatsApp** | Meta Cloud API via Omniflow | Instant delivery, interactive Quick Reply buttons, dynamic CTA URL buttons, OTP Copy-Code actions | Verified InTrust India WhatsApp Business Account (`WABA`) |
| **Email** | Transactional Mail Client (DKIM / SPF verified) | Responsive HTML branded cards, itemized tables, direct action buttons, PDF attachment support | Multi-sender addresses: `orders@`, `accounts@`, `notifications@`, `security@`, `hr@`, `info@intrustindia.com` |

---

## WhatsApp Templates (Meta & Omniflow)

All WhatsApp templates are pre-approved under Meta's Business Messaging guidelines.

### 1. Authentication & Account Security (WhatsApp)

| Template Identifier | Category | Trigger / Purpose | Dynamic Variables | Interactive Buttons |
|---|---|---|---|---|
| **`intrust_otp_verification`** | Authentication | Sent during phone authentication / login verification. Valid for 5 minutes. | `{{1}}` OTP Code | **[Copy Code]** button delivering one-tap OTP copy |
| **`intrust_login_alert`** | Utility | Sent when a new sign-in is detected from a new location/device. | `{{1}}` Device/Location<br>`{{2}}` Timestamp IST | Quick Replies: **[This Was Me]**, **[Secure My Account]** |

---

### 2. Customer Utility & Wallet Alerts (WhatsApp)

| Template Identifier | Category | Trigger / Purpose | Dynamic Variables | Interactive Buttons |
|---|---|---|---|---|
| **`intrust_welcome_linked`** | Utility | Sent immediately after customer links their WhatsApp account. | None | Quick Replies: **[Check Balance]**, **[My KYC Status]** |
| **`intrust_kyc_update`** | Utility | Sent when KYC status changes (Verified, Pending Review, Rejected). | `{{1}}` KYC Status<br>`{{2}}` Action Note / Next steps | None |
| **`intrust_kyc_reminder_v1`** | Utility | Automated reminder to submit or complete pending KYC verification. | `{{1}}` First Name<br>`{{2}}` Days Pending | None |
| **`intrust_transaction_alert`** | Utility | Real-time wallet credit or debit notification. | `{{1}}` Amount (₹)<br>`{{2}}` "credited to" / "debited from"<br>`{{3}}` Updated Balance (₹) | Quick Replies: **[Not Me]**, **[View Details]**<br>CTA: **[View Wallet]** |
| **`intrust_wallet_low_balance_v1`** | Utility | Sent when customer wallet balance falls below minimum threshold. | `{{1}}` Current Balance (₹) | None |
| **`intrust_order_status_v1`** | Utility | Sent when customer order status transitions (Packed, Shipped, Delivered). | `{{1}}` Order ID<br>`{{2}}` Status | None |
| **`intrust_udhari_due_reminder_v1`** | Utility | Reminder for upcoming or due Store Credit (Udhari) repayment. | `{{1}}` Merchant Name<br>`{{2}}` Amount Due (₹)<br>`{{3}}` Due Date<br>`{{4}}` Status | None |

---

### 3. Invoicing & Orders (WhatsApp)

| Template Identifier | Category | Trigger / Purpose | Dynamic Variables | Interactive Buttons |
|---|---|---|---|---|
| **`intrust_invoice_notification_v1`** | Utility | Delivers digital invoice with instant payment link. | `{{1}}` Customer Name<br>`{{2}}` Invoice Number<br>`{{3}}` Amount (₹) | **[View & Pay Invoice]** CTA URL with secure public token |
| **`intrust_ai_order_assigned`** | Utility | Alerts merchant that a new AI procurement order is allocated to them. | `{{1}}` Merchant Name<br>`{{2}}` Order Code<br>`{{3}}` Wholesale Amount (₹)<br>`{{4}}` Expected Profit (₹) | **[View AI Order]** CTA URL button |

---

### 4. Merchant Operations & Payouts (WhatsApp)

| Template Identifier | Category | Trigger / Purpose | Dynamic Variables | Interactive Buttons |
|---|---|---|---|---|
| **`intrust_merchant_welcome_linked`** | Utility | Sent when a merchant links their WhatsApp for business alerts. | None | Quick Replies: **[View Dashboard]**, **[My Balance]** |
| **`intrust_merchant_approved_v3`** | Utility | Notifies merchant that their onboarding application is approved. | `{{1}}` Business Name<br>`{{2}}` Next Action (Bank setup) | Quick Replies: **[Go to Dashboard]**, **[View Setup Steps]** |
| **`intrust_merchant_bank_verified`** | Utility | Confirms compliance verification of merchant bank account. | None | Quick Replies: **[View Bank Details]**, **[Profile Settings]** |
| **`intrust_merchant_new_order`** | Utility | Real-time alert when a customer purchases items from merchant store. | `{{1}}` Order ID<br>`{{2}}` Amount (₹)<br>`{{3}}` Item Count | Quick Replies: **[View Order Details]**, **[Manage Orders]** |
| **`intrust_merchant_order_cancelled`** | Utility | Alerts merchant that an order was cancelled (re-stock items). | `{{1}}` Order ID<br>`{{2}}` Reason | Quick Replies: **[View Order]**, **[Contact Support]** |
| **`intrust_merchant_procurement_sale`** | Utility | Alert when platform procurement purchase is completed. | `{{1}}` Procurement ID<br>`{{2}}` Amount Credited (₹)<br>`{{3}}` Items Summary | Quick Reply: **[View Details]** |
| **`intrust_merchant_payout_requested`** | Utility | Acknowledges merchant's withdrawal request from wallet. | `{{1}}` Amount (₹)<br>`{{2}}` Payout Source / Type | Quick Reply: **[View Payouts]** |
| **`intrust_merchant_payout_status_v2`** | Utility | Confirms successful payout settlement transfer to merchant bank. | `{{1}}` Amount (₹)<br>`{{2}}` Status<br>`{{3}}` Bank UTR / Reference | Quick Replies: **[Settlement History]**, **[My Bank Details]** |
| **`intrust_merchant_payout_failed_v1`** | Utility | Alerts merchant if bank payout transfer failed. | `{{1}}` Amount (₹)<br>`{{2}}` Failure Reason | None |
| **`intrust_merchant_store_credit_request`** | Utility | Customer requested Store Credit (Udhari) checkout for approval. | `{{1}}` Customer Name<br>`{{2}}` Amount (₹)<br>`{{3}}` Item / Order | Quick Replies: **[Review Request]**, **[View All Requests]** |
| **`intrust_merchant_store_credit_paid`** | Utility | Confirms customer repaid store credit and balance is credited. | `{{1}}` Amount (₹)<br>`{{2}}` Item / Invoice | Quick Replies: **[View Ledger]**, **[Recent Credits]** |
| **`intrust_merchant_gift_card_sold`** | Utility | Alerts merchant when digital gift card/voucher is purchased. | `{{1}}` Revenue (₹)<br>`{{2}}` Brand Name | Quick Replies: **[View Sales Report]**, **[My Wallet]** |
| **`intrust_merchant_subscription_status_v3`** | Utility | Updates merchant on plan subscription status (Active, Expired). | `{{1}}` Status<br>`{{2}}` Expiry Date | Quick Replies: **[View Subscription]**, **[Contact Support]** |
| **`intrust_merchant_subscription_expiring_v1`** | Utility | Early warning before merchant subscription lapses. | `{{1}}` Expiry Date | None |
| **`intrust_merchant_product_approved`** | Utility | Product catalog review decision (Approved / Changes Needed). | `{{1}}` Product Title<br>`{{2}}` Decision<br>`{{3}}` QA Feedback | Quick Replies: **[View Product]**, **[Edit Catalog]** |
| **`intrust_merchant_transaction_alert_v1`** | Utility | Wallet transaction credit/debit for merchant account. | `{{1}}` Amount (₹)<br>`{{2}}` Type<br>`{{3}}` New Balance<br>`{{4}}` Reference | None |
| **`intrust_merchant_investment_maturity_v1`** | Utility | Alerts merchant when locked investment/vault reaches maturity. | `{{1}}` Investment Type<br>`{{2}}` Amount (₹)<br>`{{3}}` Maturity Date | None |

---

### 5. Marketing & Daily Engagement (Opt-In WhatsApp)

> *Strictly compliant with Meta Marketing policies. Delivered only to users with active marketing opt-in.*

| Template Identifier | Category | Trigger / Purpose | Dynamic Variables | Interactive Buttons |
|---|---|---|---|---|
| **`intrust_gm_quote_v1`** | Marketing | Daily morning inspiration quote scheduled by admin. | `{{1}}` First Name<br>`{{2}}` Daily Quote Text | None |
| **`intrust_gm_greet_v1`** | Marketing | Morning greeting with quick-action wallet touchpoints. | `{{1}}` First Name | Quick Replies: **[Check My Balance]**, **[Recent Transactions]** |
| **`intrust_gm_tip_v1`** | Marketing | Daily actionable financial wellness and savings tip. | `{{1}}` Financial Tip Text | Quick Replies: **[Explore Features]**, **[My Wallet]** |
| **`intrust_ge_greet_v1`** | Marketing | Evening wrap-up message and balance review. | `{{1}}` First Name | Quick Replies: **[Check My Balance]**, **[Recent Transactions]** |
| **`intrust_reward_milestone_v1`** | Marketing | Sent when customer crosses reward milestones (100, 500, 1000 pts). | `{{1}}` Points Earned<br>`{{2}}` New Total Balance | Quick Replies: **[View My Rewards]**, **[Redeem Points]** |
| **`intrust_referral_invite_v1`** | Marketing | Campaign invite encouraging users to share their referral code. | `{{1}}` Referral Code<br>`{{2}}` Bonus Points | Quick Replies: **[Share My Code]**, **[View Rewards]** |
| **`intrust_giftcard_promo_v1`** | Marketing | Special discount promotions on merchant gift cards. | `{{1}}` Discount %<br>`{{2}}` Promo Details / Validity | Quick Replies: **[Browse Gift Cards]**, **[My Wallet]** |
| **`intrust_winback_v1`** | Marketing | Re-engagement campaign for users inactive for 30+ days. | `{{1}}` First Name<br>`{{2}}` Available Reward Balance | Quick Replies: **[Open My Account]**, **[View Offers]** |
| **`intrust_feature_announce_v1`** | Marketing | Broadcast announcing new platform features or product releases. | `{{1}}` Feature Name<br>`{{2}}` Description | Quick Replies: **[Learn More]**, **[Open App]** |
| **`intrust_festival_greeting_v1`** | Marketing | Personalized festive greetings (Diwali, Eid, New Year, etc.). | `{{1}}` First Name<br>`{{2}}` Festival Name | Quick Replies: **[View My Wallet]**, **[Explore Offers]** |

---

### 6. CRM Direct Lead Messaging (WhatsApp)

Used by Relationship Managers and Sales Agents directly from the CRM portal:

| Template Identifier | Category | Trigger / Purpose | Dynamic Variables |
|---|---|---|---|
| **`crm_lead_followup`** | Utility | Personalized follow-up with prospective client or lead inquiry. | `{{1}}` Contact Name<br>`{{2}}` Inquiry Topic / Service |
| **`crm_meeting_reminder`** | Utility | Meeting or call reminder for scheduled client consultation. | `{{1}}` Contact Name<br>`{{2}}` Scheduled Date<br>`{{3}}` Scheduled Time IST |

---

## Email Templates (HTML Transactional)

All email templates use the standard InTrust India responsive layout with responsive design, brand headers, clear call-to-actions, and security notices.

### 1. User Authentication & Security (Email)

- **`welcomeEmailTemplate`**  
  - **Sender**: `security@intrustindia.com`  
  - **Trigger**: Sent upon new user signup / registration.  
  - **Key Content**: Welcome letter, key platform features (Shop verified merchants, scratch cards & rewards, Store Credit, secure wallet), registered email badge, and **"Explore Storefront"** CTA button.
  
- **`loginAlertTemplate`**  
  - **Sender**: `security@intrustindia.com`  
  - **Trigger**: Triggered on new login session / Google OAuth / OTP verification (5-min deduplication cooldown).  
  - **Key Content**: Account email, timestamp (IST), login method, device/browser details, IP address, and security warning box with **"Review Account Security"** button.

---

### 2. Customer Orders & Store Credit (Udhari) (Email)

- **`orderConfirmedTemplate`**  
  - **Sender**: `orders@intrustindia.com`  
  - **Trigger**: Sent upon successful checkout and payment receipt.  
  - **Key Content**: Order reference ID (`#XXXX`), total paid in ₹, itemized product table (Item name, quantity, unit price), delivery shipping address, and **"Track Your Order"** button.

- **`orderStatusUpdateTemplate`**  
  - **Sender**: `orders@intrustindia.com`  
  - **Trigger**: Merchant or admin marks shipment status (*Packed*, *Shipped*, *Out for Delivery*, *Delivered*, *Cancelled*).  
  - **Key Content**: Real-time status badge, order reference, tracking carrier & AWB tracking number (if available), and **"View Order Details"** button.

- **`udhariDecisionTemplate`**  
  - **Sender**: `orders@intrustindia.com`  
  - **Trigger**: Merchant accepts or declines customer's deferred Store Credit request.  
  - **Key Content**: Decision result (Approved / Declined), order ID, credit amount approved, due date, terms, or merchant decline reason.

- **`udhariPaymentReceiptTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Customer completes repayment of their Store Credit balance.  
  - **Key Content**: Repayment receipt, payment reference ID, cleared balance, and updated available credit limit.

---

### 3. Invoicing & Finance Receipts (Email)

- **`getInvoiceCreatedTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: New digital invoice issued to a client or customer.  
  - **Key Content**: Invoice number, billing breakdown, due date, terms, and primary **"Pay Invoice Online"** button.

- **`getInvoiceResentTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Manual resend or automated reminder for an unpaid invoice.  
  - **Key Content**: Reminder notice, outstanding amount, due date, and payment link.

- **`getPaymentSuccessTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Payment successfully captured via gateway (SabPaisa/UPI/Cards).  
  - **Key Content**: Formal payment receipt, transaction ID, payment method, amount received, and invoice closure status.

- **`getPartialPaymentTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Client pays part of an installment or partial invoice.  
  - **Key Content**: Amount received, remaining outstanding balance, and updated due date for balance.

- **`getPaymentFailedTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Transaction failed or bank rejected payment.  
  - **Key Content**: Failure explanation, suggested resolution (check card limit, try UPI), and **"Retry Payment"** button.

- **`getDueSoonReminderTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Scheduled cron job (3 days / 1 day prior to invoice due date).  
  - **Key Content**: Polite payment due reminder to prevent service interruption or penalties.

- **`getOverdueReminderTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Cron job triggered after invoice passes due date without payment.  
  - **Key Content**: Urgent overdue notice, days past due, applicable late fees, and direct settlement link.

---

### 4. Merchant Onboarding & KYC (Email)

- **`applicationReceivedTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Merchant submits onboarding form on the portal.  
  - **Key Content**: Confirmation of application receipt, submitted business name, expected review turnaround (24-48 hrs), and support contact.

- **`applicationApprovedTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Admin approves merchant application in Admin Panel.  
  - **Key Content**: Official welcome to InTrust Merchant Network, merchant ID, dashboard access link, and setup instructions.

- **`applicationRejectedTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Admin rejects merchant application.  
  - **Key Content**: Rejection notice, specific compliance/documentation issues cited by reviewer, and re-submission guidelines.

- **`bankVerifiedTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Admin verifies merchant bank account details (Penny drop / IFSC check).  
  - **Key Content**: Bank verification success notice, masked account number, and confirmation that automated payouts are now active.

---

### 5. Merchant Operations & Catalog (Email)

- **`newOrderReceivedTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: New order placed containing products from this merchant.  
  - **Key Content**: Order ID, ordered items list, customer delivery state, packing deadline, and **"Process Order in Dashboard"** button.

- **`payoutRequestedTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Merchant requests funds withdrawal from merchant wallet.  
  - **Key Content**: Payout request reference, withdrawal amount in ₹, bank account details, and expected processing window.

- **`payoutStatusUpdateTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Admin or bank webhook updates payout (*Processed*, *Failed*, *Settled*).  
  - **Key Content**: Status update, bank UTR transfer reference number, or detailed reason if failed.

- **`productDecisionTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Catalog QA team audits a merchant-submitted product.  
  - **Key Content**: Decision (*Approved & Live* or *Rejected*), product name, reviewer feedback, and editing link.

- **`storeCreditRequestTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Customer requests store credit at checkout for merchant's products.  
  - **Key Content**: Customer profile summary, requested credit amount, cart contents, and one-click approve/decline links.

- **`newReviewAlertTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Verified buyer posts a star rating & review on merchant's product.  
  - **Key Content**: Star rating (1-5), customer name, review title & commentary, with direct link to view and reply.

- **`lowStockAlertTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Nightly inventory scan detects product stock below threshold (<= 5 units).  
  - **Key Content**: SKU, product title, current remaining stock, and quick restock link.

- **`vaultWithdrawalDecisionTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Admin approves or denies merchant Vault / Investment withdrawal request.  
  - **Key Content**: Investment pool name, withdrawal amount, payout UTR or reason for rejection.

- **`accountSuspendedTemplate`**  
  - **Sender**: `security@intrustindia.com`  
  - **Trigger**: Admin suspends a merchant account due to compliance/policy violation.  
  - **Key Content**: Notice of suspension, specific policy violations cited, and grievance appeal instructions.

---

### 6. CRM & Lead Lifecycle (Email)

- **`leadAssignedTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Lead assigned to a Relationship Manager or sales executive.  
  - **Key Content**: Prospect name, phone, email, inquiry interest, lead score, and CRM link to view contact.

- **`leadConvertedTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Lead successfully converted into an onboarded client or merchant.  
  - **Key Content**: Celebration banner, converted client name, deal value, and commission/attribution details.

- **`taskAssignedTemplate`**  
  - **Sender**: `notifications@intrustindia.com`  
  - **Trigger**: Team lead or manager creates and assigns a CRM task.  
  - **Key Content**: Task title, due date/time, linked client, priority level, and instructions.

---

### 7. HRM & Employee Portal (Email)

- **`leaveApplicationAdminTemplate`**  
  - **Sender**: `hr@intrustindia.com`  
  - **Trigger**: Employee submits a leave request on the portal.  
  - **Key Content**: Employee name, leave type (Casual, Sick, Earned), date range, total days, reason, and approval link.

- **`leaveDecisionTemplate`**  
  - **Sender**: `hr@intrustindia.com`  
  - **Trigger**: HR Manager approves or rejects a leave application.  
  - **Key Content**: Decision result, approved dates, remaining leave balance, and manager notes.

- **`salaryProcessedTemplate`**  
  - **Sender**: `accounts@intrustindia.com`  
  - **Trigger**: Monthly payroll batch finalized.  
  - **Key Content**: Monthly payslip breakdown (Gross salary, deductions, net salary, pay period), transfer date, and portal payslip download link.

- **`candidateHiredWelcomeTemplate`**  
  - **Sender**: `hr@intrustindia.com`  
  - **Trigger**: HR completes hiring and provisions employee account.  
  - **Key Content**: Welcome letter, job designation, joining date, reporting manager, and initial login credentials.

---

### 8. Administrative & Platform Alerts (Email)

- **`newMerchantApplicationAlertTemplate`**  
  - **Sender**: `notifications@intrustindia.com` → Sent to `admin@intrustindia.com`  
  - **Trigger**: Real-time alert when a new merchant applies.  
  - **Key Content**: Business name, category, city/state, owner phone/email, and direct link to review KYC in Admin Panel.

- **`newPayoutRequestAlertTemplate`**  
  - **Sender**: `accounts@intrustindia.com` → Sent to Finance Admins  
  - **Trigger**: Merchant requests high-value payout requiring manual approval.  
  - **Key Content**: Merchant name, requested amount, available wallet balance, bank details, and one-click review link.

- **`newOrderPlatformAlertTemplate`**  
  - **Sender**: `notifications@intrustindia.com` → Sent to Platform Ops  
  - **Trigger**: High-value or priority platform order placed.  
  - **Key Content**: Order value, customer info, sellers involved, and fulfillment tracking status.

- **`contactNotificationTemplate`**  
  - **Sender**: `info@intrustindia.com` → Sent to Support / Admin  
  - **Trigger**: Visitor submits the public "Contact Us" form on website.  
  - **Key Content**: Visitor name, email, phone, subject, and full message body.

- **`aiOrderWithdrawalNotificationTemplate`**  
  - **Sender**: `accounts@intrustindia.com` → Sent to Admin / Finance  
  - **Trigger**: Merchant requests withdrawal of matured AI Order funds.  
  - **Key Content**: Merchant details, requested amount, order code, and bank payout verification checklist.

---

## Template Summary Statistics

```
Total Active WhatsApp Templates : 33
  ├── Authentication & Security : 2
  ├── Customer Utility & Wallet : 7
  ├── Invoicing & Orders        : 2
  ├── Merchant Operations       : 12
  └── Marketing & Engagement    : 10

Total Active Email Templates    : 31
  ├── Auth & Account Security   : 2
  ├── Customer Orders & Udhari  : 4
  ├── Invoicing & Finance       : 7
  ├── Merchant Onboarding & KYC : 4
  ├── Merchant Operations       : 9
  ├── CRM & Lead Management     : 3
  ├── HRM & Employee Portal     : 4
  └── Admin & System Alerts     : 5
```
