const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Delivery API Integration Strategy & Cost Proposal — Intrust India</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.55;
      color: #0f172a;
      background: #ffffff;
    }
    .page-break {
      break-before: page;
      page-break-before: always;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* Header / Footer inside content */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 18px;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
      font-weight: 600;
    }
    .doc-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #64748b;
    }

    /* Cover Styling - White background, executive borders, 100% ink & B&W safe */
    .cover-container {
      border: 2px solid #0f172a;
      border-left: 8px solid #1e3a8a;
      border-radius: 8px;
      padding: 36px 32px;
      background: #ffffff;
      margin-bottom: 24px;
    }
    .cover-badge {
      display: inline-block;
      border: 1.5px solid #1e3a8a;
      color: #1e3a8a;
      background: #eff6ff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .cover-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 10px;
    }
    .cover-subtitle {
      font-size: 13px;
      color: #334155;
      line-height: 1.5;
      margin-bottom: 24px;
      max-width: 680px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
    .meta-item label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 3px;
    }
    .meta-item span {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Section Headings */
    .sec {
      margin-bottom: 24px;
    }
    .sec-num {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #1e3a8a;
      margin-bottom: 3px;
    }
    h2 {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h3 {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    p {
      color: #334155;
      margin-bottom: 8px;
    }

    /* Highlights & KPI Box */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 14px 0;
    }
    .kpi-card {
      border: 1.5px solid #cbd5e1;
      border-top: 4px solid #1e3a8a;
      border-radius: 6px;
      padding: 12px 14px;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
      margin-bottom: 4px;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .kpi-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 3px;
    }

    /* Callout Boxes */
    .callout {
      border: 1.5px solid #cbd5e1;
      border-left: 4px solid #1e3a8a;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 4px;
      margin: 10px 0;
      font-size: 11px;
    }
    .callout.warning {
      border-color: #d97706;
      border-left-color: #d97706;
      background: #fffbeb;
      color: #78350f;
    }
    .callout.success {
      border-color: #059669;
      border-left-color: #059669;
      background: #f0fdf4;
      color: #064e3b;
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
      margin: 10px 0;
      font-size: 10.5px;
    }
    th, td {
      padding: 7px 9px;
      text-align: left;
      border: 1px solid #cbd5e1;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    tr.highlight-row {
      background: #eff6ff;
      font-weight: 700;
    }

    /* Badges / Tags */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      line-height: 1.2;
      border: 1px solid transparent;
    }
    .badge-success {
      background: #ecfdf5;
      color: #065f46;
      border-color: #059669;
    }
    .badge-info {
      background: #eff6ff;
      color: #1e40af;
      border-color: #2563eb;
    }
    .badge-warning {
      background: #fffbeb;
      color: #92400e;
      border-color: #d97706;
    }
    .badge-danger {
      background: #fef2f2;
      color: #991b1b;
      border-color: #dc2626;
    }
    .badge-neutral {
      background: #f1f5f9;
      color: #334155;
      border-color: #64748b;
    }

    /* Cards Grid */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 10px 0;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 10px 0;
    }
    .card {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .card.featured {
      border-color: #1e3a8a;
      border-width: 2px;
      background: #f8fafc;
    }
    .card-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-subtitle {
      font-size: 10px;
      color: #475569;
      margin-bottom: 8px;
    }
    .card ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .card li {
      font-size: 10.5px;
      color: #334155;
      margin-bottom: 4px;
      padding-left: 14px;
      position: relative;
    }
    .card li::before {
      content: "•";
      position: absolute;
      left: 2px;
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
    .card-footer-metric {
      border-top: 1px solid #e2e8f0;
      margin-top: 10px;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .metric-val {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }

    /* Workflow Diagram */
    .flow-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 12px 0;
      flex-wrap: wrap;
    }
    .flow-node {
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 10px;
      font-weight: 700;
      text-align: center;
      color: #1e293b;
      min-width: 90px;
    }
    .flow-node.active {
      border-color: #1e3a8a;
      background: #eff6ff;
      color: #1e3a8a;
    }
    .flow-arrow {
      color: #64748b;
      font-weight: 800;
      font-size: 14px;
    }

    /* Timeline */
    .timeline-item {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }
    .timeline-badge {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid #1e3a8a;
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 800;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .timeline-content {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      background: #ffffff;
      flex: 1;
    }
    .timeline-meta {
      font-size: 9.5px;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .timeline-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 2px 0;
    }

    /* Table of contents box */
    .toc-box {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 14px 18px;
      background: #f8fafc;
      margin-bottom: 24px;
    }
    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      margin-top: 8px;
    }
    .toc-item {
      font-size: 10.5px;
      color: #1e293b;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 2px;
    }
    .toc-item strong {
      color: #1e3a8a;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 1px 4px;
      border-radius: 3px;
      color: #0f172a;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: COVER & EXECUTIVE SUMMARY ==================== -->
  <div>
    <div class="doc-header">
      <span>Intrust India &bull; E-Commerce Logistics Proposal</span>
      <span>Confidential &bull; September 2026</span>
    </div>

    <!-- COVER BOX -->
    <div class="cover-container">
      <div class="cover-badge">Executive Technical Proposal</div>
      <h1 class="cover-title">Delivery API Integration<br>Strategy, Vendor Analysis &amp; Cost Proposal</h1>
      <p class="cover-subtitle">
        A comprehensive evaluation of automated courier integrations for Intrust India's multi-vendor e-commerce platform — covering pan-India logistics, Bhopal hyperlocal same-day delivery for grocery items, technical architecture, and transparent cost projections.
      </p>
      <div class="meta-grid">
        <div class="meta-item">
          <label>Prepared For</label>
          <span>Intrust India Management</span>
        </div>
        <div class="meta-item">
          <label>Prepared By</label>
          <span>Technical Architecture Team</span>
        </div>
        <div class="meta-item">
          <label>Target Geography</label>
          <span>Bhopal, MP &amp; Pan-India</span>
        </div>
        <div class="meta-item">
          <label>Document Version</label>
          <span>v1.0 (Client Review)</span>
        </div>
      </div>
    </div>

    <!-- TABLE OF CONTENTS -->
    <div class="toc-box avoid-break">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em;">Table of Contents</div>
      <div class="toc-grid">
        <div class="toc-item"><span><strong>01.</strong> Executive Summary</span><span>Sec. 1</span></div>
        <div class="toc-item"><span><strong>06.</strong> Pricing &amp; Cost Analysis</span><span>Sec. 6</span></div>
        <div class="toc-item"><span><strong>02.</strong> Current Architecture Assessment</span><span>Sec. 2</span></div>
        <div class="toc-item"><span><strong>07.</strong> Development Investment</span><span>Sec. 7</span></div>
        <div class="toc-item"><span><strong>03.</strong> Fulfilment Delivery Models</span><span>Sec. 3</span></div>
        <div class="toc-item"><span><strong>08.</strong> Phased Rollout Timeline</span><span>Sec. 8</span></div>
        <div class="toc-item"><span><strong>04.</strong> Standard E-Commerce Logistics</span><span>Sec. 4</span></div>
        <div class="toc-item"><span><strong>09.</strong> Risk Management Matrix</span><span>Sec. 9</span></div>
        <div class="toc-item"><span><strong>05.</strong> Hyperlocal Grocery (Bhopal)</span><span>Sec. 5</span></div>
        <div class="toc-item"><span><strong>10.</strong> Strategic Recommendations</span><span>Sec. 10</span></div>
      </div>
    </div>

    <!-- 01 EXECUTIVE SUMMARY -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 01</div>
      <h2>Executive Summary</h2>
      <p>
        Currently, Intrust India operates on a manual fulfilment workflow: merchants prepare packages, manually enter status updates, and copy-paste tracking numbers. To support rapid merchant onboarding, eliminate operational bottlenecks, and fulfill grocery orders within hours, we recommend transitioning to an <strong>automated API-driven two-provider logistics strategy</strong>.
      </p>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Recommended Approach</div>
          <div class="kpi-val">2-Provider Stack</div>
          <div class="kpi-sub">Shiprocket (Pan-India) + Shadowfax / Pinified (Local)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">One-Time Dev Budget</div>
          <div class="kpi-val">&#8377;80,000 &ndash; 1.2 Lakh</div>
          <div class="kpi-sub">Full 2-phase build across 18&ndash;21 working days</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Logistics Cost Recovery</div>
          <div class="kpi-val">100% Recoverable</div>
          <div class="kpi-sub">Customer checkout delivery fee covers courier cost</div>
        </div>
      </div>

      <div class="callout success">
        <strong>Strategic Feasibility:</strong> Intrust's backend database already contains the requisite schema columns and status update RPCs. No foundational redesign is required; the integration is purely additive, minimizing downtime and development risk.
      </div>
    </div>

    <div class="doc-footer">
      <span>Intrust India &bull; Delivery API Integration Proposal</span>
      <span>Page 1</span>
    </div>
  </div>

  <!-- ==================== PAGE 2: ARCHITECTURE & DELIVERY MODELS ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span>Intrust India &bull; E-Commerce Logistics Proposal</span>
      <span>Architecture &amp; Fulfilment Strategy</span>
    </div>

    <!-- 02 ARCHITECTURE -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 02</div>
      <h2>Current Architecture Assessment</h2>
      <p>
        Intrust operates on Next.js 14 App Router connected to a Supabase PostgreSQL backend on a dedicated VPS. The existing order and delivery infrastructure is structured as follows:
      </p>

      <!-- FLOW -->
      <div class="flow-wrap">
        <div class="flow-node">1. Customer Order Placed</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-node">2. Merchant Packs Order</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-node active">3. Courier API Dispatch [NEW]</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-node active">4. Webhook Ingest [NEW]</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-node">5. DB RPC Status Update</div>
        <div class="flow-arrow">&rarr;</div>
        <div class="flow-node">6. WhatsApp Notification</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Component</th>
            <th style="width: 40%;">Database Location / Code Route</th>
            <th style="width: 35%;">Logistics API Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Delivery Status Enum</strong></td>
            <td><code>shopping_order_groups.delivery_status</code><br>(<code>pending</code>, <code>packed</code>, <code>shipped</code>, <code>delivered</code>, etc.)</td>
            <td><span class="badge badge-success">Direct 1:1 Mapping</span> to partner status codes</td>
          </tr>
          <tr>
            <td><strong>Tracking Identifier</strong></td>
            <td><code>shopping_order_groups.tracking_number</code></td>
            <td><span class="badge badge-success">Auto-Populated</span> with courier AWB / Waybill ID</td>
          </tr>
          <tr>
            <td><strong>Estimated Delivery</strong></td>
            <td><code>shopping_order_groups.estimated_delivery_at</code></td>
            <td><span class="badge badge-success">Dynamic ETA</span> calculated from partner SLA</td>
          </tr>
          <tr>
            <td><strong>Status Update RPC</strong></td>
            <td><code>update_order_delivery_v3()</code></td>
            <td><span class="badge badge-success">Triggered by Webhook</span> with full idempotency</td>
          </tr>
          <tr>
            <td><strong>WhatsApp Alerts</strong></td>
            <td><code>/api/orders/[orderId]/status/route.js</code></td>
            <td><span class="badge badge-success">Automated Dispatch</span> on milestone transitions</td>
          </tr>
          <tr>
            <td><strong>Product Routing Tag</strong></td>
            <td><code>products.delivery_type</code> (standard vs. hyperlocal)</td>
            <td><span class="badge badge-warning">Required Addition</span> for routing grocery vs. general goods</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 03 DELIVERY MODELS -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 03</div>
      <h2>Delivery Models: Two Distinct Operating Strategies</h2>
      <p>
        Intrust handles two distinct classes of products that require fundamentally different fulfilment models:
      </p>

      <div class="grid-2">
        <div class="card featured">
          <div class="card-title">
            <span>Model A: Merchant Direct Pickup</span>
            <span class="badge badge-success">Recommended Now</span>
          </div>
          <div class="card-subtitle">Hyperlocal &amp; Standard On-Demand Pickup from Merchant Stores</div>
          <ul>
            <li class="pro">Zero warehouse capital or real estate required.</li>
            <li class="pro">Delivery partner rider picks up directly from merchant shop in Bhopal.</li>
            <li class="pro">Supports 2&ndash;4 hour delivery for groceries and 1&ndash;3 days for fashion/electronics.</li>
            <li class="pro">Fits Intrust's current multi-merchant platform architecture immediately.</li>
          </ul>
          <div class="card-footer-metric">
            <span style="font-size: 10px; color: #64748b;">Delivery SLA:</span>
            <span class="metric-val">2 &ndash; 24 Hours</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Model B: Centralized Dark Store</span>
            <span class="badge badge-neutral">Phase 3 Future</span>
          </div>
          <div class="card-subtitle">Zepto / Blinkit Quick-Commerce Micro-Warehouse</div>
          <ul>
            <li class="con">Requires dedicated physical warehouse, cold storage, and lease in Bhopal.</li>
            <li class="con">Requires inventory ownership, stock holding risks, and shelf-life tracking.</li>
            <li class="con">High initial capital requirement (&#8377;15L &ndash; 30L minimum setup).</li>
            <li class="pro">Enables ultra-fast 15&ndash;30 minute delivery if order volume justifies scale.</li>
          </ul>
          <div class="card-footer-metric">
            <span style="font-size: 10px; color: #64748b;">Recommended For:</span>
            <span class="metric-val">Scale Phase (1K+ orders/day)</span>
          </div>
        </div>
      </div>
    </div>

    <div class="doc-footer">
      <span>Intrust India &bull; Delivery API Integration Proposal</span>
      <span>Page 2</span>
    </div>
  </div>

  <!-- ==================== PAGE 3: PROVIDER COMPARISON ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span>Intrust India &bull; E-Commerce Logistics Proposal</span>
      <span>Provider Comparison &amp; Partner Analysis</span>
    </div>

    <!-- 04 STANDARD E-COMMERCE -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 04</div>
      <h2>Standard E-Commerce Logistics: Pan-India</h2>
      <p>
        For non-perishable goods (fashion, electronics, cosmetics, packaged items). Pickups originate from merchant premises in Bhopal and ship anywhere in India.
      </p>

      <div class="grid-2">
        <div class="card featured">
          <div class="card-title">
            <span>Shiprocket (Aggregator)</span>
            <span class="badge badge-success">&#9733; Recommended</span>
          </div>
          <div class="card-subtitle">Single API covering 25+ couriers (Delhivery, BlueDart, DTDC, Ekart)</div>
          <ul>
            <li class="pro">One contract and unified billing for all national courier services.</li>
            <li class="pro">Smart courier recommendation engine selects best rate/speed per pincode.</li>
            <li class="pro">Automated Non-Delivery Report (NDR) workflow reduces costly RTO rates.</li>
            <li class="pro">Comprehensive developer sandbox and clean RESTful webhooks.</li>
            <li class="pro">Platform fee: &#8377;499/mo (Advanced) or &#8377;799/mo (Pro with full API access).</li>
          </ul>
          <div class="card-footer-metric">
            <span style="font-size: 10px; color: #64748b;">Indicative Rate:</span>
            <span class="metric-val">&#8377;40 &ndash; 110 <small style="font-size: 9px; font-weight: normal;">per 500g</small></span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Delhivery (Direct Carrier)</span>
            <span class="badge badge-neutral">Enterprise</span>
          </div>
          <div class="card-subtitle">Direct contractual engagement with India's largest carrier</div>
          <ul>
            <li class="pro">Extensive domestic coverage with high reliability on tier-2/3 routes.</li>
            <li class="pro">Volume discounts available at scale (3,000+ monthly shipments).</li>
            <li class="con">Direct enterprise contract requires sales negotiations and monthly minimums.</li>
            <li class="con">Single carrier dependency; if Delhivery faces local disruption, no auto-failover.</li>
          </ul>
          <div class="card-footer-metric">
            <span style="font-size: 10px; color: #64748b;">Indicative Rate:</span>
            <span class="metric-val">Custom Contract</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 05 HYPERLOCAL / GROCERY -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 05</div>
      <h2>Hyperlocal Logistics: Bhopal Grocery &amp; Same-Day</h2>
      <p>
        Grocery and perishable goods require cold or careful handling, local 2-wheeler fleets, and strict sub-4-hour delivery SLAs across key Bhopal zones (MP Nagar, Arera Colony, Kolar Road, Hoshangabad Road, Indrapuri).
      </p>

      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Fleet Model &amp; Coverage</th>
            <th>Speed / SLA</th>
            <th>Verification</th>
            <th>Pricing Structure</th>
            <th>Evaluation</th>
          </tr>
        </thead>
        <tbody>
          <tr class="highlight-row">
            <td><strong>Shadowfax Hyperlocal</strong></td>
            <td>National quick-commerce fleet operating across all major Bhopal pincodes</td>
            <td>2 &ndash; 4 Hours<br>(Same-day guaranteed)</td>
            <td><span class="badge badge-success">Customer OTP</span></td>
            <td>Custom B2B contract<br>(&#8377;50 &ndash; 80 / delivery)</td>
            <td><span class="badge badge-success">Primary Choice</span><br>Industry standard for grocery</td>
          </tr>
          <tr>
            <td><strong>Pinified</strong></td>
            <td>Bhopal-native on-demand logistics network with dedicated local 2-wheeler riders</td>
            <td>1 &ndash; 4 Hours<br>(Instant dispatch)</td>
            <td>Signature / App confirmation</td>
            <td>Transparent rate card<br>(&#8377;52 base up to 5km)</td>
            <td><span class="badge badge-info">Strong Alternative</span><br>No minimum volume barrier</td>
          </tr>
          <tr>
            <td><strong>Shiprocket Quick</strong></td>
            <td>Hyperlocal aggregation module bundling Dunzo, Shadowfax, and Borzo</td>
            <td>Same-Day<br>(Varies by rider)</td>
            <td>Courier dependent</td>
            <td>Dynamic distance rate<br>(&#8377;10+ / km)</td>
            <td><span class="badge badge-neutral">Unified Account</span><br>Fleet density varies in Bhopal</td>
          </tr>
          <tr>
            <td><strong>Adloggs</strong></td>
            <td>AI dispatch operating system connecting regional courier networks</td>
            <td>2 &ndash; 4 Hours</td>
            <td><span class="badge badge-success">OTP / Photo</span></td>
            <td>Quote based</td>
            <td><span class="badge badge-neutral">Emerging</span><br>Promising technology</td>
          </tr>
        </tbody>
      </table>

      <div class="callout info">
        <strong>Hyperlocal Grocery Recommendation:</strong> Contact Shadowfax sales to obtain a formal Bhopal corporate rate card. In parallel, register with Pinified as an immediate, zero-negotiation option with transparent distance-based billing.
      </div>
    </div>

    <div class="doc-footer">
      <span>Intrust India &bull; Delivery API Integration Proposal</span>
      <span>Page 3</span>
    </div>
  </div>

  <!-- ==================== PAGE 4: COST ANALYSIS & DEV EFFORT ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span>Intrust India &bull; E-Commerce Logistics Proposal</span>
      <span>Financial Projections &amp; Development Effort</span>
    </div>

    <!-- 06 PRICING -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 06</div>
      <h2>Pricing &amp; Operational Cost Projections</h2>
      <p>
        The table below models estimated monthly logistics expenditures across a baseline operational volume of <strong>500 orders/month</strong> (400 standard e-commerce orders + 100 Bhopal grocery orders).
      </p>

      <table>
        <thead>
          <tr>
            <th>Fulfilment Category</th>
            <th>Orders/Mo</th>
            <th>Average Cost / Order</th>
            <th>Monthly Logistics</th>
            <th>Platform Software Fee</th>
            <th>Net Monthly Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Standard Goods (Shiprocket)</strong></td>
            <td>400</td>
            <td>&#8377;75.00</td>
            <td>&#8377;30,000</td>
            <td>&#8377;799 (Pro Plan)</td>
            <td><strong>&#8377;30,799</strong></td>
          </tr>
          <tr>
            <td><strong>Grocery Hyperlocal (Shadowfax)</strong></td>
            <td>100</td>
            <td>&#8377;70.00</td>
            <td>&#8377;7,000</td>
            <td>&#8377;0 (Direct Contract)</td>
            <td><strong>&#8377;7,000</strong></td>
          </tr>
          <tr class="highlight-row">
            <td><strong>Combined Operations</strong></td>
            <td><strong>500</strong></td>
            <td><strong>&#8377;74.00 (avg.)</strong></td>
            <td><strong>&#8377;37,000</strong></td>
            <td><strong>&#8377;799</strong></td>
            <td><strong>&#8377;37,799 / month</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="callout success">
        <strong>Revenue Neutrality Strategy:</strong> Standard Indian e-commerce practice charges consumers a nominal delivery fee (e.g., &#8377;49 for orders under &#8377;499, and free shipping on orders above). At an average recovered fee of &#8377;65 across 500 orders, Intrust collects &#8377;32,500 in shipping revenue, making the net logistics burden less than &#8377;5,300/month.
      </div>
    </div>

    <!-- 07 INTEGRATION DEV COST -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 07</div>
      <h2>Integration Cost &amp; Engineering Effort</h2>
      <p>
        Estimated engineering time and investment to build, test, and deploy the logistics engine.
      </p>

      <table>
        <thead>
          <tr>
            <th>Module / Engineering Deliverable</th>
            <th>Functional Scope</th>
            <th>Effort</th>
            <th>Budget Bracket</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Shiprocket Adapter Client</strong></td>
            <td>Authentication, order dispatch API, AWB generator, shipping label PDF fetch</td>
            <td>3 &ndash; 4 Days</td>
            <td>&#8377;12,000 &ndash; 18,000</td>
          </tr>
          <tr>
            <td><strong>Webhook Handler &amp; RPC Sync</strong></td>
            <td>Secure endpoint with HMAC verification, maps courier milestones to existing RPC</td>
            <td>2 &ndash; 3 Days</td>
            <td>&#8377;8,000 &ndash; 12,000</td>
          </tr>
          <tr>
            <td><strong>Hyperlocal Grocery Adapter</strong></td>
            <td>Shadowfax / Pinified client with rider allocation and OTP verification</td>
            <td>3 &ndash; 4 Days</td>
            <td>&#8377;12,000 &ndash; 18,000</td>
          </tr>
          <tr>
            <td><strong>Catalog Category Routing</strong></td>
            <td>Database migration + checkout logic routing cart items to appropriate carrier</td>
            <td>1 &ndash; 2 Days</td>
            <td>&#8377;4,000 &ndash; 8,000</td>
          </tr>
          <tr>
            <td><strong>Merchant Dashboard &ldquo;Ship&rdquo; UI</strong></td>
            <td>Replaces manual tracking number input with 1-click automated courier booking</td>
            <td>2 &ndash; 3 Days</td>
            <td>&#8377;8,000 &ndash; 12,000</td>
          </tr>
          <tr>
            <td><strong>Customer Live Tracking Page</strong></td>
            <td>Embedded tracking status bar showing live milestones and courier link</td>
            <td>2 Days</td>
            <td>&#8377;6,000 &ndash; 10,000</td>
          </tr>
          <tr>
            <td><strong>Idempotency &amp; Error Resilience</strong></td>
            <td>Double-shipment prevention guards and automatic webhook retry queues</td>
            <td>2 Days</td>
            <td>&#8377;6,000 &ndash; 10,000</td>
          </tr>
          <tr>
            <td><strong>QA, Sandbox &amp; Regression Testing</strong></td>
            <td>End-to-end sandbox verification, WhatsApp trigger validation, edge cases</td>
            <td>3 Days</td>
            <td>&#8377;10,000 &ndash; 15,000</td>
          </tr>
          <tr class="highlight-row">
            <td><strong>Total Engineering Scope</strong></td>
            <td><strong>Full 2-Provider Logistics Engine</strong></td>
            <td><strong>18 &ndash; 21 Days</strong></td>
            <td><strong>&#8377;66,000 &ndash; 1,03,000</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="grid-2" style="margin-top: 10px;">
        <div class="card">
          <div class="card-title"><span>Phase 1 Only: Standard E-Commerce</span></div>
          <div class="card-subtitle">Automates pan-India fashion/electronics delivery via Shiprocket</div>
          <div class="metric-val" style="margin-top: 6px;">&#8377;40,000 &ndash; 60,000 <small style="font-size: 10px; font-weight: normal;">(10&ndash;12 Days)</small></div>
        </div>
        <div class="card featured">
          <div class="card-title"><span>Phases 1 + 2: Complete Stack</span></div>
          <div class="card-subtitle">Full automation for both pan-India goods and Bhopal grocery deliveries</div>
          <div class="metric-val" style="margin-top: 6px;">&#8377;80,000 &ndash; 1,20,000 <small style="font-size: 10px; font-weight: normal;">(18&ndash;21 Days)</small></div>
        </div>
      </div>
    </div>

    <div class="doc-footer">
      <span>Intrust India &bull; Delivery API Integration Proposal</span>
      <span>Page 4</span>
    </div>
  </div>

  <!-- ==================== PAGE 5: TIMELINE, RISKS & RECOMMENDATIONS ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span>Intrust India &bull; E-Commerce Logistics Proposal</span>
      <span>Implementation Plan &amp; Risk Register</span>
    </div>

    <!-- 08 TIMELINE -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 08</div>
      <h2>Phased Rollout Timeline (5 Weeks)</h2>

      <div class="timeline-item">
        <div class="timeline-badge">1</div>
        <div class="timeline-content">
          <div class="timeline-meta">Week 1 &bull; Days 1 &ndash; 5</div>
          <div class="timeline-title">Account Setup, Credentials &amp; Core API Client</div>
          <p style="margin: 0; font-size: 10.5px;">Setup Shiprocket Advanced account; generate API tokens; build robust adapter module with rate calculation and label download.</p>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-badge">2</div>
        <div class="timeline-content">
          <div class="timeline-meta">Week 2 &bull; Days 6 &ndash; 10</div>
          <div class="timeline-title">Webhook Synchronization &amp; Merchant Dashboard UI</div>
          <p style="margin: 0; font-size: 10.5px;">Build webhook endpoint connected to <code>update_order_delivery_v3()</code>; replace manual tracking inputs with 1-click &ldquo;Pack &amp; Ship&rdquo; button.</p>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-badge">3</div>
        <div class="timeline-content">
          <div class="timeline-meta">Week 3 &bull; Days 11 &ndash; 14</div>
          <div class="timeline-title">Customer Tracking Page &amp; Phase 1 Production Go-Live</div>
          <p style="margin: 0; font-size: 10.5px;">Deploy customer tracking UI; verify automated WhatsApp notification triggers; launch standard shipping for live orders.</p>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-badge">4</div>
        <div class="timeline-content">
          <div class="timeline-meta">Weeks 4 &ndash; 5 &bull; Days 15 &ndash; 21</div>
          <div class="timeline-title">Hyperlocal Grocery Integration &amp; Dual-Routing Engine</div>
          <p style="margin: 0; font-size: 10.5px;">Deploy Shadowfax/Pinified hyperlocal adapter; configure delivery category tags on grocery items; verify OTP verification workflow.</p>
        </div>
      </div>
    </div>

    <!-- 09 RISKS -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 09</div>
      <h2>Risk Management &amp; Mitigation Strategy</h2>

      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span>Return to Origin (RTO) Losses</span><span class="badge badge-warning">Medium Risk</span></div>
          <div class="card-subtitle">Failed deliveries on Cash-on-Delivery (COD) orders</div>
          <p style="font-size: 10.5px; margin: 0;"><strong>Mitigation:</strong> Mandatory customer WhatsApp confirmation before packing; automated address validation; automated NDR re-attempt rules.</p>
        </div>

        <div class="card">
          <div class="card-title"><span>Bhopal Hyperlocal Fleet Shortage</span><span class="badge badge-warning">Medium Risk</span></div>
          <div class="card-subtitle">Peak hour delays or unassigned riders</div>
          <p style="font-size: 10.5px; margin: 0;"><strong>Mitigation:</strong> Dual integration: Shadowfax as primary contract carrier with Pinified configured as hot-standby fallback.</p>
        </div>

        <div class="card">
          <div class="card-title"><span>Duplicate Shipments on Retries</span><span class="badge badge-success">Low Risk</span></div>
          <div class="card-subtitle">Network timeout causing accidental double booking</div>
          <p style="font-size: 10.5px; margin: 0;"><strong>Mitigation:</strong> Enforce unique idempotency keys using <code>order_id</code> as booking reference; check existing AWB before dispatch call.</p>
        </div>

        <div class="card">
          <div class="card-title"><span>Carrier API Version Drift</span><span class="badge badge-success">Low Risk</span></div>
          <div class="card-subtitle">Third-party contract schema changes</div>
          <p style="font-size: 10.5px; margin: 0;"><strong>Mitigation:</strong> Isolate external partner payloads behind unified internal contract adapters; allocate 20% annual maintenance budget.</p>
        </div>
      </div>
    </div>

    <!-- 10 FINAL RECOMMENDATION -->
    <div class="sec avoid-break">
      <div class="sec-num">Section 10</div>
      <h2>Final Recommendation &amp; Immediate Next Steps</h2>

      <div class="callout success">
        <strong>Strategic Summary:</strong> We strongly advise approving a <strong>two-phase execution plan</strong>:
        <ol style="margin-top: 6px; padding-left: 18px;">
          <li><strong>Immediate (Weeks 1&ndash;3):</strong> Implement <strong>Shiprocket</strong> to automate standard e-commerce orders, eliminating 90% of merchant manual work and providing automated tracking.</li>
          <li><strong>Follow-up (Weeks 4&ndash;5):</strong> Layer <strong>Shadowfax / Pinified</strong> for grocery items to unlock sub-4-hour same-day delivery across Bhopal.</li>
        </ol>
      </div>

      <table>
        <thead>
          <tr>
            <th>Action Item</th>
            <th>Responsible Owner</th>
            <th>Prerequisites</th>
            <th>Target Turnaround</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1. Shiprocket Account Registration</td>
            <td>Intrust Business Operations</td>
            <td>Company GST &amp; KYC docs</td>
            <td>1 &ndash; 2 Business Days</td>
          </tr>
          <tr>
            <td>2. Shadowfax Enterprise Outreach</td>
            <td>Intrust Business Operations</td>
            <td>Estimated 50&ndash;100 local orders/month</td>
            <td>2 &ndash; 3 Business Days</td>
          </tr>
          <tr>
            <td>3. Engineering Sprint 1 Kickoff</td>
            <td>Development Team</td>
            <td>Client Proposal Approval</td>
            <td>Immediate upon signoff</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="doc-footer">
      <span>Intrust India &bull; Delivery API Integration Proposal</span>
      <span>Page 5</span>
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
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully wrote HTML to:', htmlPath);

// 2. Launch Chromium and generate PDF
(async () => {
  console.log('Launching browser to generate A4 PDF...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '12mm',
      bottom: '14mm',
      left: '14mm',
      right: '14mm'
    }
  });

  fs.writeFileSync(pdfPathUpper, pdfBuffer);
  fs.writeFileSync(pdfPathLower, pdfBuffer);
  console.log('Successfully generated PDF at:', pdfPathUpper);
  console.log('Successfully generated PDF at:', pdfPathLower);

  await browser.close();
  console.log('PDF generation finished successfully!');
})();
