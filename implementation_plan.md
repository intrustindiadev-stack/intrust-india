# INTRUST Ecosystem — Master Audit & Testing Plan (Divided)

## 🎯 Objective
Perform a complete, end-to-end audit and test of the entire INTRUST web application ecosystem developed so far. Ensure every page, button, role restriction, database flow, API callback, and responsive layout is fully verified, bug-free, and polished.

This plan has been divided into two balanced parts for **Ayush** and **Yogesh** to audit and test systematically.

---

# 🧑‍💻 Part 1: Ayush's Audit & Testing Checklist
**Scope:** Customer Portal (Public & Protected), Services & BBPS Integration, Merchant Portal, and Payment/Wallet APIs.

## 📋 1. Public / Visitor Pages
Verify that these landing pages are responsive, use proper layout hierarchies, and contain working links and inputs.

- [ ] **Home Page** — [page.js](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/page.js)
  - *Verify:* Hero animations, main navigation header, scroll transitions, mobile burger menu, footer links, and all CTA buttons redirecting to `/login` or `/signup`.
- [ ] **About Page** — [page.js](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/about/page.js)
  - *Verify:* Premium layout grids, responsive design across viewports, dynamic animations, and partner credentials.
- [ ] **Coming Soon** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/coming-soon/page.jsx)
  - *Verify:* Newsletter subscription email input form, "Subscribe" button click behavior, loading animation, success response, and home return link.
- [ ] **Contact Page** — [page.js](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/contact/page.js)
  - *Verify:* Contact form inputs validation, "Send Message" button click, successful dispatch, responsive contact cards, map embed, and links.
- [ ] **Legal / Policy Pages** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/legal/page.jsx)
  - *Verify:* Accordion/Tabs navigation, copy text formatting, responsive readability on mobile.
- [ ] **Global Search** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/search/page.jsx)
  - *Verify:* Instant product search bar, auto-suggest list, filtering selectors (Price, Category), product card display, and "View Details" redirects.

## 📋 2. Customer Portal — Protected Pages & Core Flows
Verify all protected pages under the `customer` sub-hierarchy. All these pages require authenticated user context.

- [ ] **Customer Dashboard** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/dashboard/page.jsx)
  - *Verify:* Dynamic greeting, current wallet balance widget, recent transactions preview, service quicklinks grid, profile summary popover, bottom navbar active states.
- [ ] **My Gift Cards** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/my-giftcards/page.jsx)
  - *Verify:* Purchased cards list, "Gift to Friend" share button, copy card code button, and redemption state updates.
- [ ] **Customer Order History** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/orders/page.jsx)
  - *Verify:* Orders tab navigation (All, Processing, Shipped, Delivered), order status badges, dynamic search, and "View Details" click.
- [ ] **Order Detail** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/orders/%5BorderId%5D/page.jsx)
  - *Verify:* Status stepper progress tracker, itemized listing, merchant info details, cancellation request buttons, return button, and invoice redirect.
- [ ] **Order Invoice** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/orders/%5BorderId%5D/invoice/page.jsx)
  - *Verify:* Clean document layout, calculations accuracy (Subtotal, GST, Delivery, Coupon Discount), and "Print Invoice" button flow.
- [ ] **Profile Settings** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/profile/page.jsx)
  - *Verify:* User details edit form (First Name, Last Name, Phone, Address details), "Save Changes" API response, change password validation, avatar image uploader.
- [ ] **KYC Verification Page** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/profile/kyc/page.jsx)
  - *Verify:* Document upload drag-and-drop, Aadhaar and PAN text validations, document preview overlays, and "Submit Documents" API trigger.
- [ ] **WhatsApp Alert Preferences** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/profile/whatsapp/page.jsx)
  - *Verify:* Opt-in toggle button, phone validation, "Send Test Notification" button logic.
- [ ] **Refer & Earn** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/refer/page.jsx)
  - *Verify:* Referral code generation, "Copy Code" clipboard feedback, social share buttons (WhatsApp, Twitter, Email CTAs), referral list, and earnings card.
