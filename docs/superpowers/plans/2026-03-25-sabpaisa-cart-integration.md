# Sabpaisa Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement SabPaisa Payment Gateway at the Cart Checkout, allowing users to pay securely via UPI/Cards/Net Banking.

**Architecture:** 
1. Update `CartClient.jsx` to disable the "Coming Soon" state for UPI/Cards/Net Banking and pop the existing `SabpaisaPaymentModal`.
2. Introduce a new backend RPC (`draft_cart_orders`) to lock the cart items into "PENDING" orders before redirecting to the gateway.
3. Pass `udf1='CART_CHECKOUT'` to the Sabpaisa initiate route, and `udf2=order_group_id`.
4. Update the SabPaisa Callback route to finalize the PENDING orders (mark as `paid`, clear cart, credit merchant) upon SUCCESS.

**Tech Stack:** Next.js, TailwindCSS, Supabase PostgreSQL RPCs, SabPaisa PG.

---

### Task 1: Draft Orders RPC

**Files:**
- Create: `database_scripts/cart_checkout_gateway.sql`

- [ ] **Step 1: Write the Draft Orders RPC**
Create a script to define `draft_cart_orders(p_customer_id uuid, p_client_txn_id text)` that creates `orders` from the `shopping_cart` for a user with `payment_status = 'pending'`, and assigns the `p_client_txn_id` to them.

- [ ] **Step 2: Write the Finalize Orders RPC**
Define `finalize_gateway_orders(p_client_txn_id text, p_amount_paise bigint)` to mark the orders as `paid`, distribute funds to `merchants` wallet, and delete the user's `shopping_cart`.

- [ ] **Step 3: Run the Script**
Run the SQL script against Supabase to create these functions.

- [ ] **Step 4: Commit**
```bash
git add database_scripts/cart_checkout_gateway.sql
git commit -m "feat: add rpc for drafting and finalizing gateway cart orders"
```

### Task 2: Modifying Payment Callback

**Files:**
- Modify: `app/api/sabpaisa/callback/route.js`

- [ ] **Step 1: Add CART_CHECKOUT handler**
In the callback route, add a block for `internalStatus === 'SUCCESS' && existingTxn.udf1 === 'CART_CHECKOUT'`. Call the `finalize_gateway_orders` RPC.

- [ ] **Step 2: Add failure rollback**
If the callback fails or aborts, we should ideally mark the orders as `failed`. Add a fallback block to handle failed checkouts.

- [ ] **Step 3: Commit**
```bash
git add app/api/sabpaisa/callback/route.js
git commit -m "feat: handle CART_CHECKOUT in sabpaisa callback"
```

### Task 3: Integrating Modal in CartClient

**Files:**
- Modify: `app/(customer)/shop/cart/CartClient.jsx`
- Modify: `components/payment/SabpaisaPaymentModal.jsx`

- [ ] **Step 1: Update SabpaisaPaymentModal**
Add logic to support `metadata.type === 'cart_checkout'`. 
When `CART_CHECKOUT` is active, use `udf1='CART_CHECKOUT'` and `udf2=clientTxnId`.

- [ ] **Step 2: Import Modal**
Import `SabpaisaPaymentModal` into `CartClient`.

- [ ] **Step 3: Update Payment Method UI**
Instead of calling `handleCheckout` immediately, selecting UPI/Cards/Netbanking/Wallet should open the modal and pass `totalPrice` and cart details.

- [ ] **Step 4: Commit**
```bash
git add app/(customer)/shop/cart/CartClient.jsx components/payment/SabpaisaPaymentModal.jsx
git commit -m "feat: integrate sabpaisa payment modal in cart checkout"
```
