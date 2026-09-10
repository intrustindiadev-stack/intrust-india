# Delivery API Integration: Strategy, Vendor Analysis & Cost Proposal
**Platform:** Intrust India E-Commerce  
**Document Classification:** Confidential — For Client Review Only  
**Target Geography:** Bhopal, Madhya Pradesh (Hyperlocal Grocery) & Pan-India (Standard E-Commerce)  
**Date:** September 2026 | **Version:** 1.0  

---

## Executive Summary

Intrust India currently manages order dispatch manually: merchants self-fulfill and manually paste tracking numbers into the admin portal. To support multi-vendor expansion and enable **same-day local grocery delivery** across Bhopal alongside **pan-India shipping** for fashion, electronics, and general merchandise, this proposal outlines an automated API-driven logistics infrastructure.

### Key Metrics & Highlights
| Dimension | Key Recommendation / Metric | Details |
| :--- | :--- | :--- |
| **Logistics Stack** | **2-Provider Strategy** | Shiprocket (Pan-India Aggregator) + Shadowfax / Pinified (Bhopal Hyperlocal) |
| **Total Dev Investment** | **₹80,000 – 1.2 Lakh** | 18–21 working days across 2 phased milestones |
| **Phase 1 Only (Shiprocket)** | **₹40,000 – 60,000** | 10–12 working days (Pan-India standard e-commerce automation) |
| **Logistics Cost Recovery** | **100% Recoverable** | Customer checkout delivery fees (e.g. ₹49 under ₹499) offset courier costs |
| **Technical Feasibility** | **Zero Core DB Overhaul** | Schema already has tracking number, delivery status enum, and update RPCs |

---

## 1. Current Architecture Assessment

Intrust operates on Next.js 14 App Router and a Supabase PostgreSQL backend on a dedicated VPS. The existing database structure is already primed to receive courier API integration:

### End-to-End Fulfilment Workflow
```
Customer Places Order ➔ Merchant Packs Order ➔ [NEW] Courier API Auto-Dispatch ➔ [NEW] Webhook Event ➔ DB RPC Status Update ➔ Automated WhatsApp Alert
```

### Database & Backend Readiness
| Existing Component | Database Column / Code Route | Delivery API Role |
| :--- | :--- | :--- |
| **Delivery Status Enum** | `shopping_order_groups.delivery_status` | Maps 1:1 to partner tracking states (`packed`, `shipped`, `out_for_delivery`, `delivered`) |
| **Tracking Identifier** | `shopping_order_groups.tracking_number` | Auto-populated with courier AWB / Waybill ID |
| **Estimated Delivery** | `shopping_order_groups.estimated_delivery_at` | Auto-populated via courier SLA calculation |
| **Status Notes** | `shopping_order_groups.status_notes` | Stores courier milestone remarks & delivery timestamps |
| **Status Update RPC** | `update_order_delivery_v3()` | Webhook calls this directly with idempotency guards |
| **WhatsApp Notifications**| `/api/orders/[orderId]/status/route.js` | Automatically triggers message on `shipped` & `delivered` |
| **Product Routing Tag** | `products.delivery_type` *(Additive)* | New column to route grocery vs. standard carts |

---

## 2. Fulfilment Delivery Models

Intrust operates a multi-vendor marketplace where different product types require distinct logistics patterns:

### Model A: Merchant Direct Pickup (Recommended Now)
- **Concept:** Partner riders pick up packages directly from merchant shops/outlets in Bhopal upon order readiness.
- **Advantages:** Zero warehouse capital or lease required. Supports 2–4 hour delivery for local groceries and 1–3 days for fashion/electronics.
- **Fulfilment SLA:** 2 to 24 hours.

### Model B: Centralized Dark Store / Micro-Warehouse (Future Phase)
- **Concept:** Intrust-owned stock dispatched from a central micro-warehouse (Zepto / Blinkit style).
- **Considerations:** Requires dedicated warehouse lease, cold storage, inventory ownership, and ₹15L–30L minimum setup Capex.
- **Recommended For:** Phase 3+ scale (1,000+ orders/day).

---

## 3. Standard E-Commerce Logistics (Pan-India)

For non-perishable goods (fashion, electronics, cosmetics, dry goods). Couriers pick up from Bhopal merchants and deliver nationwide.