- [ ] **Rewards Center** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/rewards/page.jsx)
  - *Verify:* Total Points balance tracker, points conversion calculator, "Convert to Wallet Balance" input and submit buttons, scratch cards claim button.
- [ ] **Rewards History Ledger** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/rewards/history/page.jsx)
  - *Verify:* Points earning/spending timeline, search, transaction date filters.
- [ ] **Rewards Leaderboard** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/rewards/leaderboard/page.jsx)
  - *Verify:* Ranking list, search by username, points-based badges, responsive layout.
- [ ] **Rewards Transactions** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/rewards/transactions/page.jsx)
  - *Verify:* Points transfer records, filter by transaction type.
- [ ] **Referral Tree View** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/rewards/tree/page.jsx)
  - *Verify:* Interactive visual network tree representation of referred users, node expansions, multilevel stats.
- [ ] **Wallet Overview** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/wallet/page.jsx)
  - *Verify:* Active balance check, Top Up amount input, quick amount selectors (e.g. ₹500, ₹1000), "Proceed to Pay" button launching SabPaisa gateway modal, credit/debit filters.
- [ ] **Wallet Transactions** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/transactions/page.jsx)
  - *Verify:* Full wallet history transaction table, status indicator dots (Success/Pending/Failed), detailed metadata popover.
- [ ] **Wishlist** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/(protected)/wishlist/page.jsx)
  - *Verify:* Saved items layout, "Remove Item" button, "Move to Cart" button flow, empty state illustration.

## 📋 3. Service Ordering & eCommerce Channels
Verify all public/protected pages related to core services, careers, and the eCommerce shop.

- [ ] **Careers Page** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/career/page.jsx)
  - *Verify:* Job postings filter (Location, Department), list cards, "Apply Now" button redirect.
- [ ] **Career Application Form** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/career/apply/page.jsx)
  - *Verify:* Resume attachment field validation, input fields verification, "Submit Form" loader.
- [ ] **Career Applications Status** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/career/applications/page.jsx)
  - *Verify:* Past application cards, stages list, contact HR CTA.
- [ ] **NFC Service Center** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/nfc-service/page.jsx)
  - *Verify:* NFC card preview visual mock, card theme selector, custom logo uploader tool, amount calculate widget, "Order NFC Card" SabPaisa payment flow.
- [ ] **Customer NFC Order Tracker** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/customer/nfc-orders/page.jsx)
  - *Verify:* NFC order history, shipping carrier link, status badge.
- [ ] **Solar Service Lead Form** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/solar/page.jsx)
  - *Verify:* Inquiry inputs validation (Roof Area, Monthly Bill, Location, Contact), "Request Quote" button, submission validation.
- [ ] **Services & BBPS Portal** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/services/page.jsx)
  - *Verify:* Category grids (Recharge, Utility Bills, Fastag, etc.), operator dropdown list, live bill fetch, payment source selection (Wallet vs Gateway), receipt download.
- [ ] **Gift Cards Mall** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/gift-cards/page.jsx)
  - *Verify:* Brand grids (Amazon, Flipkart, custom Intrust), "Buy Now" redirection.
- [ ] **Gift Card Detail / Buy** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/gift-cards/%5Bid%5D/page.jsx)
  - *Verify:* Custom value input box, recipient details form, wallet checkout callback, and receipt trigger.
- [ ] **Merchant Apply Forms** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/merchant-apply/page.jsx)
  - *Verify:* Multi-step application inputs (Business Name, PAN, GSTIN, Address, Category), document files uploader, terms checkbox, "Apply" API flow.
- [ ] **Merchant Apply Success** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/merchant-apply/success/page.jsx)
  - *Verify:* Responsive success screen, check-status CTA.
- [ ] **Intrust Shopping Mall** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/shop/page.jsx)
  - *Verify:* Banners carousel, merchant store lists, category filters, trending products, responsive grid layout.
