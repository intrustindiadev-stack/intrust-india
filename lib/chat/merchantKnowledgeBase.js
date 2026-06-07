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

### Lock-in Portfolio (/merchant/lockin)
- Admin-created fixed deposits with a guaranteed reward rate and fixed term.
- Principal is locked; interest accrues daily and is visible in real time.
- No pre-mature break — funds stay locked until the maturity date.
- On maturity, tap "Release Funds to Bank" to transfer principal + interest.
- Status flow: active → matured → released.

### AI Grow (/merchant/investments)
- Invest in verified trade orders and earn dynamic profit-sharing — no fixed interest rate.
- Minimum investment: ₹10,000.
- Submit a request → admin reviews and activates → funds are deployed.
- Track deployed total, current returns, and order-level performance.
- Status flow: requested → active → settled.

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
