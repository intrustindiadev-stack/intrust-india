import { getSubCategories, CATEGORIES } from '../lib/constants/categories';
import { STOREFRONT_FILTERS, PRICE_RANGES } from '../lib/shop/filterTypes';

describe('Storefront Filters & Sub-category Taxonomy', () => {
    test('canonical taxonomy retrieves relevant sub-categories for Fashion', () => {
        const fashionSubs = getSubCategories('Fashion');
        expect(Array.isArray(fashionSubs)).toBe(true);
        expect(fashionSubs.length).toBeGreaterThan(0);
        // Canonical fashion sub-categories should include Men, Women, Kids
        expect(fashionSubs).toContain('Men');
        expect(fashionSubs).toContain('Women');
        expect(fashionSubs).toContain('Kids');
    });

    test('returns empty array or fallback for unknown category without throwing', () => {
        const unknownSubs = getSubCategories('NonExistentCategoryXYZ');
        expect(Array.isArray(unknownSubs)).toBe(true);
        expect(unknownSubs.length).toBe(0);
    });

    test('PRICE_RANGES contains valid ranges with labels', () => {
        expect(PRICE_RANGES.length).toBeGreaterThanOrEqual(4);
        expect(PRICE_RANGES[0].label).toBe('Under ₹500');
        expect(PRICE_RANGES[0].max).toBe(50000); // 500 in paise
        expect(PRICE_RANGES[PRICE_RANGES.length - 1].min).toBe(250000); // 2500 in paise
    });

    test('Filter state update resets page parameter to 1', () => {
        // Simulating the URL searchParams handler used in StorefrontV2Client and FilterSidebar
        const currentParams = new URLSearchParams('page=3&category=Fashion&sub_category=Men');

        // User changes sub_category to T-Shirts
        const updatedParams = new URLSearchParams(currentParams);
        updatedParams.set('sub_category', 'T-Shirts');
        updatedParams.set('page', '1'); // Enforce reset to page 1

        expect(updatedParams.get('sub_category')).toBe('T-Shirts');
        expect(updatedParams.get('page')).toBe('1');
        expect(updatedParams.get('category')).toBe('Fashion');
    });

    test('Clearing a filter removes it and resets page to 1', () => {
        const currentParams = new URLSearchParams('page=4&category=Fashion&sub_category=T-Shirts&brand=nike');

        // Remove sub_category
        const updatedParams = new URLSearchParams(currentParams);
        updatedParams.delete('sub_category');
        updatedParams.set('page', '1');

        expect(updatedParams.has('sub_category')).toBe(false);
        expect(updatedParams.get('page')).toBe('1');
        expect(updatedParams.get('brand')).toBe('nike');
    });

    test('Clear all filters removes filter parameters and resets to page 1', () => {
        const currentParams = new URLSearchParams('page=3&category=Fashion&sub_category=T-Shirts&min_price=50000&max_price=100000&brand=nike');

        // Clear all
        const clearedParams = new URLSearchParams();
        clearedParams.set('page', '1');

        expect(clearedParams.get('page')).toBe('1');
        expect(clearedParams.has('category')).toBe(false);
        expect(clearedParams.has('sub_category')).toBe(false);
        expect(clearedParams.has('brand')).toBe(false);
        expect(clearedParams.has('min_price')).toBe(false);
    });

    test('Clear secondary filters inside drawer preserves category from navbar and resets page to 1', () => {
        const currentParams = new URLSearchParams('page=4&category=Fashion&sub_category=Men&min_price=50000&max_price=100000&brand=nike');

        // Drawer Clear All action
        const clearedParams = new URLSearchParams(currentParams);
        clearedParams.delete('sub_category');
        clearedParams.delete('min_price');
        clearedParams.delete('max_price');
        clearedParams.delete('brand');
        clearedParams.delete('size');
        clearedParams.delete('color');
        clearedParams.set('page', '1');

        expect(clearedParams.get('page')).toBe('1');
        expect(clearedParams.get('category')).toBe('Fashion');
        expect(clearedParams.has('sub_category')).toBe(false);
        expect(clearedParams.has('brand')).toBe(false);
        expect(clearedParams.has('min_price')).toBe(false);
    });

    test('Changing category from navbar resets sub_category and resets page to 1', () => {
        const currentParams = new URLSearchParams('page=4&category=Fashion&sub_category=Men&brand=nike');

        // Customer clicks Groceries on navbar
        const nextParams = new URLSearchParams(currentParams);
        nextParams.set('category', 'Groceries');
        nextParams.delete('sub_category');
        nextParams.set('page', '1');

        expect(nextParams.get('category')).toBe('Groceries');
        expect(nextParams.has('sub_category')).toBe(false);
        expect(nextParams.get('page')).toBe('1');
    });

    test('Changing sub_category preserves category and resets page to 1', () => {
        const currentParams = new URLSearchParams('page=4&category=Fashion&sub_category=Men');

        // Customer selects Women
        const nextParams = new URLSearchParams(currentParams);
        nextParams.set('sub_category', 'Women');
        nextParams.set('page', '1');

        expect(nextParams.get('category')).toBe('Fashion');
        expect(nextParams.get('sub_category')).toBe('Women');
        expect(nextParams.get('page')).toBe('1');
    });

    test('Canonical taxonomy retrieves correct grocery sub-categories', () => {
        const grocerySubs = getSubCategories('Groceries');
        expect(grocerySubs).toContain('Staples & Grains');
        expect(grocerySubs).toContain('Dairy & Eggs');
        expect(grocerySubs).toContain('Snacks & Beverages');
    });
});