- [ ] **Merchant Storefront** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/shop/%5BmerchantSlug%5D/page.jsx)
  - *Verify:* Store banner, store opening indicator, specific inventory search, filtering category tags, and merchant rating cards.
- [ ] **Product Details Page** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/shop/product/%5BproductSlug%5D/page.jsx)
  - *Verify:* Image picker slider, stock indicator badge, discount calculations, "Add to Cart" button, quantity selector, specs sheet, user reviews.
- [ ] **Shopping Cart & Checkout** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/shop/cart/page.jsx)
  - *Verify:* Item quantities sync, "Remove" triggers, coupon validation box, wallet checkout button, SabPaisa gateway checkout button.
- [ ] **Store Credits Overview** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(customer)/store-credits/page.jsx)
  - *Verify:* Merchant ledger balances list, settle credit option.

## 📋 4. Merchant / Vendor Portal
Audit the business functionalities, onboarding status blocks, and inventory controllers.

- [ ] **Onboarding Check Guards:**
  - *Verify:* Under `/merchant-status/pending` [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant-status/pending/page.jsx), `/merchant-status/rejected` [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant-status/rejected/page.jsx), and `/merchant-status/suspended` [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant-status/suspended/page.jsx), users with those flags are blocked from accessing other pages.
- [ ] **Merchant Subscribe Page** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant-subscribe)/merchant-subscribe/page.jsx)
  - *Verify:* Subscription plan pricing details, payment callback flow.
- [ ] **Merchant Portal Root / Redirect** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/page.jsx)
  - *Verify:* Role-check parser, session verification redirect.
- [ ] **Merchant Dashboard** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/dashboard/page.jsx)
  - *Verify:* Performance summary metric cards, graph overlays (weekly sales volumes), quick action links, status tracker.
- [ ] **Merchant Sales Analytics** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/analytics/page.jsx)
  - *Verify:* Chart filters (weekly, monthly, yearly), CSV exports, trending inventory metrics.
- [ ] **Merchant Coupons Generator** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/coupons/add/page.jsx)
  - *Verify:* Promo code builder input, discount slider, datepicker validations, "Generate Coupon" submit loader.
- [ ] **Merchant Core Inventory Table** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/inventory/page.jsx)
  - *Verify:* Search bar filter, stock level badges, status selectors.
- [ ] **Merchant Investment Schemes** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/investments/page.jsx)
  - *Verify:* Interest-rate list cards, invest button, yield estimator.
- [ ] **Merchant Investment Lock-ins** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/lockin/page.jsx) and detail page — [[id] page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/lockin/%5Bid%5D/page.jsx)
  - *Verify:* Staged payout terms chart, active lock-in rules list.
- [ ] **Merchant NFC Orders Configuration** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/nfc-orders/page.jsx)
  - *Verify:* Order history list, card setups.
- [ ] **Merchant Smart NFC Card Tools** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/nfc-service/page.jsx)
  - *Verify:* Reader options menu.
- [ ] **Merchant Business Profile** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/profile/page.jsx)
  - *Verify:* Logo uploader container, shop location details, coordinates fields, validation alerts.
- [ ] **Merchant Restock Purchase** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/purchase/page.jsx)
  - *Verify:* Items grid view, add to wholesale cart button.
- [ ] **Merchant Feedback & Ratings** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/ratings/page.jsx)
  - *Verify:* User ratings table, response textbox, submit comment.
- [ ] **Merchant referrals** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/referrals/page.jsx)
  - *Verify:* Merchant-referral tree.
- [ ] **Merchant Settings Dashboard** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/settings/page.jsx)
  - *Verify:* Alert toggles, bank details form, password reset form.
- [ ] **Merchant Udhari Settings** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/settings/udhari/page.jsx)
  - *Verify:* Udhari activate checkbox, individual customer limit adjustments, automated reminders interval select.
- [ ] **Merchant Auto-Mode Settings** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/auto-mode/page.jsx)
  - *Verify:* Auto-procurement rules toggle.
- [ ] **Merchant Catalog Shopping Items** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/inventory/page.jsx)
  - *Verify:* Products list, edit/delete actions.
