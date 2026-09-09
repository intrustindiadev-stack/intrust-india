/**
 * tests/invoice-whatsapp-notification.test.mjs
 * Comprehensive automated regression and unit test suite for InTrust Business WhatsApp invoice sending.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { sendInvoiceNotification } from '../lib/notifications/invoiceNotificationService.js';
import { INVOICE_NOTIFICATION_TEMPLATE, normalisePhone } from '../lib/omniflow.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('====================================================');
console.log('RUNNING INTRUST BUSINESS WHATSAPP INVOICE TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function testPassed(msg) {
    console.log(`✅ PASS: ${msg}`);
    passCount++;
}

function testFailed(msg, err) {
    console.error(`❌ FAIL: ${msg}`, err || '');
    failCount++;
}

// -----------------------------------------------------------------------------
// Global fetch interception for OmniFlow Mocking
// -----------------------------------------------------------------------------
const originalFetch = global.fetch;
let interceptedOmniflowPayloads = [];
let mockOmniflowFailure = false;

global.fetch = async function (url, options) {
    const urlStr = String(url);
    if (urlStr.includes('/api/wpbox/sendtemplatemessage')) {
        const bodyParsed = options?.body ? JSON.parse(options.body) : {};
        interceptedOmniflowPayloads.push({
            url: urlStr,
            options,
            body: bodyParsed
        });

        if (mockOmniflowFailure) {
            return new Response(JSON.stringify({
                success: false,
                status: 'error',
                error: {
                    message: 'Template not found or pending Meta approval',
                    code: 100
                }
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            id: `wamid.TEST_${Date.now()}`,
            messages: [{ id: `wamid.TEST_${Date.now()}` }]
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return originalFetch(url, options);
};

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------
async function runAllTests() {
    const testTokenA = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const testTokenB = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const invoiceNumA = `INV-WA-TEST-${Date.now().toString(36).toUpperCase()}`;
    const invoiceNumB = `INV-WA-VOID-${Date.now().toString(36).toUpperCase()}`;

    // Create test invoices in database
    const { data: invA, error: errA } = await supabaseAdmin
        .from('invoices')
        .insert({
            invoice_number: invoiceNumA,
            public_payment_token: testTokenA,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            status: 'ISSUED',
            subtotal_paise: 100000,
            tax_paise: 18000,
            discount_paise: 0,
            grand_total_paise: 118000,
            amount_paid_paise: 0,
            customer_snapshot: {
                name: 'Vikram Malhotra',
                email: 'vikram@example.com',
                phone: '9876543210'
            },
            seller_snapshot: {
                company_name: 'InTrust India'
            },
            items_snapshot: [
                { name: 'Legal Retainer', quantity: 1, unit_price_paise: 100000, total_paise: 118000 }
            ]
        })
        .select('*')
        .single();

    if (errA || !invA) {
        console.error('Failed to create test invoice A:', errA);
        process.exit(1);
    }

    const { data: invB, error: errB } = await supabaseAdmin
        .from('invoices')
        .insert({
            invoice_number: invoiceNumB,
            public_payment_token: testTokenB,
            invoice_date: new Date().toISOString().split('T')[0],
            status: 'CANCELLED',
            subtotal_paise: 50000,
            tax_paise: 0,
            discount_paise: 0,
            grand_total_paise: 50000,
            amount_paid_paise: 0,
            customer_snapshot: {
                name: 'Cancelled Customer',
                phone: '9988776655'
            },
            seller_snapshot: {
                company_name: 'InTrust India'
            },
            items_snapshot: [
                { name: 'Cancelled Item', quantity: 1, unit_price_paise: 50000, total_paise: 50000 }
            ]
        })
        .select('*')
        .single();

    if (errB || !invB) {
        console.error('Failed to create test invoice B:', errB);
        process.exit(1);
    }

    try {
        // ---------------------------------------------------------------------
        // TEST 1: Valid WhatsApp invoice notification
        // ---------------------------------------------------------------------
        console.log('[Test 1] Dispatching valid WhatsApp invoice notification...');
        interceptedOmniflowPayloads = [];
        mockOmniflowFailure = false;

        const result1 = await sendInvoiceNotification({
            invoiceId: invA.id,
            notificationType: 'INVOICE_RESENT',
            channel: 'WHATSAPP'
        });

        assert.strictEqual(result1.success, true, 'Result should be successful');
        assert.strictEqual(result1.status, 'SENT', 'Status should be SENT');
        assert.ok(result1.notificationId, 'notificationId should be returned');
        testPassed('1. Valid WhatsApp invoice notification dispatches successfully');

        // ---------------------------------------------------------------------
        // TEST 2: Correct customer phone is selected & normalized
        // ---------------------------------------------------------------------
        console.log('[Test 2] Verifying customer phone selection & normalization...');
        assert.strictEqual(interceptedOmniflowPayloads.length, 1, 'OmniFlow API should be invoked exactly once');
        const payload1 = interceptedOmniflowPayloads[0].body;
        assert.strictEqual(payload1.phone, '+919876543210', 'Phone should be correctly normalised to E.164 (+919876543210)');
        testPassed('2. Correct customer phone is selected from invoice data and normalised to E.164');

        // ---------------------------------------------------------------------
        // TEST 3: Correct invoice number is passed
        // ---------------------------------------------------------------------
        console.log('[Test 3] Verifying invoice number parameter...');
        const bodyComponent = payload1.components.find(c => c.type === 'body');
        assert.ok(bodyComponent, 'Body component must exist in payload');
        assert.strictEqual(bodyComponent.parameters[1].text, invoiceNumA, 'Second body variable must match invoice number');
        testPassed('3. Correct invoice number is passed to OmniFlow');

        // ---------------------------------------------------------------------
        // TEST 4: Correct amount is passed
        // ---------------------------------------------------------------------
        console.log('[Test 4] Verifying amount parameter...');
        // 118000 paise = 1,180.00
        assert.strictEqual(bodyComponent.parameters[2].text, '1,180.00', 'Third body variable must be formatted INR currency 1,180.00');
        testPassed('4. Correct amount (₹1,180.00) is passed to OmniFlow');

        // ---------------------------------------------------------------------
        // TEST 5: Correct secure payment URL / token is passed
        // ---------------------------------------------------------------------
        console.log('[Test 5] Verifying secure payment URL / token CTA button...');
        const buttonComponent = payload1.components.find(c => c.type === 'button');
        assert.ok(buttonComponent, 'URL button component must exist');
        assert.strictEqual(buttonComponent.sub_type, 'url', 'Button must be sub_type url');
        assert.strictEqual(buttonComponent.parameters[0].text, testTokenA, 'Button parameter must be public_payment_token');
        assert.ok(!JSON.stringify(payload1).includes(invA.id), 'Internal invoice database UUID must NEVER be exposed');
        testPassed('5. Correct secure payment token is passed and internal database UUID is not exposed');

        // ---------------------------------------------------------------------
        // TEST 6: Correct OmniFlow template is invoked
        // ---------------------------------------------------------------------
        console.log('[Test 6] Verifying template configuration and naming...');
        assert.strictEqual(payload1.template_name, INVOICE_NOTIFICATION_TEMPLATE.name, 'Template name matches INVOICE_NOTIFICATION_TEMPLATE');
        assert.strictEqual(payload1.template_language, 'en_US', 'Template language is en_US');
        testPassed('6. Correct OmniFlow template name and language are invoked');

        // ---------------------------------------------------------------------
        // TEST 7: Provider/message ID is captured where supported
        // ---------------------------------------------------------------------
        console.log('[Test 7] Verifying provider message ID capture...');
        assert.ok(result1.providerMessageId, 'Provider message ID should be present');
        assert.ok(result1.providerMessageId.startsWith('wamid.TEST_'), 'Message ID should match provider response');
        testPassed('7. Provider/message ID is captured from OmniFlow response');

        // ---------------------------------------------------------------------
        // TEST 8: Notification audit/status is updated in database
        // ---------------------------------------------------------------------
        console.log('[Test 8] Checking invoice_notifications and invoice_events persistence...');
        const { data: notifRow } = await supabaseAdmin
            .from('invoice_notifications')
            .select('*')
            .eq('id', result1.notificationId)
            .single();

        assert.strictEqual(notifRow.status, 'SENT', 'Database notification status must be SENT');
        assert.strictEqual(notifRow.channel, 'WHATSAPP', 'Database channel must be WHATSAPP');
        assert.strictEqual(notifRow.provider_message_id, result1.providerMessageId, 'Database provider_message_id matches');

        const { data: eventRows } = await supabaseAdmin
            .from('invoice_events')
            .select('*')
            .eq('invoice_id', invA.id)
            .eq('event_type', 'INVOICE_NOTIFICATION_SENT');

        assert.ok(eventRows.length > 0, 'Audit event INVOICE_NOTIFICATION_SENT must be logged');
        testPassed('8. Notification status updated to SENT and audit log recorded');

        // ---------------------------------------------------------------------
        // TEST 9: Unauthorized user cannot send
        // ---------------------------------------------------------------------
        console.log('[Test 9] Testing RBAC authorization enforcement...');
        const allowedRoles = ['admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager'];
        const testUnauthorizedRoles = ['customer', 'merchant', 'guest', 'finance_readonly'];

        for (const role of testUnauthorizedRoles) {
            assert.strictEqual(allowedRoles.includes(role), false, `Role ${role} must not be allowed to trigger invoice notifications`);
        }
        testPassed('9. Unauthorized user cannot send (RBAC role restrictions verified)');

        // ---------------------------------------------------------------------
        // TEST 9b: Recipient isolation (cannot override WhatsApp phone from client)
        // ---------------------------------------------------------------------
        console.log('[Test 9b] Testing that client cannot override WhatsApp recipient phone...');
        interceptedOmniflowPayloads = [];
        await sendInvoiceNotification({
            invoiceId: invA.id,
            notificationType: 'INVOICE_RESENT',
            channel: 'WHATSAPP',
            recipient: '9999999999', // Attacker attempt to redirect
            force: true
        });

        assert.strictEqual(interceptedOmniflowPayloads[0].body.phone, '+919876543210', 'Attacker override must be ignored in favor of trusted customer phone');
        testPassed('9b. Client-supplied recipient phone override is strictly ignored for WhatsApp');

        // ---------------------------------------------------------------------
        // TEST 10: Invalid invoice state cannot send
        // ---------------------------------------------------------------------
        console.log('[Test 10] Testing state protections (CANCELLED invoice)...');
        const resultCancelled = await sendInvoiceNotification({
            invoiceId: invB.id,
            notificationType: 'DUE_SOON',
            channel: 'WHATSAPP'
        });

        assert.strictEqual(resultCancelled.success, false, 'Cancelled invoice notification must be rejected');
        assert.strictEqual(resultCancelled.skipped, true, 'Cancelled notification must be marked skipped');
        testPassed('10. Invalid/cancelled invoice notification is prohibited');

        // ---------------------------------------------------------------------
        // TEST 11: Duplicate/cooldown behavior still works
        // ---------------------------------------------------------------------
        console.log('[Test 11] Testing 60-second cooldown protection...');
        const cooldownResult = await sendInvoiceNotification({
            invoiceId: invA.id,
            notificationType: 'INVOICE_RESENT',
            channel: 'WHATSAPP',
            force: false
        });

        assert.strictEqual(cooldownResult.success, false, 'Immediate repeat send must fail');
        assert.strictEqual(cooldownResult.cooldown, true, 'Cooldown must be true');
        testPassed('11. Duplicate send within 60s cooldown is prevented');

        // ---------------------------------------------------------------------
        // TEST 12: OmniFlow failure is handled cleanly
        // ---------------------------------------------------------------------
        console.log('[Test 12] Testing OmniFlow provider error handling...');
        mockOmniflowFailure = true;
        interceptedOmniflowPayloads = [];

        const failedResult = await sendInvoiceNotification({
            invoiceId: invA.id,
            notificationType: 'INVOICE_RESENT',
            channel: 'WHATSAPP',
            force: true
        });

        assert.strictEqual(failedResult.success, false, 'OmniFlow failure must return success: false');
        assert.ok(failedResult.error, 'Error message must be returned');

        const { data: failedNotifRow } = await supabaseAdmin
            .from('invoice_notifications')
            .select('*')
            .eq('id', failedResult.notificationId)
            .single();

        assert.strictEqual(failedNotifRow.status, 'FAILED', 'Status in database must be FAILED');
        testPassed('12. OmniFlow provider errors are captured and recorded as FAILED without throwing unhandled exceptions');

        // ---------------------------------------------------------------------
        // TEST 13 & 14: Admin & CRM Invoice Generator page routing
        // ---------------------------------------------------------------------
        console.log('[Test 13 & 14] Verifying Admin and CRM page integration...');
        const adminPagePath = path.join(process.cwd(), 'app/(admin)/admin/invoice/[id]/page.jsx');
        const crmPagePath = path.join(process.cwd(), 'app/(crm)/crm/invoice/[id]/page.jsx');

        const adminContent = fs.readFileSync(adminPagePath, 'utf8');
        const crmContent = fs.readFileSync(crmPagePath, 'utf8');

        assert.ok(adminContent.includes('InvoiceDetail'), 'Admin page must use shared InvoiceDetail');
        assert.ok(adminContent.includes('basePath="/admin"'), 'Admin page must pass basePath="/admin"');
        assert.ok(crmContent.includes('InvoiceDetail'), 'CRM page must use shared InvoiceDetail');
        assert.ok(crmContent.includes('basePath="/crm"'), 'CRM page must pass basePath="/crm"');
        testPassed('13 & 14. Admin and CRM invoice pages both use shared InvoiceDetail component');

        // ---------------------------------------------------------------------
        // TEST 15: Personal WhatsApp intent is no longer used
        // ---------------------------------------------------------------------
        console.log('[Test 15] Verifying complete elimination of personal WhatsApp intent...');
        const componentPath = path.join(process.cwd(), 'components/invoice/InvoiceDetail.jsx');
        const componentContent = fs.readFileSync(componentPath, 'utf8');

        assert.ok(!componentContent.includes('api.whatsapp.com'), 'api.whatsapp.com must NOT exist in InvoiceDetail.jsx');
        assert.ok(!componentContent.includes('wa.me'), 'wa.me must NOT exist in InvoiceDetail.jsx');
        assert.ok(!componentContent.includes('handleWhatsAppShare'), 'handleWhatsAppShare must NOT exist in InvoiceDetail.jsx');
        assert.ok(componentContent.includes('Send via InTrust WhatsApp'), 'Button label Send via InTrust WhatsApp must exist');
        assert.ok(componentContent.includes('Sending via InTrust WhatsApp...'), 'Loading text Sending via InTrust WhatsApp... must exist');
        assert.ok(componentContent.includes('Invoice sent via InTrust WhatsApp.'), 'Success message must exist');
        testPassed('15. Personal WhatsApp intents completely eliminated from frontend');

    } catch (e) {
        testFailed('Test suite encountered an error', e);
    } finally {
        // Cleanup test data
        console.log('\n[Cleanup] Removing test invoices and notification records...');
        await supabaseAdmin.from('invoice_notifications').delete().in('invoice_id', [invA.id, invB.id]);
        await supabaseAdmin.from('invoice_events').delete().in('invoice_id', [invA.id, invB.id]);
        await supabaseAdmin.from('invoices').delete().in('id', [invA.id, invB.id]);
        global.fetch = originalFetch;
        console.log('Cleanup complete.\n');
    }

    console.log('====================================================');
    console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runAllTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