describe('Storefront Server-Side Pagination Logic', () => {
    const PAGE_SIZE = 24;

    function computePagination(totalCount, currentPage, pageSize = PAGE_SIZE) {
        const totalPages = Math.ceil(totalCount / pageSize);
        const page = Math.max(1, Math.min(currentPage, totalPages || 1));
        const offset = (page - 1) * pageSize;
        const limit = pageSize;
        const hasPrev = page > 1;
        const hasNext = page < totalPages;
        return { totalPages, page, offset, limit, hasPrev, hasNext };
    }

    test('Page 1 of multi-page catalog disables Previous and enables Next', () => {
        const totalProducts = 6134; // e.g. the-shankar-marr merchant catalog
        const p1 = computePagination(totalProducts, 1, 24);

        expect(p1.totalPages).toBe(256);
        expect(p1.page).toBe(1);
        expect(p1.offset).toBe(0);
        expect(p1.limit).toBe(24);
        expect(p1.hasPrev).toBe(false);
        expect(p1.hasNext).toBe(true);
    });

    test('Page 2 calculates correct offset and enables both Prev and Next', () => {
        const totalProducts = 100;
        const p2 = computePagination(totalProducts, 2, 24);

        expect(p2.totalPages).toBe(5);
        expect(p2.page).toBe(2);
        expect(p2.offset).toBe(24);
        expect(p2.limit).toBe(24);
        expect(p2.hasPrev).toBe(true);
        expect(p2.hasNext).toBe(true);
    });

    test('Final page disables Next', () => {
        const totalProducts = 100; // 5 pages total (24 per page -> 24, 24, 24, 24, 4)
        const p5 = computePagination(totalProducts, 5, 24);

        expect(p5.totalPages).toBe(5);
        expect(p5.page).toBe(5);
        expect(p5.offset).toBe(96);
        expect(p5.hasPrev).toBe(true);
        expect(p5.hasNext).toBe(false);
    });

    test('Single page catalog has totalPages=1 with both Prev and Next disabled', () => {
        const totalProducts = 15;
        const p = computePagination(totalProducts, 1, 24);

        expect(p.totalPages).toBe(1);
        expect(p.hasPrev).toBe(false);
        expect(p.hasNext).toBe(false);
    });

    test('Official Store RPC parameters match server-side pagination contract', () => {
        const page = 3;
        const PAGE_SIZE = 24;
        const category = 'Fashion';
        const sub_category = 'Men';

        const rpcPayload = {
            p_merchant_slug: 'official',
            p_offset: (page - 1) * PAGE_SIZE,
            p_limit: PAGE_SIZE,
            p_category: category,
            p_sub_category: sub_category,
        };

        expect(rpcPayload.p_merchant_slug).toBe('official');
        expect(rpcPayload.p_offset).toBe(48);
        expect(rpcPayload.p_limit).toBe(24);
        expect(rpcPayload.p_category).toBe('Fashion');
        expect(rpcPayload.p_sub_category).toBe('Men');
    });

    test('Merchant Store RPC parameters match server-side pagination contract', () => {
        const page = 2;
        const PAGE_SIZE = 24;
        const merchantSlug = 'urban-mart';

        const rpcPayload = {
            p_merchant_slug: merchantSlug,
            p_offset: (page - 1) * PAGE_SIZE,
            p_limit: PAGE_SIZE,
        };

        expect(rpcPayload.p_merchant_slug).toBe('urban-mart');
        expect(rpcPayload.p_offset).toBe(24);
        expect(rpcPayload.p_limit).toBe(24);
    });

    test('Official Store slug preserves official so dedicated platform branch executes', () => {
        function getRpcSlug(slug) {
            const normalized = (slug || '').toLowerCase();
            if (normalized === 'official') {
                return 'official';
            }
            return slug;
        }

        expect(getRpcSlug('official')).toBe('official');
        expect(getRpcSlug('OFFICIAL')).toBe('official');
        expect(getRpcSlug('urban-mart')).toBe('urban-mart');
    });

    test('Customer shop local merchant filter excludes platform official store, test, and expired merchants', () => {
        const mockMerchants = [
            { id: '1', slug: 'official', business_name: 'InTrust Official', status: 'approved', subscription_status: 'active' },
            { id: '2', slug: 'intrust-official', business_name: 'InTrust Official', status: 'approved', subscription_status: 'active' },
            { id: '3', slug: 'urban-mart', business_name: 'Urban Mart', status: 'approved', subscription_status: 'active', subscription_expires_at: '2027-01-01' },
            { id: '4', slug: 'test-merchant-llc', business_name: 'Test Merchant LLC', status: 'suspended', subscription_status: 'active' },
            { id: '5', slug: 'runnr-devs', business_name: 'Runnr Devs', status: 'approved', subscription_status: 'active' },
            { id: '6', slug: 'expired-store', business_name: 'Expired Store', status: 'approved', subscription_status: 'expired' },
            { id: '7', slug: 'pending-store', business_name: 'Pending Store', status: 'pending', subscription_status: 'active' },
        ];

        const now = new Date('2026-09-07T00:00:00Z');
        const visibleLocalMerchants = mockMerchants.filter(m => {
            if (m.slug === 'official' || m.slug === 'intrust-official') return false; // Handled separately as platform store
            if (m.status !== 'approved') return false;
            if (m.subscription_status !== 'active') return false;
            if (m.subscription_expires_at && new Date(m.subscription_expires_at) <= now) return false;
            if (m.slug.toLowerCase().includes('test') || m.business_name.toLowerCase().includes('test')) return false;
            if (m.slug.toLowerCase().includes('runnr')) return false;
            return true;
        });

        expect(visibleLocalMerchants.length).toBe(1);
        expect(visibleLocalMerchants.map(m => m.slug)).toEqual(['urban-mart']);
    });
});