- [ ] **Bulk Inventory CSV Upload** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/inventory/bulk/page.jsx)
  - *Verify:* File uploader box, CSV parser response, bulk insert validations, error log download.
- [ ] **New Product Listing Creation** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/inventory/new/page.jsx) and edit — [[id] page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/inventory/edit/%5Bid%5D/page.jsx)
  - *Verify:* Rich text desc area, stock levels count picker, main image dropzone, category multi-picker.
- [ ] **Merchant Customer Orders Dashboard** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/orders/page.jsx) and detail — [[orderId] page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/orders/%5BorderId%5D/page.jsx)
  - *Verify:* Orders log list, "Fulfill Order" button, Courier name/tracking number inputs, validation.
- [ ] **Sales to Intrust accounting** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/sales-to-intrust/page.jsx)
  - *Verify:* Invoiced commission lists.
- [ ] **Merchant wholesale catalog** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/wholesale/page.jsx) and history — [history/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/shopping/wholesale/history/page.jsx)
  - *Verify:* Restocking catalogs and previous wholesale bills lists.
- [ ] **Merchant Subscription Plan Checker** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/subscription/page.jsx)
  - *Verify:* Package billing terms, expiration tracker details.
- [ ] **Merchant Active Udhari Ledger** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/udhari/page.jsx)
  - *Verify:* Accounts log list, "Record Cash Payment" manual credit button.
- [ ] **Merchant Finance Wallet** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/wallet/page.jsx)
  - *Verify:* Current balance dashboard, Payout settings.
- [ ] **Merchant Wallet Transactions** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/wallet/transactions/page.jsx) and detail — [[id] page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/wallet/transactions/%5Bid%5D/page.jsx)
  - *Verify:* Debit/Credit list rows, filter dates.
- [ ] **Merchant Wallet Withdrawals Launcher** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/wallet/withdrawals/page.jsx)
  - *Verify:* Amount withdraw form validation, instant payout requests log table.
- [ ] **Merchant WhatsApp Preferences** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(merchant)/merchant/whatsapp/page.jsx)
  - *Verify:* Setup, notifications alerts toggle.

## 📋 5. Integrated Shared APIs & Security Policies
Verify backend systems supporting this scope:

- [ ] **Payment callbacks & Webhooks:**
  - Verify signature validation on `api/sabpaisa/callback` and `api/sabpaisa/webhook`.
  - Validate credit updates on `api/wallet/topup` and debit entries on `api/payment/wallet-pay`.
- [ ] **eCommerce Cart Validation:**
  - Verify cart pricing checks server-side in `api/cart/validate` to prevent total value manipulation.
- [ ] **WhatsApp status updates:**
  - Ensure correct settings sync triggers in `api/whatsapp/status` and `api/whatsapp/opt-out`.

---

# 🧑‍💻 Part 2: Yogesh's Audit & Testing Checklist
**Scope:** Admin Panel, HRM Portal, CRM Portal, Employee Self-Service Portal, and Core Security (RLS & Session Rules).

## 📋 1. Admin Panel Pages
Verify administrative dashboards. Accessing these pages requires user role to be either `admin` or `super_admin`.

- [ ] **Admin Dashboard Console** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/page.jsx)
  - *Verify:* Total Daily/Weekly/Monthly Revenue charts, pending approvals counter badge (Merchants, Products, Payouts), user onboarding counts.
- [ ] **Admin Deep Analytics** — [page.js](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/analytics/page.js)
  - *Verify:* BBPS volumes breakdown, SabPaisa logs table, system exceptions tracker.
- [ ] **Auto procurement Rules** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/auto-mode/page.jsx) and individual overrides — [[merchantId] page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/auto-mode/%5BmerchantId%5D/page.jsx)
  - *Verify:* Config parameters inputs, toggle switch, submit action.
- [ ] **Banners Slider Manager** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/banners/page.jsx)
  - *Verify:* Upload new promotional graphic, sequence sorting buttons, "Publish Banner" API call.
