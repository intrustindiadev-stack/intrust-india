/**
 * lib/chat/merchantKnowledgeBase.js
 *
 * Compact markdown knowledge base about InTrust India's merchant features.
 * Injected into Gemini's system instruction so the model can answer
 * "how does X work?" and deep-link users to the correct page.
 *
 * Keep each section to ~4–6 lines to stay token-budget conscious.
 */

export const MERCHANT_KNOWLEDGE_BASE = `
## InTrust India — Merchant Feature Reference

### Dashboard (/merchant/dashboard)
- Shows overview tiles, KPIs, and recent activities.
- A quick glance at today's performance and pending tasks.

### Inventory (/merchant/inventory)
- Manage stock units and update pricing.
- Differentiate between platform stock and custom items.

### Wholesale Market (/merchant/shopping/wholesale)
- Buy platform stock at wholesale price to replenish inventory.
- Track bulk purchases and deliveries.

### My Retail Shop (/merchant/shopping/inventory)
- Live catalogue with a stock toggle.
- Add custom products via "Add Custom Product".

### Purchase Coupons (/merchant/purchase)
- Procure gift-card stock for resale.
- Check available brands and denominations.

### Store Credits / Udhari (/merchant/udhari)
- Manage udhari_requests; durations of 5, 10, or 15 days.
- Status flow: pending → approved → completed or expired.

### NFC Card (/merchant/nfc-service)
- Order and manage NFC smart cards.
- Quick digital interactions for your store.

### Lockin Portfolio (/merchant/lockin)
- Capital lock-in with guaranteed reward rates and maturity dates.
- View active balances and accumulated interest.

### Investments Hub (/merchant/investments)
- Track and manage additional merchant investments.
- If not available, use the main dashboard for overview.

### Wallet + Withdrawals (/merchant/wallet)
- Track wallet balance and commission earned.
- "Request Payout" flow creates payout_requests (status: pending → approved → released/rejected).

### My Network / Referrals (/merchant/referrals)
- Earn ₹20 per activated merchant referral.
- View direct referrals and total prize history.

### Shopping Orders (/merchant/shopping/orders)
- Manage incoming retail/wholesale orders.
- Track delivery_status and settlement_status.

### Auto Mode (/merchant/shopping/auto-mode)
- Auto-fulfill toggle for hands-free operation.
- View recent-order analytics for automated orders.

### Ratings (/merchant/ratings)
- View customer ratings and feedback.
- Maintain high ratings to attract more customers.

### Analytics (/merchant/analytics)
- Detailed sales, revenue, and order analytics.
- Track performance over time.

### Profile (/merchant/profile)
- Update personal and basic business information.
- Ensure contact details are up to date.

### Settings (/merchant/settings)
- Sub-tabs: Bank Details, Notifications, Store status (open/close), Subscription (Elite Gold).
- Critical for maintaining active merchant status.
`;
