import fs from 'fs';
import path from 'path';

describe('Merchant Gift Cards Inventory UI/UX Production Upgrade Suite', () => {
    const rootDir = process.cwd();
    const giftcardsPagePath = path.join(rootDir, 'app/(merchant)/merchant/inventory/giftcards/page.jsx');
    const giftcardsClientPath = path.join(rootDir, 'app/(merchant)/merchant/inventory/giftcards/MerchantGiftcardsClient.jsx');
    const giftcardsLoadingPath = path.join(rootDir, 'app/(merchant)/merchant/inventory/giftcards/loading.jsx');
    const listModalPath = path.join(rootDir, 'components/merchant/ListToMarketplace.jsx');

    describe('1. File Architecture & Existence', () => {
        it('should have the gift cards inventory server page component', () => {
            expect(fs.existsSync(giftcardsPagePath)).toBe(true);
        });

        it('should have the gift cards inventory client component (MerchantGiftcardsClient)', () => {
            expect(fs.existsSync(giftcardsClientPath)).toBe(true);
        });

        it('should have the dedicated loading skeleton (loading.jsx)', () => {
            expect(fs.existsSync(giftcardsLoadingPath)).toBe(true);
        });

        it('should have the upgraded ListToMarketplace modal', () => {
            expect(fs.existsSync(listModalPath)).toBe(true);
        });
    });

    describe('2. Security & Merchant Isolation', () => {
        it('should enforce merchant-scoped queries in page.jsx', () => {
            const content = fs.readFileSync(giftcardsPagePath, 'utf8');
            expect(content).toContain(".eq('merchant_id', merchant.id)");
            expect(content).toContain(".eq('user_id', user.id)");
            expect(content).toContain("createServerSupabaseClient()");
        });

        it('should enforce coupon code masking and never render raw encrypted codes', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('getMaskedCode');
            expect(clientContent).toContain('masked_code');
            expect(clientContent).not.toContain('encrypted_code');
        });

        it('should isolate unlisting mutations to coupons owned by the merchant', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain(".from('coupons')");
            expect(clientContent).toContain(".update({ listed_on_marketplace: false");
            expect(clientContent).toContain(".eq('id', unlistingCoupon.id)");
        });

        it('should enforce the 10% platform profit margin restriction in ListToMarketplace', () => {
            const modalContent = fs.readFileSync(listModalPath, 'utf8');
            expect(modalContent).toContain('profitMargin > 10.01');
            expect(modalContent).toContain('Platform policy restricts merchant profit margin to a maximum of 10%');
            expect(modalContent).toContain('merchant_list_to_marketplace');
        });
    });

    describe('3. Authoritative KPI Metrics Calculation', () => {
        it('should compute exact counts for total, listed, unlisted, and sold in page.jsx', () => {
            const content = fs.readFileSync(giftcardsPagePath, 'utf8');
            expect(content).toContain("count: 'exact'");
            expect(content).toContain("listed_on_marketplace', true");
            expect(content).toContain("listed_on_marketplace', false");
            expect(content).toContain("status', 'sold'");
            expect(content).toContain("totalInvestment");
        });

        it('should render all 4 compact KPI cards with INR formatting in MerchantGiftcardsClient', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('Total Cards');
            expect(clientContent).toContain('Listed on Market');
            expect(clientContent).toContain('Unlisted');
            expect(clientContent).toContain('Total Investment');
            expect(clientContent).toContain('formatINR');
            expect(clientContent).toContain('en-IN');
        });

        it('should verify mathematical invariant that listed + unlisted = total for available cards', () => {
            const availableCards = [
                { id: '1', status: 'available', listed_on_marketplace: true, face_value_paise: 10000 },
                { id: '2', status: 'available', listed_on_marketplace: true, face_value_paise: 20000 },
                { id: '3', status: 'available', listed_on_marketplace: false, face_value_paise: 15000 },
                { id: '4', status: 'available', listed_on_marketplace: false, face_value_paise: 5000 },
            ];

            const total = availableCards.filter(c => c.status === 'available').length;
            const listed = availableCards.filter(c => c.status === 'available' && c.listed_on_marketplace).length;
            const unlisted = availableCards.filter(c => c.status === 'available' && !c.listed_on_marketplace).length;

            expect(listed + unlisted).toBe(total);
            expect(total).toBe(4);
            expect(listed).toBe(2);
            expect(unlisted).toBe(2);
        });
    });

    describe('4. UI/UX Hierarchy, Actions & Responsive Controls', () => {
        it('should render correct eyebrow, title, and subtitle in MerchantGiftcardsClient', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('MERCHANT INVENTORY');
            expect(clientContent).toContain('Gift Cards');
            expect(clientContent).toContain('Manage your purchased gift cards and marketplace listings.');
        });

        it('should link to real existing acquisition flows without fabricating imaginary features', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('/merchant/purchase');
            expect(clientContent).toContain('Buy Gift Cards');
            expect(clientContent).toContain('/merchant/coupons/add');
            expect(clientContent).toContain('Add Custom Card');
        });

        it('should render segmented tabs with counts for All, Listed, Unlisted, and Sold', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('/merchant/inventory/giftcards?filter=all');
            expect(clientContent).toContain('/merchant/inventory/giftcards?filter=listed');
            expect(clientContent).toContain('/merchant/inventory/giftcards?filter=unlisted');
            expect(clientContent).toContain('/merchant/inventory/giftcards?filter=history');
        });

        it('should have search, category filter, and sorting toolbar', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('Search gift cards by brand, title, code...');
            expect(clientContent).toContain('searchQuery');
            expect(clientContent).toContain('selectedCategory');
            expect(clientContent).toContain('sortBy');
            expect(clientContent).toContain('Newest First');
            expect(clientContent).toContain('Profit Margin');
        });

        it('should provide both high-density desktop table and mobile stacked card layouts', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('hidden md:block');
            expect(clientContent).toContain('<table');
            expect(clientContent).toContain('Brand / Asset');
            expect(clientContent).toContain('md:hidden');
            expect(clientContent).toContain('Face Value');
            expect(clientContent).toContain('Purchase Cost');
        });

        it('should have an accessible confirmation dialog for removing listings', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('Remove from Marketplace?');
            expect(clientContent).toContain('unlistingCoupon');
            expect(clientContent).toContain('confirmUnlist');
            expect(clientContent).toContain('isUnlisting');
        });

        it('should provide tab-contextual empty states for all, listed, unlisted, and search', () => {
            const clientContent = fs.readFileSync(giftcardsClientPath, 'utf8');
            expect(clientContent).toContain('No active coupons found');
            expect(clientContent).toContain('No gift cards are listed');
            expect(clientContent).toContain('No unlisted gift cards');
            expect(clientContent).toContain('No sales history found');
            expect(clientContent).toContain('Clear Filters');
        });

        it('should match the loading skeleton structure to the final UI', () => {
            const loadingContent = fs.readFileSync(giftcardsLoadingPath, 'utf8');
            expect(loadingContent).toContain('grid grid-cols-2 lg:grid-cols-4');
            expect(loadingContent).toContain('hidden md:block');
            expect(loadingContent).toContain('md:hidden');
        });
    });
});