- [ ] **Careers Admin Manager** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/careers/page.jsx)
  - *Verify:* Applications grid, download CV PDF links, HR manager assignment selectors, status flags.
- [ ] **CRM overview inside Admin** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/crm/page.jsx)
  - *Verify:* Direct leads overview, sales reps performance tables.
- [ ] **Flash-Sale Manager** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/flash-sale/page.jsx)
  - *Verify:* Campaign creator forms, target products selector, discount slider, dynamic scheduler.
- [ ] **Gift Cards Inventory Creator** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/giftcards/page.jsx), add new — [new/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/giftcards/new/page.jsx), edit — [[id]/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/giftcards/%5Bid%5D/page.jsx)
  - *Verify:* Gift card creator UI, parameters configurations.
- [ ] **HRM Overview inside Admin** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/hrm/page.jsx)
  - *Verify:* Core staff statistics, shortcuts.
- [ ] **Investment options manager** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/investments/page.jsx)
  - *Verify:* Yield schemes editor.
- [ ] **Admin Invoice generation** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/invoice/page.jsx)
  - *Verify:* Print invoice settings.
- [ ] **Lock-in rules editor** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/lockin/page.jsx) and specific configurations — [[id]/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/lockin/%5Bid%5D/page.jsx)
  - *Verify:* Lockin plans creator.
- [ ] **Master Merchant approvals dashboard** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/merchants/page.jsx) and individual view — [[id] page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/merchants/%5Bid%5D/page.jsx)
  - *Verify:* Applications table, "Approve Merchant" action button, "Reject Merchant" action button with feedback message modal.
- [ ] **Merchant Udhari limits tracker** — [udhari/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/merchants/udhari/page.jsx), view specific — [[id]/udhari/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/merchants/%5Bid%5D/udhari/page.jsx), custom policy config — [[id]/udhari-settings/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/merchants/%5Bid%5D/udhari-settings/page.jsx)
  - *Verify:* Balance tables, adjust parameters, update limits.
- [ ] **NFC printing queue** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/nfc/page.jsx)
  - *Verify:* Orders list, download custom card SVG, "Mark as Printed" button, tracking setup inputs.
- [ ] **Site Notifications Dispatcher** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/notifications/page.jsx)
  - *Verify:* Title & message form inputs, broadcast type selector (All Customers, All Merchants), "Send Notification" API call.
- [ ] **Merchant Payout processing pipeline** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/payouts/page.jsx)
  - *Verify:* Withdrawal requests lists, "Approve and Transfer" button, bank details validation modal.
- [ ] **Admin Profile Settings** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/profile/page.jsx)
  - *Verify:* Personal fields update, password forms.
- [ ] **Global Rewards points configurations** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/rewards/page.jsx)
  - *Verify:* Form inputs editing direct conversions percentage, level earnings limits.
- [ ] **Admin App Settings** — [page.js](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/settings/page.js)
  - *Verify:* Integration keys fields.
- [ ] **Shopping Product Approval Dashboard** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/page.jsx)
  - *Verify:* Stats cards, category listings list, new product creation page shortcut.
- [ ] **Merchant Product approvals queue** — [approvals/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/approvals/page.jsx)
  - *Verify:* Products list, "Approve Product" action button, "Reject Product" action button.
- [ ] **Admin Product Categories table** — [categories/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/categories/page.jsx), add new — [categories/new/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/categories/new/page.jsx), edit — [categories/edit/[id]/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/categories/edit/%5Bid%5D/page.jsx)
  - *Verify:* Categories list, create category button, edit category details button.
- [ ] **Official Shopping Catalogue item management** — add new — [new/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/new/page.jsx), edit — [edit/[id]/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/edit/%5Bid%5D/page.jsx)
  - *Verify:* Forms, rich text descriptions editor, save changes button.
- [ ] **Global Store Orders** — [orders/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/orders/page.jsx), specific details — [[orderId]/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/orders/%5BorderId%5D/page.jsx), tax invoice details — [[orderId]/invoice/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/orders/%5BorderId%5D/invoice/page.jsx), order takeover config — [orders/takeover/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/orders/takeover/page.jsx)
  - *Verify:* Universal orders table, statuses dropdown, assign delivery rider selector, "Admin Takeover" override button.
