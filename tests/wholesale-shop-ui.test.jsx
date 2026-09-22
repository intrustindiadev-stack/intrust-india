/**
 * Unit Tests — Merchant Wholesale Shop UI/UX Refactor (B2B product card + sticky cart bar)
 *
 * Tests covering:
 *   1. WholesaleProductCard shows the wholesale price as the primary number
 *   2. MSRP renders struck-through from the highest real retail benchmark (MRP fallback)
 *   3. Est. Margin pill computes (MSRP - wholesale) / wholesale as a rounded percent
 *   4. Margin/MSRP UI is suppressed when there is no retail upside
 *   5. Touch targets stay >= 44x44px (ADD button and the +/- stepper controls)
 *   6. Quantity stepper replaces the ADD button once the product is in the order
 *   7. Out-of-stock products render a disabled state instead of an action rail
 *   8. WholesaleStickyCartBar renders nothing while the order is empty
 *   9. Sticky cart bar is mobile-only (md:hidden), keeps z-40/shadow, and opens the Order Slip
 *
 * Run:
 *   npx jest tests/wholesale-shop-ui.test.jsx
 */
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

jest.mock('next/image', () => {
    const MockImage = (props) => React.createElement('img', { src: props.src, alt: props.alt });
    MockImage.displayName = 'MockImage';
    return { __esModule: true, default: MockImage };
});

const WholesaleProductCard = require('../components/merchant/shopping/WholesaleProductCard').default;
const WholesaleStickyCartBar = require('../components/merchant/shopping/WholesaleStickyCartBar').default;

const baseProduct = {
    id: 'p1',
    title: 'AAKASH CREAM & ONION CHIPS 32G',
    category: 'Groceries',
    sub_category: 'Snacks',
    product_images: [],
    wholesale_price_paise: 1200,          // ₹12 wholesale
    suggested_retail_price_paise: 1200,   // seeded equal to wholesale (real-data case)
    mrp_paise: 1500,                      // ₹15 MSRP → +25% margin
    admin_stock: 23,
};

describe('WholesaleProductCard', () => {
    test('shows wholesale price, struck-through MSRP and the Est. Margin pill', () => {
        const html = renderToStaticMarkup(
            React.createElement(WholesaleProductCard, { product: baseProduct, qty: 0 })
        );
        expect(html).toContain('₹12');                 // wholesale price (primary)
        expect(html).toContain('₹15');                 // MSRP benchmark from mrp_paise
        expect(html).toContain('line-through');
        expect(html).toContain('+25%');                // margin pill
        expect(html).toContain('Est. margin ₹3');
        expect(html).toContain('23 left');
        expect(html).toContain('Add to Order');
    });

    test('every touch control is >= 44x44px', () => {
        const emptyHtml = renderToStaticMarkup(
            React.createElement(WholesaleProductCard, { product: baseProduct, qty: 0 })
        );
        expect(emptyHtml).toContain('min-h-[44px]');

        const stepperHtml = renderToStaticMarkup(
            React.createElement(WholesaleProductCard, { product: baseProduct, qty: 3 })
        );
        expect(stepperHtml).toContain('w-11 h-11 min-w-[44px] min-h-[44px]');
        expect(stepperHtml).toContain('Increase quantity of AAKASH');
        expect(stepperHtml).toContain('Decrease quantity of AAKASH');
        expect(stepperHtml).toContain('>3<');          // current quantity
        expect(stepperHtml).not.toContain('Add to Order');
    });

    test('hides the margin pill and MSRP when there is no upside', () => {
        const flat = { ...baseProduct, mrp_paise: 1200, suggested_retail_price_paise: 1200 };
        const html = renderToStaticMarkup(
            React.createElement(WholesaleProductCard, { product: flat, qty: 0 })
        );
        expect(html).not.toContain('+0%');
        expect(html).not.toContain('Est. margin');
        expect(html).not.toContain('line-through');
    });

    test('renders the out-of-stock state instead of a stepper', () => {
        const oos = { ...baseProduct, admin_stock: 0 };
        const html = renderToStaticMarkup(
            React.createElement(WholesaleProductCard, { product: oos, qty: 0 })
        );
        expect(html).toContain('Out of Stock');
        expect(html).not.toContain('Add to Order');
    });
});

describe('WholesaleStickyCartBar', () => {
    test('renders nothing while the order is empty', () => {
        const html = renderToStaticMarkup(
            React.createElement(WholesaleStickyCartBar, { itemCount: 0, total: 0 })
        );
        expect(html).toBe('');
    });

    test('renders totals + View Order Slip as a mobile-only sticky bar', () => {
        const html = renderToStaticMarkup(
            React.createElement(WholesaleStickyCartBar, {
                itemCount: 12,
                lineCount: 3,
                total: 3450.5,
                estMargin: 900,
                marginPercent: 26,
                onViewOrder: () => {},
            })
        );
        expect(html).toContain('12 units in order');
        expect(html).toContain('₹3,450.50');
        expect(html).toContain('+26%');
        expect(html).toContain('View Order Slip');
        expect(html).toContain('md:hidden');
        expect(html).toContain('shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]');
        expect(html).toContain('z-40');
        expect(html).toContain('wholesale-sticky-cart-target'); // fly-to-cart anchor
        expect(html).toContain('min-h-[44px]');
    });
});
