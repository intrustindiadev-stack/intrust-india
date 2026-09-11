/**
 * merchantProductionReadiness.test.js
 * 
 * Regression & Production-Readiness Suite for the Merchant Panel
 * Validates:
 * 1. Merchant Error Boundaries & 404 (error.jsx, not-found.jsx)
 * 2. Merchant Inventory Isolation & Differentiated Empty States
 * 3. Mobile Navigation Accessibility & Safe-Area Inset Handling
 * 4. P1 Operations & Financial resilience (Toast integration, Retry handling)
 */

import fs from 'fs';
import path from 'path';

describe('Merchant Production Readiness Audit Verification', () => {
    const rootDir = process.cwd();

    describe('Layer 1: Merchant Error Boundaries and 404', () => {
        it('should have a dedicated merchant error boundary (app/(merchant)/merchant/error.jsx)', () => {
            const errorBoundaryPath = path.join(rootDir, 'app/(merchant)/merchant/error.jsx');
            expect(fs.existsSync(errorBoundaryPath)).toBe(true);

            const content = fs.readFileSync(errorBoundaryPath, 'utf8');
            expect(content).toContain("'use client'");
            expect(content).toContain('reset');
            expect(content).toContain('Try Again');
            expect(content).toContain('/merchant/dashboard');
        });

        it('should have a dedicated merchant 404 not-found page (app/(merchant)/merchant/not-found.jsx)', () => {
            const notFoundPath = path.join(rootDir, 'app/(merchant)/merchant/not-found.jsx');
            expect(fs.existsSync(notFoundPath)).toBe(true);

            const content = fs.readFileSync(notFoundPath, 'utf8');
            expect(content).toContain('Page Not Found');
            expect(content).toContain('/merchant/dashboard');
            expect(content).toContain('/merchant/shopping/orders');
        });
    });

    describe('Layer 2: P0 Merchant Inventory & Wholesale Integrity', () => {
        it('should enforce merchant isolation in MerchantInventoryClient updates', () => {
            const inventoryClientPath = path.join(
                rootDir,
                'app/(merchant)/merchant/shopping/inventory/MerchantInventoryClient.jsx'
            );
            expect(fs.existsSync(inventoryClientPath)).toBe(true);

            const content = fs.readFileSync(inventoryClientPath, 'utf8');
            // Check that updates are strictly scoped to merchant.id
            expect(content).toContain(".eq('merchant_id', merchant.id)");
            // Check that differentiated empty state is supported
            expect(content).toContain('No products found matching');
            expect(content).toContain('Clear Filter');
        });

        it('should have proper grid layout and accessible quantity controls in WholesaleClient', () => {
            const wholesalePath = path.join(
                rootDir,
                'app/(merchant)/merchant/shopping/wholesale/WholesaleClient.jsx'
            );
            expect(fs.existsSync(wholesalePath)).toBe(true);

            const content = fs.readFileSync(wholesalePath, 'utf8');
            expect(content).toContain('col-span-full');
            expect(content).toContain('Decrease quantity of');
            expect(content).toContain('Increase quantity of');
        });
    });

    describe('Layer 3: P1 Financial & Operations Resilience', () => {
        it('should have retry buttons and skeleton rows in withdrawals page', () => {
            const withdrawalsPath = path.join(
                rootDir,
                'app/(merchant)/merchant/wallet/withdrawals/page.jsx'
            );
            expect(fs.existsSync(withdrawalsPath)).toBe(true);

            const content = fs.readFileSync(withdrawalsPath, 'utf8');
            expect(content).toContain('Retry');
            expect(content).toContain('loading && requests.length === 0');
            expect(content).toContain('toast.success');
        });

        it('should have retry action and skeleton loaders in wallet transactions page', () => {
            const txPath = path.join(
                rootDir,
                'app/(merchant)/merchant/wallet/transactions/page.jsx'
            );
            expect(fs.existsSync(txPath)).toBe(true);

            const content = fs.readFileSync(txPath, 'utf8');
            expect(content).toContain('setError');
            expect(content).toContain('Retry');
            expect(content).toContain('!loading && !error && transactions.length === 0');
        });

        it('should have unified toast feedback in auto-mode and AI Grow investments', () => {
            const autoModePath = path.join(
                rootDir,
                'app/(merchant)/merchant/shopping/auto-mode/page.jsx'
            );
            const contentAuto = fs.readFileSync(autoModePath, 'utf8');
            expect(contentAuto).toContain("import { toast } from 'react-hot-toast'");
            expect(contentAuto).toContain('toast.success');
            expect(contentAuto).toContain('aria-label=');

            const aiGrowPath = path.join(
                rootDir,
                'app/(merchant)/merchant/investments/page.jsx'
            );
            const contentAIGrow = fs.readFileSync(aiGrowPath, 'utf8');
            expect(contentAIGrow).toContain("import { toast } from 'react-hot-toast'");
            expect(contentAIGrow).toContain('toast.loading');
        });

        it('should have error state and retry in udhari page', () => {
            const udhariPath = path.join(
                rootDir,
                'app/(merchant)/merchant/udhari/page.jsx'
            );
            const content = fs.readFileSync(udhariPath, 'utf8');
            expect(content).toContain('setError');
            expect(content).toContain('Retry');
            expect(content).toContain('aria-label="Close approve modal"');
        });
    });

    describe('Layer 4: Mobile Safe Area & Navigation Polish', () => {
        it('should apply safe-area inset bottom padding in MerchantBottomNav', () => {
            const bottomNavPath = path.join(
                rootDir,
                'components/layout/merchant/MerchantBottomNav.jsx'
            );
            expect(fs.existsSync(bottomNavPath)).toBe(true);

            const content = fs.readFileSync(bottomNavPath, 'utf8');
            expect(content).toContain('env(safe-area-inset-bottom');
            expect(content).toContain('aria-label={item.label}');
        });

        it('should route merchant payout request notifications to merchant wallet withdrawals', () => {
            const bellPath = path.join(
                rootDir,
                'components/notifications/NotificationBell.jsx'
            );
            const content = fs.readFileSync(bellPath, 'utf8');
            expect(content).toContain("else if (isMerchant) router.push('/merchant/wallet/withdrawals')");
        });
    });
});