- [ ] **Store Procurement Manager** — [procurement/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/procurement/page.jsx) and history — [procurement/history/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/shopping/procurement/history/page.jsx)
  - *Verify:* Wholesale list items.
- [ ] **Solar lead dispatcher** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/solar/page.jsx)
  - *Verify:* Solar lead lists table, CRM assignment selector.
- [ ] **Shop open/close switcher** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/store-status/page.jsx)
  - *Verify:* Toggle shop active status checkbox.
- [ ] **Internal tasks list** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/tasks/page.jsx)
  - *Verify:* Actions logs list.
- [ ] **System transactions master ledger** — [page.js](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/transactions/page.js)
  - *Verify:* Master database transactions table with paging, global search.
- [ ] **Customers administration roster** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/users/page.jsx) and customer detail — [[id] page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/users/%5Bid%5D/page.jsx)
  - *Verify:* Users table, search filters, details link, "Suspend User" toggle button, "Manual Wallet Adjustment" button.
- [ ] **Wholesale suppliers table** — [page.js](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/vendors/page.js)
  - *Verify:* Vendor information details grid.
- [ ] **Wallet adjustments ledger** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(admin)/admin/wallet-adjustments/page.jsx)
  - *Verify:* Manual credits list.

## 📋 2. CRM Portal (Sales System)
Verify sales relationship management dashboard. Access requires user to have either a `sales_exec` or `sales_manager` role.

- [ ] **CRM Core Console** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(crm)/crm/page.jsx)
  - *Verify:* Conversion funnel indicators, follow-ups alerts list, dynamic greeting.
- [ ] **CRM Leads Table** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(crm)/crm/leads/page.jsx) and details — [[id] page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(crm)/crm/leads/%5Bid%5D/page.jsx)
  - *Verify:* **Data Scoping Guard Check:** Sales Executives must *only* see leads assigned to them. Sales Managers must see *all* team leads. Details form (notes log, scheduling dates, update status picker).
- [ ] **Pipeline Kanban Board** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(crm)/crm/pipeline/page.jsx)
  - *Verify:* Drag-and-drop actions moving cards (New → Contacted → Qualified → Closed Won/Lost) and confirming database status persists correctly.
- [ ] **CRM User Profile** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(crm)/crm/profile/page.jsx)
  - *Verify:* Settings updates.
- [ ] **CRM Sales Performance Reports** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(crm)/crm/reports/page.jsx)
  - *Verify:* Conversion funnel charts.
- [ ] **CRM settings** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(crm)/crm/settings/page.jsx)
  - *Verify:* Alerts configuration checkboxes.

## 📋 3. HRM Portal (Human Resources)
Verify staff tracking modules. Access requires user to have either an `hr_manager`, `admin`, or `super_admin` role.

- [ ] **HRM Console** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/page.jsx)
  - *Verify:* Total headcount metrics card, active leaves tracker, pending applications badge.
- [ ] **HRM Attendance Register** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/attendance/page.jsx)
  - *Verify:* Daily check-in log details grid, "Manual Override" time correction form submission.
- [ ] **HRM Leave requests evaluator** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/leaves/page.jsx)
  - *Verify:* Leave requests approval queue, "Approve" button, "Reject" button, verification of automatic leave balance deduction upon approval.
- [ ] **HRM Employee roster** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/employees/page.jsx)
  - *Verify:* Staff directory grid, "Add New Employee" form, "Terminate Employee" action button.
- [ ] **HRM Jobs portal manager** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/jobs/page.jsx)
  - *Verify:* Open roles list, create job posting form fields.
- [ ] **HRM Recruitment funnel tracker** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/recruitment/page.jsx)
  - *Verify:* Candidate pipelines drag-and-drop columns, "Send Offer Letter" action.