| Feature / Metric | Shiprocket (Aggregator) ⭐ Recommended | Delhivery (Direct Carrier) | XpressBees |
| :--- | :--- | :--- | :--- |
| **Bhopal Pickup** | ✅ Full coverage (25+ partners) | ✅ Yes | ✅ Yes |
| **API & Webhooks** | ✅ Full REST + Webhooks | ✅ Full REST + Webhooks | ✅ Full REST + Webhooks |
| **Sandbox Testing** | ✅ Full sandbox environment | ✅ Yes | ⚠️ Limited |
| **COD Support** | ✅ Yes, with remittance | ✅ Yes | ✅ Yes |
| **NDR Management** | ✅ Automated NDR workflows | ⚠️ Manual intervention | ⚠️ Partial |
| **Platform Fee** | ₹499/mo (Advanced) or ₹799/mo (Pro) | Custom enterprise contract | Custom enterprise contract |
| **Indicative Rate** | ₹40 – 110 per 500g | Negotiated corporate rate | Negotiated corporate rate |
| **Onboarding Speed** | Immediate self-serve (1–2 days) | 1–2 weeks contract review | 1–2 weeks contract review |

---

## 4. Hyperlocal Logistics (Bhopal Grocery & Same-Day)

Grocery and perishable goods demand dedicated 2-wheeler fleets with sub-4-hour delivery SLAs across Bhopal (MP Nagar, Arera Colony, Kolar Road, Hoshangabad Road, Indrapuri).

| Provider | Fleet & Coverage | Delivery SLA | Proof of Delivery | Commercial Model | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Shadowfax Hyperlocal** ⭐ | National fleet with confirmed Bhopal presence | 2–4 Hours (Same-day guaranteed) | Customer OTP | Contract-based (₹50–80 / drop) | **Top Pick** (Powers Zepto, Blinkit) |
| **Pinified** | Bhopal-native network with dedicated local riders | 1–4 Hours (Instant dispatch) | App confirmation | Transparent rate (₹52 base up to 5km) | **Strong Alternative** (Zero contract friction) |
| **Shiprocket Quick** | Module bundling Dunzo, Shadowfax, Borzo | Same-Day (Rider dependent) | Courier dependent | Dynamic distance (₹10+ / km) | **Convenient** (Variable rider density) |
| **Adloggs** | AI dispatch OS connecting regional couriers | 2–4 Hours | OTP / Photo | Quote based | **Emerging** (Bhopal active) |

---

## 5. Pricing & Operational Cost Projections

### Indicative Rate Cards
- **Standard E-Commerce (Shiprocket):**
  - Intra-city Bhopal (500g): ₹40 – 55
  - Regional (MP & nearby states): ₹60 – 80
  - Pan-India Metro: ₹80 – 110
  - Additional 500g slab: ₹35 – 50
  - Cash-on-Delivery (COD): ₹40 – 50 or 1.5%
  - Return to Origin (RTO on failed delivery): ₹40 – 80
- **Hyperlocal Grocery (Bhopal):**
  - 0 – 5 km: ₹52 – 65
  - 5 – 10 km: ₹75 – 90
  - 10 – 20 km: ₹110 – 130
  - Shadowfax B2B Base: ₹50 – 80 flat

### Monthly Financial Model (500 Orders / Month Baseline)
| Order Classification | Volume | Avg. Cost / Order | Monthly Logistics | Platform SaaS Fee | Net Monthly Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard Goods (Shiprocket)** | 400 | ₹75.00 | ₹30,000 | ₹799 (Pro) | **₹30,799** |
| **Grocery Hyperlocal (Shadowfax)** | 100 | ₹70.00 | ₹7,000 | ₹0 (Direct Contract) | **₹7,000** |
| **Total Combined Operations** | **500** | **₹74.00 (avg.)** | **₹37,000** | **₹799** | **₹37,799 / month** |

> **Cost Recovery Strategy:** Charging customers a delivery fee (e.g., flat ₹49 on orders under ₹499, and free shipping above) collects ~₹32,500/month across 500 orders, reducing net platform delivery expense to under ₹5,300/month.

---

## 6. Integration Cost & Engineering Investment

