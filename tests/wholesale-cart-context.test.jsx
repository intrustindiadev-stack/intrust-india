/**
 * Unit Tests — WholesaleCartContext and formatINR helper
 *
 * Uses react-dom/server (same as tests/wholesale-shop-ui.test.jsx) without extra dependencies.
 */
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { WholesaleCartProvider, useWholesaleCart, formatINR } = require('../components/merchant/shopping/WholesaleCartContext');

describe('WholesaleCartContext & Helpers', () => {
    test('formatINR formats numbers with Indian grouping and two decimal places', () => {
        expect(formatINR(1234.5)).toBe('1,234.50');
        expect(formatINR(100000)).toBe('1,00,000.00');
        expect(formatINR(0)).toBe('0.00');
        expect(formatINR(null)).toBe('0.00');
        expect(formatINR(undefined)).toBe('0.00');
    });

    test('renders WholesaleCartProvider and consumes initial context', () => {
        const mockProducts = [
            {
                id: 'prod-1',
                title: 'Parle-G Gold 1kg',
                wholesale_price_paise: 10000,
                suggested_retail_price_paise: 12000,
                mrp_paise: 13000,
                platform_price_paise: 12500,
                admin_stock: 10,
                gst_percentage: 18,
            },
        ];
        const mockMerchant = { id: 'merch-1', wallet_balance_paise: 500000 };

        function TestConsumer() {
            const { cartItems, totalUnits, merchantBalancePaise } = useWholesaleCart();
            return React.createElement('div', null,
                React.createElement('span', { id: 'units' }, totalUnits),
                React.createElement('span', { id: 'balance' }, merchantBalancePaise),
                React.createElement('span', { id: 'items-len' }, cartItems.length)
            );
        }

        const html = renderToStaticMarkup(
            React.createElement(WholesaleCartProvider, { products: mockProducts, merchant: mockMerchant },
                React.createElement(TestConsumer)
            )
        );

        expect(html).toContain('id="units">0<');
        expect(html).toContain('id="balance">500000<');
        expect(html).toContain('id="items-len">0<');
    });
});
