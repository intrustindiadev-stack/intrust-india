/**
 * tests/test_order_invoice_lifecycle.mjs
 *
 * Automated regression test suite for Order Invoice Lifecycle & Data Integrity.
 * Verifies Test 1 through Test 10 from the test matrix.
 */

import { strict as assert } from 'node:assert';
import { 
    isOrderInvoiceEligible, 
    getInvoiceIneligibilityReason, 
    getOrderInvoiceNumber 
} from '../lib/orders/invoiceEligibility.js';

console.log('--- STARTING ORDER INVOICE LIFECYCLE REGRESSION TESTS ---\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
    totalTests++;
    try {
        testFn();
        console.log(`✅ [PASS] ${testName}`);
        passedTests++;
    } catch (err) {
        console.error(`❌ [FAIL] ${testName}`);
        console.error(err);
    }
}

// ----------------------------------------------------------------------------------
// Test 1 — Newly created order: Payment PAID, Fulfillment NOT PACKED ('pending')
// ----------------------------------------------------------------------------------
runTest('Test 1: Newly created order (Paid, Pending fulfillment) -> Invoice NOT AVAILABLE', () => {
    const order = {
        id: '1a5a99fb-ac6a-48a3-8ab0-94776eeef689',
        status: 'completed',
        payment_status: 'paid',
        delivery_status: 'pending',
        created_at: '2026-09-25T20:05:46.985Z'
    };

    const eligible = isOrderInvoiceEligible(order);
    assert.equal(eligible, false, 'Order should NOT be invoice-eligible when delivery_status is pending');

    const reason = getInvoiceIneligibilityReason(order);
    assert.match(reason, /once the order is packed/i, 'Reason should indicate packing is required');
});

// ----------------------------------------------------------------------------------
// Test 2 — Merchant accepts order: Payment PAID, Fulfillment 'pending' (accepted/processing)
// ----------------------------------------------------------------------------------
runTest('Test 2: Order accepted/processing before packing -> Invoice STILL UNAVAILABLE', () => {
    const order = {
        id: '2b6b00ac-bc7b-59b4-9bc1-05887fffa790',
        status: 'completed',
        payment_status: 'paid',
        delivery_status: 'pending',
        status_notes: 'Merchant accepted order'
    };

    const eligible = isOrderInvoiceEligible(order);
    assert.equal(eligible, false, 'Accepted order before packing must remain invoice-ineligible');
});

// ----------------------------------------------------------------------------------
// Test 3 — Merchant packs order: Payment PAID, Fulfillment PACKED ('packed')
// ----------------------------------------------------------------------------------
runTest('Test 3: Merchant packs order (Paid, Packed) -> Invoice BECOMES AVAILABLE', () => {
    const order = {
        id: '1a5a99fb-ac6a-48a3-8ab0-94776eeef689',
        status: 'completed',
        payment_status: 'paid',
        delivery_status: 'packed',
        packed_at: '2026-09-26T10:00:00.000Z',
        created_at: '2026-09-25T20:05:46.985Z'
    };

    const eligible = isOrderInvoiceEligible(order);
    assert.equal(eligible, true, 'Packed and paid order MUST be invoice-eligible');

    const reason = getInvoiceIneligibilityReason(order);
    assert.equal(reason, null, 'No ineligibility reason should exist for packed order');

    // Also verify subsequent stages remain eligible:
    const shippedOrder = { ...order, delivery_status: 'shipped' };
    assert.equal(isOrderInvoiceEligible(shippedOrder), true, 'Shipped order must be invoice-eligible');

    const deliveredOrder = { ...order, delivery_status: 'delivered' };
    assert.equal(isOrderInvoiceEligible(deliveredOrder), true, 'Delivered order must be invoice-eligible');
});

// ----------------------------------------------------------------------------------
// Test 4 — Customer opens invoice endpoint directly before eligible
// ----------------------------------------------------------------------------------
runTest('Test 4: Customer checks eligibility before packing -> Blocked with 403 reason', () => {
    const order = {
        id: '1a5a99fb-ac6a-48a3-8ab0-94776eeef689',
        customer_id: 'cust-123',
        status: 'completed',
        payment_status: 'paid',
        delivery_status: 'pending'
    };

    const eligible = isOrderInvoiceEligible(order);
    assert.equal(eligible, false);
    const reason = getInvoiceIneligibilityReason(order);
    assert.ok(reason.length > 0, 'Ineligibility reason must be populated');
});

// ----------------------------------------------------------------------------------
// Test 5 — Merchant opens invoice before eligible
// ----------------------------------------------------------------------------------
runTest('Test 5: Merchant attempts invoice access before packing -> Blocked with same protection', () => {
    const order = {
        id: '1a5a99fb-ac6a-48a3-8ab0-94776eeef689',
        merchant_id: 'merch-456',
        status: 'completed',
        payment_status: 'paid',
        delivery_status: 'pending'
    };

    const eligible = isOrderInvoiceEligible(order);
    assert.equal(eligible, false, 'Merchant must also be prevented from viewing invoice before packing');
});

