# Shadowfax 360 & Unified API: Logistics Integration & Commercial Assessment Report

**Platform:** Intrust India E-Commerce & Hyperlocal Store  
**Document Classification:** Confidential — For Client Review Only  
**Target Operations:** Bhopal Intra-City (Hyperlocal Grocery) & Pan-India (Standard E-Commerce)  
**Official API Docs:** [SFX Unified Forward API](https://sfxunifiedapi.docs.apiary.io/#) | [SFX Reverse Pickup API](https://sfxreversepickup.docs.apiary.io/#)  
**Date:** September 2026 | **Version:** 2.1 (Shadowfax Unified Edition)  

---

## Executive Summary

Intrust India requires an automated delivery infrastructure capable of handling two distinct operational models:
1. **Bhopal Hyperlocal Delivery:** Same-day / sub-4-hour delivery for fresh groceries, vegetables, and daily essentials from local merchants.
2. **Pan-India E-Commerce Shipping:** Express surface and air delivery (1–4 days) for fashion, electronics, and lifestyle goods.

Historically, e-commerce stores have had to integrate and maintain two separate logistics systems: a multi-courier aggregator (e.g., Shiprocket) and a dedicated hyperlocal on-demand provider (e.g., Dunzo / Borzo).

**Shadowfax 360 (SF360)**, built on the **Shadowfax Unified API**, completely removes this operational overhead. Developed specifically for D2C brands, multi-vendor marketplaces, and SMEs, SF360 consolidates Shadowfax's national express carrier network and city-wide 2-wheeler hyperlocal fleet into a **single self-serve digital platform and REST API collection**.

### Key Highlights & Commercial Advantages
| Dimension | Shadowfax 360 / Unified API Performance | Impact on Intrust India |
| :--- | :--- | :--- |
| **Starting Shipping Rate** | **₹39 per shipment** (500g) | Zone-based flat rate; lowest entry price in the industry |
| **COD Collection Fee** | **₹0 / 0% Extra** | Saves ₹40–50 per order compared to Shiprocket/standard couriers |
| **COD Remittance Cycle** | **D+2 Days** (Delivery + 2 business days) | 3x faster cash flow than industry standard (D+7) |
| **Platform Subscription** | **₹0 / month** | Zero monthly SaaS subscription fees |
| **RTO Risk Prevention** | Built-in AI RTO Predictor | Flags high-risk COD orders prior to merchant dispatch |
| **Returns / Reverse QC** | Full Reverse Pickup API with Doorstep QC | Prevents fraudulent customer apparel returns |
| **Engineering Investment**| **₹38,000 – 56,000** (8–10 Working Days) | Single API to build instead of dual-aggregator setup |
| **Monthly Net Savings** | **₹20,799 / month** (on 500 orders) | 43% lower total logistics expenditure |

---

## 1. Why Direct Contact with Shadowfax Failed (And The Solution)

Many expanding e-commerce companies face significant friction when trying to contact Shadowfax via their corporate website (`shadowfax.in`).

### The Two Divisions of Shadowfax:
1. **Shadowfax Enterprise (Corporate Sales Desk):**
   - Built for enterprise giants (Zepto, Swiggy, Flipkart, Nykaa) generating 10,000 to 100,000+ orders daily.
   - Requires lengthy offline legal contracts, corporate security deposits, minimum monthly order volume commitments, and manual sales desk interactions.
   - Low-to-medium volume inquiries submitted via the general contact form are routinely deprioritized by their enterprise sales pipeline.
2. **Shadowfax 360 (Self-Serve Digital Platform — `shadowfax360.in`):**
   - Built specifically for growing D2C brands, multi-vendor stores, and SMEs.
   - **Zero volume minimums:** Start shipping immediately from 1 order/day.
   - **Instant digital onboarding:** Sign up online, complete digital KYC (PAN/GST/Bank details), and begin shipping within hours.
   - **Direct API & Webhook Access:** API keys and developer documentation are accessible directly from the merchant dashboard.
   - **Self-service Rate Calculator:** Dynamic pincode-to-pincode cost estimation without waiting for an account manager.

> **Actionable Resolution:** Do not wait for enterprise sales representatives to return calls. Intrust India should register directly on the **[Shadowfax 360 Portal](https://shadowfax360.in)** to activate the account instantly.

---

## 2. Commercial Model & Pricing Structure

Shadowfax 360 departs from legacy logistics pricing by utilizing a **Zone-Based Flat-Rate Model** that eliminates billing surprises, hidden fuel surcharges, and punitive weight discrepancies.

### Indicative Rate Card Breakdown
| Delivery Zone | Applicable Route | Indicative Base Rate (500g) | Typical SLA | Intrust Product Fit |
| :--- | :--- | :--- | :--- | :--- |
| **Zone A (Intra-City)** | Within Bhopal City Limits | **₹39 – ₹55** | 2 – 4 Hours / Same-Day | Fresh Groceries, Dairy, Vegetables, Urgent Essentials |
| **Zone B (Intra-State)** | Across Madhya Pradesh (Indore, Jabalpur, Gwalior) | **₹45 – ₹60** | 24 – 48 Hours | Regional Merchant Goods, Packaged FMCG, Apparel |
| **Zone C (Metro to Metro)**| Major Metros (Delhi NCR, Mumbai, Bengaluru) | **₹55 – ₹75** | 2 – 3 Days | Standard E-Commerce Apparel, Electronics, Accessories |
| **Zone D (Rest of India)** | Tier-2 & Tier-3 National Pincodes | **₹70 – ₹95** | 3 – 5 Days | Nationwide Customer Orders |
| **Zone E (Special Zones)** | Northeast, Jammu & Kashmir, Islands | **₹95 – ₹125** | 5 – 7 Days | Remote National Deliveries |

*Note: Billing applies to actual weight or volumetric weight ($L \times W \times H / 5000$), whichever is greater.*

### The Deciding Factor: Cash-On-Delivery (COD) Economics
In tier-2/3 cities and regional commerce, Cash-on-Delivery (COD) accounts for 60%–75% of customer volume. The handling fee structure of couriers heavily influences store margins:

| Commercial Feature | Shiprocket / Standard Couriers | Shadowfax 360 (SF360) | Direct Financial Benefit |
| :--- | :--- | :--- | :--- |
| **COD Handling Fee** | ₹40 – ₹50 flat OR 1.5%–2.0% of order value | **₹0 (Zero Extra Charge)** | **Saves ₹40–50 per COD order** |
| **COD Remittance Time** | D+4 to D+7 Business Days | **D+2 Business Days** | Rapid cash flow & merchant payout |
| **Monthly SaaS Fee** | ₹499/mo (Advanced) or ₹799/mo (Pro) | **₹0 Monthly Subscription** | Saves ₹6,000–₹10,000 annually |
| **Pre-Shipment RTO AI** | Paid Add-on (Shiprocket Sense) | **Included in Core Platform** | Reduces non-delivery return losses |
| **Reverse QC Inspection** | Limited / Manual disputes | **Digital Doorstep Quality Check** | Prevents fraudulent customer returns |

---

## 3. Financial Projections & Monthly Cost Comparison

Below is a detailed cost comparison between a traditional **Shiprocket Hybrid Stack** (Shiprocket for pan-India + dedicated hyperlocal carrier) versus a **Unified Shadowfax 360 Stack** on a baseline of **500 orders per month** (assuming a realistic 65% COD ratio and 25% local Bhopal grocery mix):

### 500 Orders / Month Detailed Breakdown
| Expense Component | Shiprocket Stack (Hybrid) | Shadowfax 360 (Unified) | Monthly Variance |
| :--- | :--- | :--- | :--- |
| **Forward Shipping** (500 orders @ blended avg) | ₹34,500 (Avg ₹69 / order) | ₹27,500 (Avg ₹55 / order) | ₹7,000 savings |
| **COD Collection Fees** (325 COD orders @ 65%) | ₹13,000 (₹40 / order) | **₹0 (Waived)** | **₹13,000 savings** |
| **Platform Subscription SaaS Fee** | ₹799 / month (Pro plan) | **₹0 (Zero fee)** | ₹799 savings |
| **Total Monthly Logistics Outflow** | **₹48,299 / month** | **₹27,500 / month** | **₹20,799 / month saved (43% Cheaper)** |

### Scaled Volume Projections
| Monthly Volume | Shiprocket Total Expense | Shadowfax 360 Total Expense | Net Monthly Savings | Annual Net Profit Gain |
| :--- | :--- | :--- | :--- | :--- |
| **250 Orders / month** | ₹24,549 | ₹13,750 | **₹10,799 / mo** | **₹1,29,588 / year** |
| **500 Orders / month** | ₹48,299 | ₹27,500 | **₹20,799 / mo** | **₹2,49,588 / year** |
| **1,000 Orders / month**| ₹95,799 | ₹55,000 | **₹40,799 / mo** | **₹4,89,588 / year** |

### Customer Delivery Fee Recovery Model
If Intrust India institutes a checkout delivery policy charging customers **₹49 on orders under ₹499** (which typically represents ~70% of grocery and retail orders):
* Across 500 orders, customer delivery fee collections generate **₹17,150**.
* Under **Shadowfax 360**, the net platform shipping subsidy needed from Intrust is only **₹10,350/month**.
* Under **Shiprocket**, Intrust would have had to absorb a steep deficit of **₹31,149/month**!

---

## 4. Technical Architecture: Shadowfax Unified Forward API & Push Callback Sync

Based on the official **Shadowfax Unified Forward API Documentation** (`https://sfxunifiedapi.docs.apiary.io/#`), the system communicates via authenticated RESTful endpoints:
* **Base URL (Staging):** `https://dale.staging.shadowfax.in/api/`
* **Base URL (Production):** `https://dale.shadowfax.in/api/`
* **Authentication:** HTTP Header `Authorization: Token <token_id>`

### Core API Endpoints
1. **Pincode Serviceability Check:**  
   `GET /v1/clients/serviceability/?service=customer_delivery&pincodes=462001,462016`  
   Validates delivery and seller pickup availability before checkout.
2. **Marketplace Order Creation (Seller Pickup Model):**  
   `POST /v3/clients/orders/`  
   Supports multi-vendor pickups directly from merchant shops in Bhopal. Takes:
   - `order_details`: `client_order_id`, `actual_weight`, `order_type` (`prepaid` or `cod`), `total_amount`.
   - `customer_details`: Name, phone, delivery address, pincode.
   - `pickup_details`: Merchant shop address, contact person, phone number.
   - `product_details`: SKU list, quantity, item description.
3. **Order Tracking (v4):**  
   `GET /v4/clients/orders/{awb_number}`  
   Provides detailed event history (Item Manifested, Bag In Transit, OFD, Delivered).
4. **Order Cancellation:**  
   `POST /v2/clients/orders/cancel/`  
   Cancels an order before pickup if the customer cancels on Intrust.

### Real-Time Push Callback API (Webhook)
Shadowfax fires real-time HTTP POST requests to Intrust's webhook URL (`/api/webhooks/shadowfax`):

```json
{
  "order_id": "ord_987654",
  "awb_number": "SFX1029384756",
  "status": "Out For Delivery",
  "event": "ofd",
  "event_timestamp": "2026-09-16T15:30:00Z",
  "current_location": "Bhopal MP Nagar Hub",
  "rider_name": "Rahul Verma",
  "rider_contact": "+919876543210",
  "otp_verifed": "Y",
  "comments": "Rider out for delivery"
}
```

### Integration into Intrust Supabase Database:
When the webhook receives this payload, it calls Intrust's existing Postgres RPC:
```sql
SELECT public.update_order_delivery_v3(
  p_order_id := 'ord_987654',
  p_delivery_status := 'out_for_delivery',
  p_tracking_number := 'SFX1029384756',
  p_notes := 'Rider: Rahul Verma (+919876543210)'
);
```
* **WhatsApp Automation:** Firing `update_order_delivery_v3()` immediately triggers the existing WhatsApp notification route (`/api/orders/[orderId]/status/route.js`), sending the customer a WhatsApp message containing their rider's name, phone number, and live tracking link!
* **Proof of Delivery (OTP):** For grocery and high-value orders, Shadowfax riders require the customer's 4-digit OTP at doorstep. The webhook receives `otp_verifed: "Y"`, guaranteeing tamper-free proof of delivery.

---

## 5. Reverse Logistics: SFX Reverse Pickup API & Doorstep QC

According to the **Shadowfax Reverse Pickup API** (`https://sfxreversepickup.docs.apiary.io/#`), Shadowfax provides a dedicated reverse logistics workflow for customer returns:
* **Doorstep Quality Check (QC):** Riders inspect product tags, brand packaging, and physical defects before accepting the return from the customer. This completely protects merchants from fraudulent apparel and electronics returns.
* **Direct Return to Merchant (RTS):** Reverse items are routed straight back to the merchant's Bhopal store or warehouse.
* **Dedicated Reverse AWB:** Creates a trackable return shipment visible in both the customer and merchant portals.

---

## 6. Implementation Scope & Budget

Consolidating onto Shadowfax 360 and Unified API cuts development effort to **8–10 working days**:

| Milestone | Scope of Work | Effort | Cost Estimate |
| :--- | :--- | :--- | :--- |
| **1. SFX REST Client Module** | Token auth, serviceability check, marketplace order dispatch, AWB generation | 2 Days | ₹10,000 – ₹14,000 |
| **2. Webhook Handler & RPC Sync** | Webhook endpoint, HMAC verification, `update_order_delivery_v3()` integration | 2 Days | ₹8,000 – ₹12,000 |
| **3. Merchant Admin Dispatch UI** | 1-Click "Dispatch Order" button, parcel weight modal, barcode label print | 2 Days | ₹8,000 – ₹12,000 |
| **4. Customer Tracking & WhatsApp** | Milestone timeline on customer order page, rider tracking URL, OTP display | 1.5 Days | ₹6,000 – ₹9,000 |
| **5. QA, Reverse Returns & Sandbox** | End-to-end sandbox testing, reverse pickup test, idempotency verification | 1.5 Days | ₹6,000 – ₹9,000 |
| **Total Engineering Suite** | **Full Production-Ready Logistics & Returns Engine** | **8–10 Days** | **₹38,000 – ₹56,000** |

*Payback Period: The development fee of ₹38,000 – ₹56,000 is recouped in 2 to 3 months solely from the ₹20,799/month savings on COD handling fees!*

---

## 7. Client Onboarding Guide (Step-by-Step)

To activate the account immediately without enterprise sales friction:

1. **Visit the Portal:** Open **`https://shadowfax360.in`** and click **Sign Up**.
2. **Register Account:** Enter business contact number, company name (Intrust India), and corporate email.
3. **Digital KYC Verification:** Upload:
   - Business GSTIN certificate.
   - Company / Proprietor PAN Card.
   - Bank Account Details & Cancelled Cheque (essential for automated D+2 COD payouts).
   *Verification is automated and completed within 2–6 hours.*
4. **Initial Wallet Recharge:** Top up the shipping wallet with a nominal test balance (₹1,500 – ₹2,000) via UPI or Net Banking.
5. **Retrieve API Credentials:**
   - In the left navigation, go to **Settings > Developer / API Integrations**.
   - Copy the `API Token` and `Client ID`.
   - Provide these credentials to the engineering team to begin sandbox integration.

---

## 8. Strategic Summary & Final Recommendation

1. **Adopt Shadowfax 360 as the Primary Logistics Engine:**  
   Shadowfax 360 provides the highest operational efficiency, lowest entry cost (₹39), zero COD fees, fast D+2 remittances, and eliminates the need to manage multiple courier contracts.
2. **Leverage the SFX Unified API:**  
   The API natively supports multi-seller pickups across Bhopal, real-time webhooks with rider phone numbers, and full reverse return QC.
3. **Immediate Action:**  
   The client should complete registration at `shadowfax360.in` to obtain API credentials immediately and commence the 8–10 day engineering sprint.

---
*Report Prepared by Intrust Engineering Advisory &bull; September 2026*