- [ ] **HRM Salary Payroll Uploader** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/salary/page.jsx)
  - *Verify:* Month/Year selectors, Employee name search, PDF Payslip uploader button.
- [ ] **HRM Course/Training Assignations** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/training/page.jsx)
  - *Verify:* Courses list grid, assign course to department selector.
- [ ] **HRM profile & settings** — [profile/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/profile/page.jsx), [settings/page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/settings/page.jsx)
  - *Verify:* Settings forms details.
- [ ] **HRM Audit log tracker** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(hrm)/hrm/audit/page.jsx)
  - *Verify:* Audit log table showing who performed each HR operation.

## 📋 4. Employee Self-Service Portal
Verify standard employee dashboards. Accessible to all internal employees.

- [ ] **Employee Console Dashboard** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(employee)/employee/page.jsx)
  - *Verify:* Dynamic metrics calculations (Leaves Remaining = 41 - Approved Leave Days), pending tasks count, check-in quick status card, profile links.
- [ ] **Employee Attendance Tracking** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(employee)/employee/attendance/page.jsx)
  - *Verify:* "Clock In" triggers elapsed timer widget, "Clock Out" saves logs, past logs table list. Double clock-in blocker is active.
- [ ] **Employee Leaves Application** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(employee)/employee/leaves/page.jsx)
  - *Verify:* Date ranges validation, reason text area, available leaves calculation updates upon approval.
- [ ] **Employee Payslips Downloader** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(employee)/employee/payslips/page.jsx)
  - *Verify:* Month grid layout cards, PDF viewer links.
- [ ] **Employee Course Training Platform** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(employee)/employee/training/page.jsx)
  - *Verify:* Course video panels, mark-as-complete validations.
- [ ] **Employee Profile Details** — [page.jsx](file:///E:/Intrust/intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f/app/(employee)/employee/profile/page.jsx)
  - *Verify:* Details grid.

## 📋 5. Integrated Shared APIs & Security Policies
Verify backend systems supporting Part 2's components:

- [ ] **Role Protection Guards check:**
  - Verify route middleware rules redirect unauthorized attempts (e.g., standard users accessing `admin/*` or `hrm/*`).
- [ ] **Supabase Row Level Security (RLS) policies audit:**
  - Check the database schema definitions to confirm users cannot access other users' CRM tasks or payroll registers.
- [ ] **CRM / Notification pipelines:**
  - Audit `api/crm/notifications` and `api/employee/notifications` to ensure active database trigger signals.

---

## 🎨 Global Aesthetics, Polishing & Responsiveness (Both to Verify)
Ayush and Yogesh must both verify the visual standards within their respective scopes:

1. **Skeleton Loaders:** No blank screens or layout shifts during database queries. Verify pulsing placeholder elements exist for all grids, tables, and dashboards.
2. **Illustrated Empty States:** Lists that return empty sets must show custom graphic outlines (e.g. "No pending approvals found", "Your cart is empty").
3. **Toasts & Feedback notifications:** Trigger notifications via `react-hot-toast` on every API interaction (success, warning, error messages).
4. **Desktop, Tablet & Mobile layouts:** Complete responsiveness, especially nav bars, sidebars, and data grids on screen size alterations.
5. **Smooth Animations:** Confirm button taps, modal opens/closes, and route navigations utilize smooth transitions (`framer-motion`).

## Verification Plan

### Automated Verification
Run testing pipelines on APIs where mock configurations are enabled:
```powershell
# Run backend validation test suites if configured
npm run test
```

### Manual Verification
1. **Part 1 (Ayush):** Run local dev server (`npm run dev`), log in as a test customer, verify shop-checkout payments flows, BBPS fetches, NFC customizations, and topups. Log in as test merchant, audit inventory actions, coupons creator, and withdrawals request.
2. **Part 2 (Yogesh):** Log in as admin, test approval queues, manual wallet adjusting, broadcast trigger notifications, payouts. Log in as HR Manager and CRM Sales Executive in separate incognito windows to test leave approvals and real-time kanban board sync. Verify data scoping.