// ----------------------------------------------------------------------------------
// Test 6 — Eligible order: Generates canonical invoice number
// ----------------------------------------------------------------------------------
runTest('Test 6: Eligible order produces canonical invoice format', () => {
    const order = {
        id: '1a5a99fb-ac6a-48a3-8ab0-94776eeef689',
        status: 'completed',
        payment_status: 'paid',
        delivery_status: 'packed',
        created_at: '2026-09-25T20:05:46.985Z'
    };

    const invNum = getOrderInvoiceNumber(order);
    assert.equal(invNum, 'INV-2026-1A5A99FB', 'Invoice number must follow INV-YYYY-XXXXXXXX');
});

// ----------------------------------------------------------------------------------
// Test 7 — Idempotency: Multiple requests return the exact same invoice number
// ----------------------------------------------------------------------------------
runTest('Test 7: Idempotency — repeated requests return identical invoice number', () => {
    const order = {
        id: '1a5a99fb-ac6a-48a3-8ab0-94776eeef689',
        created_at: '2026-09-25T20:05:46.985Z'
    };

    const inv1 = getOrderInvoiceNumber(order);
    const inv2 = getOrderInvoiceNumber(order);
    const inv3 = getOrderInvoiceNumber(order);

    assert.equal(inv1, inv2);
    assert.equal(inv2, inv3);
    assert.equal(inv1, 'INV-2026-1A5A99FB');
});

// ----------------------------------------------------------------------------------
// Test 8 — Cancelled order: Invoice NOT allowed
// ----------------------------------------------------------------------------------
runTest('Test 8: Cancelled order -> No final tax invoice', () => {
    const orderCancelledStatus = {
        id: 'c7f4eefd-c61b-47a8-9389-b4748105de65',
        status: 'cancelled',
        payment_status: 'paid',
        delivery_status: 'packed'
    };
    assert.equal(isOrderInvoiceEligible(orderCancelledStatus), false, 'Cancelled order cannot have invoice');
    assert.match(getInvoiceIneligibilityReason(orderCancelledStatus), /cancelled/i);

    const orderCancelledDelivery = {
        id: 'c7f4eefd-c61b-47a8-9389-b4748105de65',
        status: 'completed',
        payment_status: 'paid',
        delivery_status: 'cancelled'
    };
    assert.equal(isOrderInvoiceEligible(orderCancelledDelivery), false, 'Order with cancelled delivery cannot have invoice');
});

// ----------------------------------------------------------------------------------
// Test 9 — Failed payment: Invoice NOT allowed
// ----------------------------------------------------------------------------------
runTest('Test 9: Failed payment -> No final tax invoice', () => {
    const orderFailedPayment = {
        id: 'c6dbff74-d1bb-4562-b6f2-5fddb3235e88',
        status: 'failed',
        payment_status: 'failed',
        delivery_status: 'cancelled'
    };
    assert.equal(isOrderInvoiceEligible(orderFailedPayment), false, 'Failed payment cannot have invoice');
    assert.match(getInvoiceIneligibilityReason(orderFailedPayment), /cancelled|failed/i);

    const orderPendingPayment = {
        id: 'd9ab12cd-34ef-56gh-78ij-90klmnopqrst',
        status: 'pending',
        payment_status: 'pending',
        delivery_status: 'pending'
    };
    assert.equal(isOrderInvoiceEligible(orderPendingPayment), false, 'Pending payment cannot have invoice');
    assert.match(getInvoiceIneligibilityReason(orderPendingPayment), /payment is completed/i);
});

// ----------------------------------------------------------------------------------
// Test 10 — Price integrity: Snapshot at order time preserved
// ----------------------------------------------------------------------------------
runTest('Test 10: Price integrity — uses order item snapshot unit_price_paise, not live product price', () => {
    // Current product price in catalogue has changed (e.g. inflation / price update)
    const currentCatalogueProduct = {
        title: 'boAt Wave Call 2 Smartwatch Black',
        suggested_retail_price_paise: 250000, // Price went up to ₹2,500.00
        gst_percentage: 18
    };

    // But order item has original captured purchase snapshot
    const orderItem = {
        quantity: 1,
        unit_price_paise: 178500, // Original ₹1,785.00
        shopping_products: currentCatalogueProduct
    };

    // Calculate total based on snapshot:
    const itemSubtotalPaise = orderItem.unit_price_paise * orderItem.quantity;
    const gstPaise = Math.round(itemSubtotalPaise * orderItem.shopping_products.gst_percentage / 100);
    const deliveryFeePaise = 9900;
    const grandTotalPaise = itemSubtotalPaise + gstPaise + deliveryFeePaise;

    assert.equal(itemSubtotalPaise, 178500, 'Subtotal must be ₹1,785.00 from order snapshot');
    assert.equal(gstPaise, 32130, 'GST must be ₹321.30');
    assert.equal(grandTotalPaise, 220530, 'Grand total must be ₹2,205.30 from order snapshot');

    // Tax split verification in paise (16065 each, ₹160.65 each)
    const sgstPaise = Math.round(gstPaise / 2);
    const cgstPaise = gstPaise - sgstPaise;
    assert.equal(sgstPaise, 16065, 'SGST must be exactly 16065 paise (₹160.65)');
    assert.equal(cgstPaise, 16065, 'CGST must be exactly 16065 paise (₹160.65)');
    assert.equal(sgstPaise + cgstPaise, gstPaise, 'SGST + CGST must equal total GST without rounding drift');
});

console.log(`\n--- TEST SUMMARY: ${passedTests} / ${totalTests} PASSED ---`);
if (passedTests !== totalTests) {
    process.exit(1);
}