| Engineering Workstream | Scope of Work | Effort | Cost Estimate |
| :--- | :--- | :--- | :--- |
| **Shiprocket API Client** | Auth token caching, order creation, rate quotes, shipping label PDF fetch | 3–4 Days | ₹12,000 – 18,000 |
| **Webhook Handler & Sync** | HMAC verification, status parsing, invocation of `update_order_delivery_v3()` | 2–3 Days | ₹8,000 – 12,000 |
| **Hyperlocal Grocery Adapter** | Shadowfax/Pinified client, rider dispatch, address geo-tagging, OTP workflow | 3–4 Days | ₹12,000 – 18,000 |
| **Product Delivery Tagging** | Schema migration + cart routing (standard pan-India vs. local grocery) | 1–2 Days | ₹4,000 – 8,000 |
| **Merchant Dashboard "Ship" UI** | Replaces manual tracking input with 1-click "Pack & Ship" button | 2–3 Days | ₹8,000 – 12,000 |
| **Customer Tracking Widget** | Live milestone timeline showing courier status and external tracking link | 2 Days | ₹6,000 – 10,000 |
| **Idempotency & Error Guards** | Duplicate shipment protection, webhook retry dead-letter queues | 2 Days | ₹6,000 – 10,000 |
| **Testing, Sandbox & QA** | Sandbox courier verification, WhatsApp alert regression testing, edge cases | 3 Days | ₹10,000 – 15,000 |
| **Total Engineering Scope** | **Full 2-Provider Logistics Engine** | **18–21 Days** | **₹66,000 – 1,03,000** |

### Implementation Packages
1. **Phase 1: Standard E-Commerce Only:** ₹40,000 – 60,000 (10–12 Days)
2. **Phases 1 + 2: Complete Delivery Suite:** ₹80,000 – 1,20,000 (18–21 Days)
3. **Annual Maintenance:** ~₹15,000 – 25,000/year (API updates, token refreshes, monitoring)

---

## 7. Phased Rollout Roadmap (5 Weeks)

- **Week 1 (Days 1–5): Account Setup & Shiprocket Client Module**  
  Register Shiprocket Advanced account, configure sandbox API tokens, build authentication and shipment generation modules.
- **Week 2 (Days 6–10): Webhook Synchronization & Merchant UI**  
  Build webhook listener connected to `update_order_delivery_v3()`; replace manual tracking inputs with 1-click "Pack & Ship" button in merchant admin.
- **Week 3 (Days 11–14): Customer Tracking UI & Phase 1 Production Go-Live**  
  Launch live customer tracking page, verify automated WhatsApp notifications, and deploy Phase 1 to production for standard e-commerce orders.
- **Weeks 4–5 (Days 15–21): Hyperlocal Grocery Integration & Dual-Routing**  
  Deploy Shadowfax/Pinified hyperlocal adapter, configure delivery category tags on grocery items, test OTP delivery confirmation, and launch full suite.

---

## 8. Risk Mitigation Register

1. **Return to Origin (RTO) on COD (Medium Risk):** Mandatory customer WhatsApp OTP confirmation before packing, landmark field at checkout, and automated Shiprocket NDR re-attempt workflows.
2. **Bhopal Peak Hour Rider Delays (Medium Risk):** Dual carrier setup with Shadowfax as primary contract carrier and Pinified as instant rate-card fallback.
3. **Duplicate Shipments on Retries (Low Risk):** Enforce unique idempotency keys using internal `order_id`; check existing AWB before invoking booking API on retries.
4. **Carrier API Schema Changes (Low Risk):** External payloads isolated behind internal contract adapters; reserve 20% annual maintenance budget.

---

## 9. Final Recommendations & Immediate Action Plan

1. **Approve Phase 1 Kickoff:** Automate standard pan-India shipping with Shiprocket first to eliminate merchant friction and capture immediate ROI.
2. **Engage Shadowfax & Pinified:** Initiate corporate onboarding with Shadowfax for Bhopal grocery volumes, using Pinified as an immediate zero-contract alternative.
3. **Action Items:**
   - Business Ops: Shiprocket business KYC registration (1–2 days).
   - Business Ops: Shadowfax outreach for Bhopal rate card (2–3 days).
   - Engineering: Sprint 1 kickoff upon client signoff.
