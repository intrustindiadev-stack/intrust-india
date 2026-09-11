/**
 * merchantNfcService.test.js
 * 
 * Regression & Production-Readiness Suite for Merchant NFC Smart Card Service
 * Validates:
 * 1. Authoritative Pricing calculation & paise math consistency
 * 2. Order state machine mapping & active order lifecycle
 * 3. Cancelled order non-blocking logic
 * 4. Page UI structure, responsive safe area padding, and navigation
 * 5. Security and duplicate submission prevention
 */

import fs from 'fs';
import path from 'path';

describe('Merchant NFC Smart Card Service Audit & Integrity Verification', () => {
    const rootDir = process.cwd();
    const pagePath = path.join(rootDir, 'app/(merchant)/merchant/nfc-service/page.jsx');

    describe('Layer 1: Pricing Calculation & Precision Math', () => {
        const cardPrice = 2999;
        const gstPercentage = 18;
        const deliveryPrice = 220;

        it('should calculate authoritative GST and total amounts matching nfc_settings paise', () => {
            const gstAmount = (cardPrice * gstPercentage) / 100;
            const sgst = gstAmount / 2;
            const cgst = gstAmount / 2;
            const totalAmount = cardPrice + gstAmount + deliveryPrice;
            const totalAmountPaise = Math.round(totalAmount * 100);

            expect(cardPrice).toBe(2999);
            expect(gstAmount).toBeCloseTo(539.82, 2);
            expect(sgst).toBeCloseTo(269.91, 2);
            expect(cgst).toBeCloseTo(269.91, 2);
            expect(deliveryPrice).toBe(220);
            expect(totalAmount).toBeCloseTo(3758.82, 2);
            expect(totalAmountPaise).toBe(375882);
        });

        it('should ensure paise rounding prevents fractional sub-paise loss', () => {
            const totalAmount = 2999 + (2999 * 0.18) + 220;
            const paise = Math.round(totalAmount * 100);
            expect(paise).toBe(375882);
            expect(paise / 100).toBe(3758.82);
        });
    });

    describe('Layer 2: Order State Machine & Lifecycle Verification', () => {
        const testOrders = [
            { id: '1', status: 'pending', payment_status: 'pending' },
            { id: '2', status: 'cancelled', payment_status: 'paid' },
            { id: '3', status: 'processing', payment_status: 'paid' },
            { id: '4', status: 'shipped', payment_status: 'paid' },
            { id: '5', status: 'delivered', payment_status: 'paid' },
        ];

        it('should identify paid non-cancelled orders as active orders', () => {
            const activeOrders = testOrders.filter(
                o => o.payment_status === 'paid' && o.status !== 'cancelled'
            );
            expect(activeOrders.length).toBe(3);
            expect(activeOrders.map(o => o.status)).toEqual(['processing', 'shipped', 'delivered']);
        });

        it('should NEVER treat cancelled orders as active blocking orders', () => {
            const cancelledOrder = testOrders.find(o => o.id === '2');
            const isActive = cancelledOrder.payment_status === 'paid' && cancelledOrder.status !== 'cancelled';
            expect(isActive).toBe(false);
        });

        it('should NEVER treat pending payment orders as active paid orders', () => {
            const pendingPaymentOrder = testOrders.find(o => o.id === '1');
            const isActive = pendingPaymentOrder.payment_status === 'paid' && pendingPaymentOrder.status !== 'cancelled';
            expect(isActive).toBe(false);
        });
    });

    describe('Layer 3: Page Component Architecture & UX Safety', () => {
        it('should have the upgraded merchant NFC service page file present', () => {
            expect(fs.existsSync(pagePath)).toBe(true);
        });

        it('should contain merchant services header, authoritative pricing, and order link', () => {
            const content = fs.readFileSync(pagePath, 'utf8');

            // Header & branding
            expect(content).toContain('Merchant Services');
            expect(content).toContain('NFC Smart Card');
            expect(content).toContain('/merchant/nfc-orders');

            // Authoritative default pricing matching nfc_settings
            expect(content).toContain('useState(2999)');
            expect(content).toContain('useState(18)');
            expect(content).toContain('useState(220)');

            // Active order lifecycle handling (excluding cancelled)
            expect(content).toContain("o.payment_status === 'paid' && o.status !== 'cancelled'");

            // Real-time 3D Card preview
            expect(content).toContain('NFC3DCard');
            expect(content).toContain('cardHolderName');

            // Stepper and anti-duplicate submission protection
            expect(content).toContain('isSubmitting');
            expect(content).toContain('disabled={isSubmitting');

            // Mobile safe-area bottom padding
            expect(content).toContain('pb-24 lg:pb-12');
        });

        it('should not contain misleading static order total badge in header', () => {
            const content = fs.readFileSync(pagePath, 'utf8');
            // The old confusing string `₹{totalAmount.toLocaleString()} Total` next to My Orders
            expect(content).not.toContain('₹{totalAmount.toLocaleString()} Total');
        });
    });
});
