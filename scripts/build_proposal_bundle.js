const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Delivery API Integration Strategy & Cost Proposal — Intrust India</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 14mm 16mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
    }

    /* Page container with explicit page break */
    .page-section {
      page-break-after: always;
      break-after: page;
    }
    .page-section:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* Cover Container */
    .cover-card {
      border: 2px solid #0f172a;
      border-left: 8px solid #1e3a8a;
      border-radius: 6px;
      padding: 22px 20px;
      background: #ffffff;
      margin-bottom: 14px;
    }
    .cover-badge {
      display: inline-block;
      border: 1.5px solid #1e3a8a;
      color: #1e3a8a;
      background: #eff6ff;
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .cover-title {
      font-size: 19pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.22;
      margin-bottom: 6px;
    }
    .cover-subtitle {
      font-size: 9.5pt;
      color: #334155;
      line-height: 1.4;
      margin-bottom: 14px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
    }
    .meta-item label {
      display: block;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 2px;
    }
    .meta-item span {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
    }

    /* Section Headers */
    .sec-tag {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #1e3a8a;
      margin-bottom: 2px;
    }
    h2 {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 8px;
      margin-bottom: 4px;
    }
    p {
      color: #334155;
      font-size: 9.2pt;
      margin-bottom: 6px;
    }

    /* KPI Grid */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 8px 0;
    }
    .kpi-box {
      border: 1.5px solid #cbd5e1;
      border-top: 3.5px solid #1e3a8a;
      border-radius: 5px;
      padding: 8px 12px;
      background: #f8fafc;
    }
    .kpi-title {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      margin-bottom: 2px;
    }
    .kpi-number {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .kpi-desc {
      font-size: 8pt;
      color: #64748b;
      margin-top: 2px;
    }

    /* Callouts */
    .callout {
      border: 1.5px solid #cbd5e1;
      border-left: 4px solid #1e3a8a;
      background: #f8fafc;
      padding: 7px 11px;
      border-radius: 4px;
      margin: 8px 0;
      font-size: 8.8pt;
      line-height: 1.38;
      color: #1e293b;
    }
    .callout.success {
      border-color: #059669;
      border-left-color: #059669;
      background: #f0fdf4;
      color: #064e3b;
    }
    .callout.warning {
      border-color: #d97706;
      border-left-color: #d97706;
      background: #fffbeb;
      color: #78350f;
    }
    .callout.info {
      border-color: #2563eb;
      border-left-color: #2563eb;
      background: #eff6ff;
      color: #1e3a8a;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 8.5pt;
    }
    th, td {
      padding: 5px 7px;
      text-align: left;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      font-size: 7.8pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    tr.featured-row {
      background: #eff6ff;
      font-weight: 700;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 3px;
      font-size: 7.5pt;
      font-weight: 700;
      line-height: 1.2;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .b-green {
      background: #ecfdf5;
      color: #065f46;
      border-color: #059669;
    }
    .b-blue {
      background: #eff6ff;
      color: #1e40af;
      border-color: #2563eb;
    }
    .b-orange {
      background: #fffbeb;
      color: #92400e;
      border-color: #d97706;
    }
    .b-red {
      background: #fef2f2;
      color: #991b1b;
      border-color: #dc2626;
    }
    .b-gray {
      background: #f1f5f9;
      color: #334155;
      border-color: #64748b;
    }

    /* Cards */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 6px 0;
    }
    .card {
      border: 1.5px solid #cbd5e1;
      border-radius: 5px;
      padding: 8px 10px;
      background: #ffffff;
    }
    .card.top-choice {
      border-color: #1e3a8a;
      border-width: 2px;
      background: #f8fafc;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .card-title {
      font-size: 9.8pt;
      font-weight: 800;
      color: #0f172a;
    }
    .card-sub {
      font-size: 8.2pt;
      color: #475569;
      margin-bottom: 5px;
    }
    .card ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .card li {
      font-size: 8.5pt;
      color: #334155;
      margin-bottom: 2.5px;
      padding-left: 12px;
      position: relative;
    }
    .card li::before {
      content: "•";
      position: absolute;
      left: 1px;
      color: #1e3a8a;
      font-weight: bold;
    }
    .card li.pro::before {
      content: "✓";
      color: #059669;
    }
    .card li.con::before {
      content: "✕";
      color: #dc2626;
    }
    .card-rate {
      border-top: 1px solid #e2e8f0;
      margin-top: 5px;
      padding-top: 5px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8.2pt;
      color: #64748b;
    }
    .card-rate strong {
      font-size: 10.5pt;
      color: #0f172a;
    }

    /* Workflow Diagram */
    .flow-container {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 6px 0;
      flex-wrap: wrap;
    }
    .flow-box {
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 4px;
      padding: 5px 7px;
      font-size: 7.8pt;
      font-weight: 700;
      text-align: center;
      color: #1e293b;
      min-width: 78px;
    }
    .flow-box.active-box {
      border-color: #1e3a8a;
      background: #eff6ff;
      color: #1e3a8a;
    }
    .flow-arrow {
      color: #64748b;
      font-weight: 800;
      font-size: 10pt;
    }

    /* Timeline */
    .tl-row {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .tl-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #1e3a8a;
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 800;
      font-size: 8.5pt;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .tl-body {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 5px 8px;
      background: #ffffff;
      flex: 1;
    }
    .tl-header {
      font-size: 7.5pt;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tl-heading {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
      margin: 1px 0;
    }
    .tl-text {
      font-size: 8.2pt;
      color: #334155;
      margin: 0;
    }

    /* TOC Box */
    .toc-container {
      border: 1.5px solid #cbd5e1;
      border-radius: 5px;
      padding: 8px 12px;
      background: #f8fafc;
      margin-bottom: 12px;
    }
    .toc-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e3a8a;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }
    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 14px;
    }
    .toc-entry {
      font-size: 8.2pt;
      color: #1e293b;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 1px;
    }
    .toc-entry strong {
      color: #1e3a8a;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 7.8pt;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 0 3px;
      border-radius: 3px;
      color: #0f172a;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: COVER & EXECUTIVE SUMMARY ==================== -->
  <div class="page-section">
    <!-- COVER CARD -->
    <div class="cover-card">
      <div class="cover-badge">Confidential Technical &amp; Cost Proposal</div>
      <h1 class="cover-title">Delivery API Integration<br>Strategy, Vendor Analysis &amp; Cost Proposal</h1>
      <p class="cover-subtitle">
        A comprehensive evaluation of automated courier integrations for Intrust India's e-commerce platform — covering pan-India logistics, Bhopal hyperlocal same-day delivery for grocery products, technical architecture, and transparent cost models for client review.
      </p>
      <div class="meta-grid">
        <div class="meta-item">
          <label>Prepared For</label>
          <span>Intrust India</span>
        </div>
        <div class="meta-item">
          <label>Prepared By</label>
          <span>Intrust Tech Team</span>
        </div>
        <div class="meta-item">
          <label>Target Geography</label>
          <span>Bhopal &amp; Pan-India</span>
        </div>
        <div class="meta-item">
          <label>Version &amp; Date</label>
          <span>v1.0 &bull; Sept 2026</span>
        </div>
      </div>
    </div>

    <!-- TABLE OF CONTENTS -->
    <div class="toc-container">
      <div class="toc-title">Table of Contents</div>
      <div class="toc-grid">
        <div class="toc-entry"><span><strong>01.</strong> Executive Summary</span><span>Page 1</span></div>
        <div class="toc-entry"><span><strong>06.</strong> Logistics Rate Cards &amp; Projections</span><span>Page 4</span></div>
        <div class="toc-entry"><span><strong>02.</strong> Current Architecture Assessment</span><span>Page 2</span></div>
        <div class="toc-entry"><span><strong>07.</strong> Development Effort &amp; Budget</span><span>Page 5</span></div>
        <div class="toc-entry"><span><strong>03.</strong> Fulfilment Delivery Models</span><span>Page 2</span></div>
        <div class="toc-entry"><span><strong>08.</strong> Phased Rollout Roadmap</span><span>Page 6</span></div>
        <div class="toc-entry"><span><strong>04.</strong> Standard E-Commerce Logistics</span><span>Page 3</span></div>
        <div class="toc-entry"><span><strong>09.</strong> Risk Mitigation Register</span><span>Page 6</span></div>
        <div class="toc-entry"><span><strong>05.</strong> Hyperlocal Grocery (Bhopal)</span><span>Page 3</span></div>
        <div class="toc-entry"><span><strong>10.</strong> Strategic Recommendations</span><span>Page 6</span></div>
      </div>
    </div>

    <!-- 01 EXECUTIVE SUMMARY -->
    <div class="avoid-break">
      <div class="sec-tag">Section 01</div>
      <h2>Executive Summary</h2>
      <p>
        Intrust India currently manages order dispatch manually: merchants self-fulfill and manually copy-paste tracking numbers into the admin panel. To support multi-vendor expansion and enable <strong>same-day local grocery delivery</strong> across Bhopal alongside <strong>pan-India shipping</strong> for fashion/electronics, this proposal outlines an automated API-driven logistics infrastructure.
      </p>

      <div class="kpi-row">
        <div class="kpi-box">
          <div class="kpi-title">Recommended Approach</div>
          <div class="kpi-number">2-Provider Stack</div>
          <div class="kpi-desc">Shiprocket (National) + Shadowfax (Bhopal)</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-title">Total Dev Investment</div>
          <div class="kpi-number">&#8377;80K &ndash; 1.2 Lakh</div>
          <div class="kpi-desc">18&ndash;21 days across 2 phased milestones</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-title">Shipping Cost Recovery</div>
          <div class="kpi-number">100% Recoverable</div>
          <div class="kpi-desc">Standard checkout delivery fees offset couriers</div>
        </div>
      </div>

      <div class="callout success">
        <strong>Architecture Feasibility:</strong> Intrust's Supabase database schema already contains the necessary tracking fields, delivery status enums, and update RPCs. Integration is purely additive with zero core database refactoring required.
      </div>
    </div>
  </div>

  <!-- ==================== PAGE 2: ARCHITECTURE & DELIVERY MODELS ==================== -->
  <div class="page-section">
    <!-- 02 ARCHITECTURE -->
    <div class="avoid-break">
      <div class="sec-tag">Section 02</div>
      <h2>Current Architecture Assessment</h2>
      <p>
        The platform utilizes Next.js 14 App Router and a Supabase PostgreSQL backend on a dedicated VPS. The existing database structure is already primed to receive courier API integration:
      </p>

      <!-- FLOW -->
      <div class="flow-container">
        <div class="flow-box">1. Customer Order Placed</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-box">2. Merchant Packs Order</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-box active-box">3. Courier API Dispatch<br>[NEW]</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-box active-box">4. Webhook Listener<br>[NEW]</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-box">5. DB RPC Status Update</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-box">6. WhatsApp Notification</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 26%;">Existing Asset</th>
            <th style="width: 40%;">Database Location / API Route</th>
            <th style="width: 34%;">Delivery API Mapping</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Delivery Status Enum</strong></td>
            <td><code>shopping_order_groups.delivery_status</code></td>
            <td><span class="badge b-green">Maps directly</span> to partner tracking states</td>
          </tr>
          <tr>
            <td><strong>Tracking Identifier</strong></td>
            <td><code>shopping_order_groups.tracking_number</code></td>
            <td><span class="badge b-green">Auto-stores</span> courier AWB / Waybill ID</td>
          </tr>
          <tr>
            <td><strong>Estimated Delivery</strong></td>
            <td><code>shopping_order_groups.estimated_delivery_at</code></td>
            <td><span class="badge b-green">Auto-populated</span> via courier SLA response</td>
          </tr>
          <tr>
            <td><strong>Status Update RPC</strong></td>
            <td><code>update_order_delivery_v3()</code></td>
            <td><span class="badge b-green">Invoked by Webhook</span> with idempotency</td>
          </tr>
          <tr>
            <td><strong>Customer WhatsApp Alerts</strong></td>
            <td><code>/api/orders/[orderId]/status/route.js</code></td>
            <td><span class="badge b-green">Fires automatically</span> on shipped/delivered milestones</td>
          </tr>
          <tr>
            <td><strong>Product Routing Tag</strong></td>
            <td><code>products.delivery_type</code> (standard vs. hyperlocal)</td>
            <td><span class="badge b-orange">Additive column</span> to route grocery vs. standard carts</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 03 DELIVERY MODELS -->
    <div class="avoid-break" style="margin-top: 10px;">
      <div class="sec-tag">Section 03</div>
      <h2>Delivery Models: Two Distinct Operating Strategies</h2>
      <p>
        Intrust operates a multi-vendor marketplace where different product types require distinct logistics patterns:
      </p>

      <div class="grid-2">
        <div class="card top-choice">
          <div class="card-head">
            <span class="card-title">Model A: Merchant Direct Pickup</span>
            <span class="badge b-green">Recommended</span>
          </div>
          <div class="card-sub">On-Demand Pickup from Merchant's Local Store / Outlet</div>
          <ul>
            <li class="pro">Zero warehouse capital or physical lease expenditure required.</li>
            <li class="pro">Courier rider dispatched directly to merchant store upon &ldquo;Pack &amp; Ship&rdquo;.</li>
            <li class="pro">Delivers groceries in 2&ndash;4 hours locally, and standard goods in 1&ndash;3 days.</li>
            <li class="pro">Seamlessly fits current multi-vendor merchant architecture.</li>
          </ul>
          <div class="card-rate">
            <span>Fulfilment SLA:</span>
            <strong>2 &ndash; 24 Hours</strong>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <span class="card-title">Model B: Centralized Dark Store</span>
            <span class="badge b-gray">Future Phase</span>
          </div>
          <div class="card-sub">Quick-Commerce Central Micro-Warehouse (Blinkit / Zepto Style)</div>
          <ul>
            <li class="con">Requires dedicated warehouse lease, racking, and cold storage in Bhopal.</li>
            <li class="con">Requires stock ownership, upfront working capital, and expiry management.</li>
            <li class="con">High initial Capex barrier (&#8377;15L &ndash; 30L minimum setup cost).</li>
            <li class="pro">Enables ultra-fast 15&ndash;30 minute delivery once scale exceeds 1,000 orders/day.</li>
          </ul>
          <div class="card-rate">
            <span>Recommended For:</span>
            <strong>Scale Stage (Phase 3+)</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== PAGE 3: PROVIDER COMPARISONS ==================== -->
  <div class="page-section">
    <!-- 04 STANDARD E-COMMERCE -->
    <div class="avoid-break">
      <div class="sec-tag">Section 04</div>
      <h2>Standard E-Commerce Logistics (Pan-India)</h2>
      <p>
        For non-perishable goods (fashion, electronics, dry goods). Couriers pick up from Bhopal merchants and deliver nationwide.
      </p>

      <div class="grid-2">
        <div class="card top-choice">
          <div class="card-head">
            <span class="card-title">Shiprocket (Aggregator)</span>
            <span class="badge b-green">&#9733; Recommended</span>
          </div>
          <div class="card-sub">Single API covering 25+ couriers (Delhivery, BlueDart, DTDC, Ekart)</div>
          <ul>
            <li class="pro">Single master contract &amp; unified wallet for all national carriers.</li>
            <li class="pro">Smart AI recommendation picks best rate/speed courier per pincode.</li>
            <li class="pro">Automated Non-Delivery Report (NDR) engine reduces costly RTO losses.</li>
            <li class="pro">Robust developer sandbox, webhooks, and automated label generation.</li>
          </ul>
          <div class="card-rate">
            <span>Platform Fee: <strong>&#8377;499 &ndash; 799 / mo</strong></span>
            <span>Rate: <strong>&#8377;40 &ndash; 110 / 500g</strong></span>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <span class="card-title">Delhivery (Direct Carrier)</span>
            <span class="badge b-gray">Enterprise</span>
          </div>
          <div class="card-sub">Direct contract with India's largest integrated logistics player</div>
          <ul>
            <li class="pro">Extensive tier-2/3 network reach and dedicated fleet coverage.</li>
            <li class="pro">Volume discounts of 20&ndash;35% once exceeding 3,000+ orders/month.</li>
            <li class="con">Direct B2B contract requires volume commitments and enterprise negotiation.</li>
            <li class="con">Single carrier risk; no automated failover if local hubs experience backlogs.</li>
          </ul>
          <div class="card-rate">
            <span>Platform Fee: <strong>Custom Contract</strong></span>
            <span>Rate: <strong>Negotiated SLA</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 05 HYPERLOCAL GROCERY -->
    <div class="avoid-break" style="margin-top: 10px;">
      <div class="sec-tag">Section 05</div>
      <h2>Hyperlocal Logistics: Bhopal Grocery &amp; Same-Day</h2>
      <p>
        Grocery and perishable goods require dedicated 2-wheeler fleets with sub-4-hour SLAs across Bhopal (MP Nagar, Arera Colony, Kolar Road, Hoshangabad Road, Indrapuri).
      </p>

      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Fleet &amp; Bhopal Reach</th>
            <th>Delivery SLA</th>
            <th>Proof of Delivery</th>
            <th>Rate Model</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr class="featured-row">
            <td><strong>Shadowfax Hyperlocal</strong></td>
            <td>Established fleet operating across all major Bhopal zones</td>
            <td>2 &ndash; 4 Hours<br>(Same-day guaranteed)</td>
            <td><span class="badge b-green">Customer OTP</span></td>
            <td>Contract-based<br>(&#8377;50 &ndash; 80 / drop)</td>
            <td><span class="badge b-green">Top Pick</span><br>Powers Blinkit/Zepto</td>
          </tr>
          <tr>
            <td><strong>Pinified</strong></td>
            <td>Bhopal-native on-demand network with dedicated local riders</td>
            <td>1 &ndash; 4 Hours<br>(Instant dispatch)</td>
            <td>App confirmation</td>
            <td>Transparent rate<br>(&#8377;52 base up to 5km)</td>
            <td><span class="badge b-blue">Strong Alternative</span><br>Zero contract friction</td>
          </tr>
          <tr>
            <td><strong>Shiprocket Quick</strong></td>
            <td>Hyperlocal module bundling Dunzo, Shadowfax, Borzo</td>
            <td>Same-Day<br>(Rider dependent)</td>
            <td>Courier dependent</td>
            <td>Dynamic distance<br>(&#8377;10+ / km)</td>
            <td><span class="badge b-gray">Convenient</span><br>Variable rider density</td>
          </tr>
          <tr>
            <td><strong>Adloggs</strong></td>
            <td>AI-driven dispatch OS connecting local logistics providers</td>
            <td>2 &ndash; 4 Hours</td>
            <td><span class="badge b-green">OTP / Photo</span></td>
            <td>Quote based</td>
            <td><span class="badge b-gray">Emerging</span><br>Bhopal active</td>
          </tr>
        </tbody>
      </table>

      <div class="callout info">
        <strong>Grocery Strategy:</strong> Execute a corporate agreement with Shadowfax as primary carrier for Bhopal grocery orders. Simultaneously maintain Pinified as an active secondary provider for immediate rate-card fallback.
      </div>
    </div>
  </div>

  <!-- ==================== PAGE 4: LOGISTICS PRICING & COST ANALYSIS ==================== -->
  <div class="page-section">
    <div class="avoid-break">
      <div class="sec-tag">Section 06</div>
      <h2>Logistics Pricing &amp; Operational Cost Analysis</h2>
      <p>
        A comprehensive breakdown of per-shipment commercial rate cards and monthly operational expenditure models:
      </p>

      <!-- RATE CARDS GRID -->
      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <span class="card-title">Standard E-Commerce Rate Card (Shiprocket)</span>
          </div>
          <table>
            <thead><tr><th>Weight &amp; Destination Zone</th><th>Indicative Cost</th></tr></thead>
            <tbody>
              <tr><td>500g &bull; Local Bhopal intra-city</td><td>&#8377;40 &ndash; 55</td></tr>
              <tr><td>500g &bull; Regional (MP &amp; neighboring states)</td><td>&#8377;60 &ndash; 80</td></tr>
              <tr><td>500g &bull; Metro to Metro (Pan-India)</td><td>&#8377;80 &ndash; 110</td></tr>
              <tr><td>Additional 500g slab</td><td>&#8377;35 &ndash; 50</td></tr>
              <tr><td>Cash-on-Delivery (COD) surcharge</td><td>&#8377;40 &ndash; 50 or 1.5%</td></tr>
              <tr><td>Return to Origin (RTO on failed delivery)</td><td>&#8377;40 &ndash; 80</td></tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-head">
            <span class="card-title">Hyperlocal Grocery Rate Card (Bhopal)</span>
          </div>
          <table>
            <thead><tr><th>Delivery Distance (Store to Door)</th><th>Indicative Cost</th></tr></thead>
            <tbody>
              <tr><td>0 &ndash; 5 km (Core Neighborhood)</td><td>&#8377;52 &ndash; 65</td></tr>
              <tr><td>5 &ndash; 10 km (Inter-zone Bhopal)</td><td>&#8377;75 &ndash; 90</td></tr>
              <tr><td>10 &ndash; 20 km (Outer Bhopal suburbs)</td><td>&#8377;110 &ndash; 130</td></tr>
              <tr><td>Shadowfax B2B Base (Contract)</td><td>&#8377;50 &ndash; 80 flat</td></tr>
              <tr><td>3-Wheeler Heavy/Bulk Grocery (>15kg)</td><td>+25% to 35%</td></tr>
              <tr><td>Peak Hour / Rain Surcharge</td><td>10% to 15%</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MONTHLY PROJECTION -->
      <h3 style="margin-top: 10px;">Monthly Logistics Expenditure Projection (500 Orders / Month)</h3>
      <table>
        <thead>
          <tr>
            <th>Order Classification</th>
            <th>Monthly Volume</th>
            <th>Avg. Cost / Order</th>
            <th>Logistics Outlay</th>
            <th>Platform SaaS Fee</th>
            <th>Net Monthly Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Standard Goods (Shiprocket)</strong></td>
            <td>400 shipments</td>
            <td>&#8377;75.00</td>
            <td>&#8377;30,000</td>
            <td>&#8377;799 (Pro Plan)</td>
            <td><strong>&#8377;30,799</strong></td>
          </tr>
          <tr>
            <td><strong>Grocery Hyperlocal (Shadowfax)</strong></td>
            <td>100 deliveries</td>
            <td>&#8377;70.00</td>
            <td>&#8377;7,000</td>
            <td>&#8377;0 (Direct Contract)</td>
            <td><strong>&#8377;7,000</strong></td>
          </tr>
          <tr class="featured-row">
            <td><strong>Total Combined Operations</strong></td>
            <td><strong>500 orders</strong></td>
            <td><strong>&#8377;74.00 (avg.)</strong></td>
            <td><strong>&#8377;37,000</strong></td>
            <td><strong>&#8377;799</strong></td>
            <td><strong>&#8377;37,799 / month</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="callout success">
        <strong>100% Cost Recovery Strategy:</strong> Standard Indian e-commerce practice charges consumers a nominal delivery fee (e.g., flat &#8377;49 on orders under &#8377;499, and free shipping on orders above &#8377;499). At an average collected shipping fee of &#8377;65 across orders, Intrust generates &#8377;32,500/month in shipping revenue, reducing net platform delivery expense to under &#8377;5,300/month.
      </div>
    </div>
  </div>

  <!-- ==================== PAGE 5: DEVELOPMENT EFFORT & BUDGET ==================== -->
  <div class="page-section">
    <div class="avoid-break">
      <div class="sec-tag">Section 07</div>
      <h2>Integration Cost &amp; Engineering Investment</h2>
      <p>
        Engineering work breakdown structure to develop, test, and productionize the automated logistics pipeline:
      </p>

      <table>
        <thead>
          <tr>
            <th>Engineering Workstream</th>
            <th>Scope of Work</th>
            <th>Effort</th>
            <th>Cost Estimate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Shiprocket API Client</strong></td>
            <td>Auth token caching, order creation, rate quotes, shipping label PDF fetch</td>
            <td>3 &ndash; 4 Days</td>
            <td>&#8377;12,000 &ndash; 18,000</td>
          </tr>
          <tr>
            <td><strong>Webhook Handler &amp; Sync</strong></td>
            <td>HMAC verification, status parsing, invocation of <code>update_order_delivery_v3()</code></td>
            <td>2 &ndash; 3 Days</td>
            <td>&#8377;8,000 &ndash; 12,000</td>
          </tr>
          <tr>
            <td><strong>Hyperlocal Grocery Adapter</strong></td>
            <td>Shadowfax/Pinified client, rider dispatch, address geo-tagging, OTP workflow</td>
            <td>3 &ndash; 4 Days</td>
            <td>&#8377;12,000 &ndash; 18,000</td>
          </tr>
          <tr>
            <td><strong>Product Delivery Tagging</strong></td>
            <td>Schema migration + cart routing (standard pan-India vs. local grocery)</td>
            <td>1 &ndash; 2 Days</td>
            <td>&#8377;4,000 &ndash; 8,000</td>
          </tr>
          <tr>
            <td><strong>Merchant Dashboard &ldquo;Ship&rdquo; UI</strong></td>
            <td>Replaces manual tracking number input with 1-click &ldquo;Pack &amp; Ship&rdquo; button</td>
            <td>2 &ndash; 3 Days</td>
            <td>&#8377;8,000 &ndash; 12,000</td>
          </tr>
          <tr>
            <td><strong>Customer Tracking Widget</strong></td>
            <td>Live milestone timeline showing courier status and external tracking link</td>
            <td>2 Days</td>
            <td>&#8377;6,000 &ndash; 10,000</td>
          </tr>
          <tr>
            <td><strong>Idempotency &amp; Error Guards</strong></td>
            <td>Duplicate shipment protection, webhook retry dead-letter queues</td>
            <td>2 Days</td>
            <td>&#8377;6,000 &ndash; 10,000</td>
          </tr>
          <tr>
            <td><strong>Testing, Sandbox &amp; QA</strong></td>
            <td>Sandbox courier verification, WhatsApp alert regression testing, edge cases</td>
            <td>3 Days</td>
            <td>&#8377;10,000 &ndash; 15,000</td>
          </tr>
          <tr class="featured-row">
            <td><strong>Total Engineering Scope</strong></td>
            <td><strong>Full 2-Provider Logistics Engine</strong></td>
            <td><strong>18 &ndash; 21 Days</strong></td>
            <td><strong>&#8377;66,000 &ndash; 1,03,000</strong></td>
          </tr>
        </tbody>
      </table>

      <!-- PACKAGES -->
      <div class="grid-2" style="margin-top: 10px;">
        <div class="card">
          <div class="card-head">
            <span class="card-title">Phase 1: Standard E-Commerce Only</span>
          </div>
          <div class="card-sub">Automates pan-India delivery via Shiprocket (10&ndash;12 Days)</div>
          <p style="font-size: 8.2pt; color: #475569; margin: 4px 0;">Automates 25+ couriers, AWB creation, label printing, and webhook status syncing for all non-grocery orders.</p>
          <div class="card-rate">
            <span>Dev Investment:</span>
            <strong>&#8377;40,000 &ndash; 60,000</strong>
          </div>
        </div>

        <div class="card top-choice">
          <div class="card-head">
            <span class="card-title">Phases 1 + 2: Complete Delivery Suite</span>
            <span class="badge b-green">Full Scope</span>
          </div>
          <div class="card-sub">Automates both national shipping &amp; Bhopal grocery delivery (18&ndash;21 Days)</div>
          <p style="font-size: 8.2pt; color: #475569; margin: 4px 0;">Adds Shadowfax/Pinified hyperlocal routing, OTP verification, and multi-vendor delivery logic.</p>
          <div class="card-rate">
            <span>Dev Investment:</span>
            <strong>&#8377;80,000 &ndash; 1,20,000</strong>
          </div>
        </div>
      </div>

      <div class="callout info" style="margin-top: 8px;">
        <strong>Annual System Maintenance:</strong> We advise budgeting approximately 20% of initial dev cost (~&#8377;15,000 &ndash; 25,000 / year) to accommodate upstream carrier API schema updates, security token refreshes, and seasonal peak monitoring.
      </div>
    </div>
  </div>

  <!-- ==================== PAGE 6: ROADMAP, RISKS & FINAL RECOMMENDATIONS ==================== -->
  <div class="page-section">
    <!-- 08 TIMELINE -->
    <div class="avoid-break">
      <div class="sec-tag">Section 08</div>
      <h2>Phased Rollout Roadmap (5 Weeks)</h2>

      <div class="tl-row">
        <div class="tl-icon">1</div>
        <div class="tl-body">
          <div class="tl-header">Week 1 &bull; Days 1 &ndash; 5</div>
          <div class="tl-heading">Account Setup &amp; Shiprocket Client Module</div>
          <p class="tl-text">Register Shiprocket Advanced account, configure sandbox API tokens, build authentication and shipment generation modules.</p>
        </div>
      </div>

      <div class="tl-row">
        <div class="tl-icon">2</div>
        <div class="tl-body">
          <div class="tl-header">Week 2 &bull; Days 6 &ndash; 10</div>
          <div class="tl-heading">Webhook Synchronization &amp; Merchant UI</div>
          <p class="tl-text">Build webhook listener connected to <code>update_order_delivery_v3()</code>; replace manual tracking inputs with 1-click &ldquo;Pack &amp; Ship&rdquo; button in merchant admin.</p>
        </div>
      </div>

      <div class="tl-row">
        <div class="tl-icon">3</div>
        <div class="tl-body">
          <div class="tl-header">Week 3 &bull; Days 11 &ndash; 14</div>
          <div class="tl-heading">Customer Tracking UI &amp; Phase 1 Production Go-Live</div>
          <p class="tl-text">Launch live customer tracking page, verify automated WhatsApp notifications, and deploy Phase 1 to production for standard e-commerce orders.</p>
        </div>
      </div>

      <div class="tl-row">
        <div class="tl-icon">4</div>
        <div class="tl-body">
          <div class="tl-header">Weeks 4 &ndash; 5 &bull; Days 15 &ndash; 21</div>
          <div class="tl-heading">Hyperlocal Grocery Integration &amp; Dual-Routing</div>
          <p class="tl-text">Deploy Shadowfax/Pinified hyperlocal adapter, configure delivery category tags on grocery items, test OTP delivery confirmation, and launch full suite.</p>
        </div>
      </div>
    </div>

    <!-- 09 RISKS -->
    <div class="avoid-break" style="margin-top: 8px;">
      <div class="sec-tag">Section 09</div>
      <h2>Risk Management &amp; Mitigation Strategy</h2>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <span class="card-title" style="font-size: 8.8pt;">Return to Origin (RTO) on COD</span>
            <span class="badge b-orange">Medium Risk</span>
          </div>
          <p style="font-size: 8pt; margin: 2px 0 0 0;"><strong>Mitigation:</strong> WhatsApp OTP order confirmation before packing, mandatory landmark field at checkout, and automated Shiprocket NDR re-attempt workflows.</p>
        </div>

        <div class="card">
          <div class="card-head">
            <span class="card-title" style="font-size: 8.8pt;">Bhopal Peak Hour Rider Delays</span>
            <span class="badge b-orange">Medium Risk</span>
          </div>
          <p style="font-size: 8pt; margin: 2px 0 0 0;"><strong>Mitigation:</strong> Dual carrier setup: Shadowfax as primary contract carrier with Pinified configured as instant rate-card fallback during fleet crunches.</p>
        </div>

        <div class="card">
          <div class="card-head">
            <span class="card-title" style="font-size: 8.8pt;">Duplicate Shipments on Retries</span>
            <span class="badge b-green">Low Risk</span>
          </div>
          <p style="font-size: 8pt; margin: 2px 0 0 0;"><strong>Mitigation:</strong> Idempotency keys using internal <code>order_id</code>; query existing AWB before invoking booking API on retry attempts.</p>
        </div>

        <div class="card">
          <div class="card-head">
            <span class="card-title" style="font-size: 8.8pt;">Carrier API Schema Changes</span>
            <span class="badge b-green">Low Risk</span>
          </div>
          <p style="font-size: 8pt; margin: 2px 0 0 0;"><strong>Mitigation:</strong> Isolate external API payloads behind standardized internal contract adapters; reserve 20% annual maintenance budget.</p>
        </div>
      </div>
    </div>

    <!-- 10 RECOMMENDATIONS -->
    <div class="avoid-break" style="margin-top: 8px;">
      <div class="sec-tag">Section 10</div>
      <h2>Final Recommendation &amp; Immediate Next Steps</h2>

      <div class="callout success">
        <strong>Strategic Summary:</strong> We recommend proceeding with the <strong>two-phase execution plan</strong>:
        <ul style="margin-top: 3px; padding-left: 14px;">
          <li><strong>Phase 1 (Weeks 1&ndash;3):</strong> Automate pan-India standard shipping via <strong>Shiprocket</strong> (fastest ROI, eliminates manual tracking entry).</li>
          <li><strong>Phase 2 (Weeks 4&ndash;5):</strong> Activate <strong>Shadowfax / Pinified</strong> for Bhopal grocery items (sub-4-hour local delivery).</li>
        </ul>
      </div>

      <table>
        <thead>
          <tr>
            <th>Immediate Action Item</th>
            <th>Stakeholder</th>
            <th>Requirement</th>
            <th>Timeline</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1. Shiprocket Business Account Registration</td>
            <td>Business Operations</td>
            <td>Company GST &amp; KYC Documentation</td>
            <td>1 &ndash; 2 Days</td>
          </tr>
          <tr>
            <td>2. Shadowfax Corporate Outreach</td>
            <td>Business Operations</td>
            <td>Bhopal Volume Projection (50&ndash;100 drops/mo)</td>
            <td>2 &ndash; 3 Days</td>
          </tr>
          <tr>
            <td>3. Engineering Sprint 1 Kickoff</td>
            <td>Engineering Team</td>
            <td>Client Proposal Approval</td>
            <td>Upon Signoff</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</body>
</html>
`;

// Target directories and files
const projectDir = '/home/i4yush/Desktop/intrust-india';
const docsDir = path.join(projectDir, 'docs');
const htmlPath = path.join(docsDir, 'delivery_api_proposal.html');
const pdfPathUpper = path.join(docsDir, 'DELIVERY_API_INTEGRATION_PROPOSAL.pdf');
const pdfPathLower = path.join(docsDir, 'delivery_api_proposal.pdf');

// Ensure docs directory exists
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// 1. Write HTML file
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Successfully wrote HTML to:', htmlPath);

// 2. Launch Chromium and generate A4 PDF with native header/footer
(async () => {
  console.log('Launching browser to generate A4 PDF...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(html, { waitUntil: 'networkidle' });

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 7pt; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; color: #475569; font-family: -apple-system, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        <span>Intrust India &bull; Delivery API Integration Strategy &amp; Cost Proposal</span>
        <span>Confidential</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 7pt; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; color: #64748b; font-family: -apple-system, sans-serif; border-top: 1px solid #cbd5e1; padding-top: 3px;">
        <span>For Client Review Only &bull; September 2026</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '14mm',
      bottom: '15mm',
      left: '14mm',
      right: '14mm'
    },
    printBackground: true,
    preferCSSPageSize: true
  });

  fs.writeFileSync(pdfPathUpper, pdfBuffer);
  fs.writeFileSync(pdfPathLower, pdfBuffer);
  console.log('Successfully generated PDF at:', pdfPathUpper);
  console.log('Successfully generated PDF at:', pdfPathLower);

  await browser.close();
  console.log('PDF generation finished successfully!');
})();
