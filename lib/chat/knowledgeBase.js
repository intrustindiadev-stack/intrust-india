/**
 * lib/chat/knowledgeBase.js
 *
 * Compact markdown knowledge base about InTrust India's features.
 * Injected into Gemini's system instruction so the model can answer
 * "how does X work?" and deep-link users to the correct page.
 *
 * Keep each section to ~4–6 lines to stay token-budget conscious.
 */

export const INTRUST_KNOWLEDGE_BASE = `
## InTrust India — Website Feature Reference

### Wallet & Payments (/wallet, /transactions)
- Customers maintain a prepaid digital wallet (balance in ₹).
- Money can be added via the SabPaisa payment gateway (UPI, cards, net banking).
- Wallet funds can be used for shopping, gift cards, and store purchases.
- Transaction history is available at /customer/transactions (type, amount, description, date).
- Minimum top-up and any limits are shown on the wallet page.

### KYC Verification (/profile/kyc)
- KYC is mandatory for higher wallet limits and certain services.
- Required documents: Aadhaar card (for identity) and PAN card (for tax compliance).
- Possible statuses: Pending (not submitted), Under Review, Verified, Rejected.
- If Rejected, the reason is shown on the KYC page — user must re-submit with correct documents.
- Verified KYC unlocks full platform features.

### Gift Cards (/gift-cards, /my-giftcards)
- InTrust offers digital gift cards for brands like Amazon, Flipkart, and others.
- Gift cards are purchased using wallet balance or direct payment.
- After purchase, the card code appears under /customer/my-giftcards.
- Each gift card has a validity period shown at purchase time.
- Cards cannot be refunded once purchased.

### Shopping & Orders (/shop, /orders)
- InTrust has an integrated e-commerce store with multiple product categories.
- Items are added to a cart; coupons can be applied at checkout (/shop/cart).
- Coupons can be viewed at /my-coupons or applied during checkout.
- After placing an order, it appears under /customer/orders with status updates.
- Order statuses: Pending, Confirmed, Shipped, Delivered, Cancelled.

### Reward Points (/rewards)
- Customers earn reward points for purchases, referrals, and platform activities.
- Points accumulate and can be redeemed for discounts or wallet credits.
- Current balance and earning history are shown on the /customer/rewards page.
- A leaderboard ranks top earners on the platform.
- Redemption rules (minimum points, conversion rate) are displayed on the rewards page.

### Referrals (/refer)
- Every customer has a unique referral code shown on /customer/refer.
- Sharing the code with a new user earns both parties a reward (points or wallet credit).
- Referral earnings and history are tracked on the referral page.

### Store Credits (/store-credits)
- Store credits are different from wallet balance — they are issued by InTrust for promotions or refunds.
- Store credits can only be used for shopping on the InTrust platform (not withdrawable).
- Balance is shown on /customer/store-credits.

### NFC Service (/nfc-service)
- InTrust NFC cards are smart cards that enable quick digital interactions (tap-to-pay, tap-to-connect).
- Customers can apply for an NFC card on /customer/nfc-service.
- Use cases include contactless payments and identity verification at partner locations.

### Solar Services (/solar)
- InTrust provides solar energy product information and tie-ups.
- Customers can explore solar solutions for home and business on /customer/solar.
- For detailed solar quotes, customers are guided to contact the support team.

### Profile & WhatsApp (/profile)
- Profile details (name, phone, email) can be updated at /customer/profile.
- WhatsApp linking allows receiving notifications and using the InTrust WhatsApp bot.
- Profile page also shows KYC status and referral code.

### Merchant Apply (/merchant-apply)
- Customers can apply to become an InTrust merchant from /customer/merchant-apply.
- Merchants get access to a separate merchant dashboard with sales and inventory tools.

### Help & Support (/contact, /about)
- Support is available via the Contact Us page at /contact.
- Business hours and support email/phone are listed on that page.
- For urgent issues, users should email support or use the contact form.
`;
