import {
    calculateMerchantOrderKPIs,
    filterOrdersByPeriod,
    isValidOrder,
    isPackedOrder,
    isPendingActionOrder,
    isSettledOrder,
    formatPaise,
    getPeriodBoundary
} from '../lib/merchant/orderMetrics.js';

describe('Merchant Orders KPI & Financial Metrics Test Suite', () => {
    const fixedNow = new Date('2026-09-11T12:00:00.000Z');

    const sampleOrders = [
        // 1. Valid Pending Order placed today (1 hour ago) - NOT a sale until packed!
        {
            id: 'ord-101',
            merchant_id: 'merchant-aaa',
            customer_name: 'Aarav Sharma',
            total_amount_paise: 250000, // ₹2,500
            merchant_profit_paise: 35000, // ₹350 contingent
            delivery_status: 'pending',
            settlement_status: 'pending',
            status: 'completed',
            payment_status: 'paid',
            created_at: '2026-09-11T11:00:00.000Z'
        },
        // 2. Valid Packed & Settled Order placed 2 days ago
        {
            id: 'ord-102',
            merchant_id: 'merchant-aaa',
            customer_name: 'Priya Patel',
            total_amount_paise: 400000, // ₹4,000
            merchant_profit_paise: 56000, // ₹560 settled
            delivery_status: 'packed',
            settlement_status: 'settled',
            status: 'completed',
            payment_status: 'paid',
            created_at: '2026-09-09T10:00:00.000Z',
            packed_at: '2026-09-09T10:30:00.000Z'
        },
        // 3. Valid Delivered & Settled Order placed 10 days ago (this month)
        {
            id: 'ord-103',
            merchant_id: 'merchant-aaa',
            customer_name: 'Rahul Verma',
            total_amount_paise: 150000, // ₹1,500
            merchant_profit_paise: 21000, // ₹210 settled
            delivery_status: 'delivered',
            settlement_status: 'settled',
            status: 'completed',
            payment_status: 'paid',
            created_at: '2026-09-01T14:00:00.000Z',
            packed_at: '2026-09-01T15:00:00.000Z'
        },
        // 4. Cancelled Order placed today
        {
            id: 'ord-104',
            merchant_id: 'merchant-aaa',
            customer_name: 'Neha Gupta',
            total_amount_paise: 300000, // ₹3,000 (MUST BE EXCLUDED FROM SALES)
            merchant_profit_paise: 42000, // (MUST BE EXCLUDED FROM EARNINGS)
            delivery_status: 'cancelled',
            settlement_status: 'pending',
            status: 'cancelled',
            payment_status: 'refunded',
            created_at: '2026-09-11T09:00:00.000Z'
        },
        // 5. Settled Zero Order (₹0 profit margin) placed 5 days ago
        {
            id: 'ord-105',
            merchant_id: 'merchant-aaa',
            customer_name: 'Vikram Singh',
            total_amount_paise: 100000, // ₹1,000
            merchant_profit_paise: 0,
            delivery_status: 'delivered',
            settlement_status: 'settled_zero',
            status: 'completed',
            payment_status: 'paid',
            created_at: '2026-09-06T10:00:00.000Z',
            packed_at: '2026-09-06T11:00:00.000Z'
        },
        // 6. Admin Takeover Order (settled reduced profit) placed 4 days ago
        {
            id: 'ord-106',
            merchant_id: 'merchant-aaa',
            customer_name: 'Ananya Roy',
            total_amount_paise: 500000, // ₹5,000
            merchant_profit_paise: 30000, // ₹300 (30% share settled)
            delivery_status: 'packed',
            settlement_status: 'admin_takeover',
            status: 'completed',
            payment_status: 'paid',
            created_at: '2026-09-07T16:00:00.000Z',
            packed_at: '2026-09-07T16:30:00.000Z'
        },
        // 7. Old Order placed 45 days ago (previous month)
        {
            id: 'ord-107',
            merchant_id: 'merchant-aaa',
            customer_name: 'Karan Mehra',
            total_amount_paise: 200000, // ₹2,000
            merchant_profit_paise: 28000, // ₹280 settled
            delivery_status: 'delivered',
            settlement_status: 'settled',
            status: 'completed',
            payment_status: 'paid',
            created_at: '2026-07-28T10:00:00.000Z',
            packed_at: '2026-07-28T12:00:00.000Z'
        },
        // 8. Order placed yesterday but packed TODAY (11 Sep)
        {
            id: 'ord-108',
            merchant_id: 'merchant-aaa',
            customer_name: 'Deepak Joshi',
            total_amount_paise: 350000, // ₹3,500
            merchant_profit_paise: 49000, // ₹490 settled
            delivery_status: 'packed',
            settlement_status: 'settled',
            status: 'completed',
            payment_status: 'paid',
            created_at: '2026-09-10T18:00:00.000Z',
            packed_at: '2026-09-11T08:00:00.000Z'
        }
    ];

    describe('KPI 1: Total Sales Accuracy (Packed Only)', () => {
        test('includes only confirmed sales (packed, shipped, delivered) and strictly excludes pending and cancelled orders', () => {
            const kpis = calculateMerchantOrderKPIs(sampleOrders, 'all', fixedNow);
            // Confirmed sales:
            // ord-102 (4000), ord-103 (1500), ord-105 (1000), ord-106 (5000), ord-107 (2000), ord-108 (3500)
            // Total = 400000 + 150000 + 100000 + 500000 + 200000 + 350000 = 1,700,000 paise (₹17,000.00)
            // ord-101 (pending 2500) is strictly EXCLUDED!
            // ord-104 (cancelled 3000) is strictly EXCLUDED!
            expect(kpis.totalSalesPaise).toBe(1700000);
            expect(kpis.totalSalesFormatted).toBe('17,000.00');
            expect(kpis.totalSalesSubtext).toBe('6 packed orders');
        });

        test('excludes failed or abandoned gateway drafts', () => {
            const draftOrder = {
                id: 'ord-draft',
                total_amount_paise: 999900,
                delivery_status: 'pending',
                status: 'pending',
                payment_method: 'gateway',
                payment_status: 'pending'
            };
            expect(isValidOrder(draftOrder)).toBe(false);
            expect(isPackedOrder(draftOrder)).toBe(false);
        });
    });

    describe('KPI 2: Orders Count Accuracy', () => {
        test('counts only packed/confirmed orders in the period for the Orders KPI', () => {
            const kpis = calculateMerchantOrderKPIs(sampleOrders, 'all', fixedNow);
            // 8 total orders: 6 packed, 1 pending, 1 cancelled
            expect(kpis.validOrdersCount).toBe(6);
            expect(kpis.packedOrdersCount).toBe(6);
            expect(kpis.ordersFormatted).toBe('6');
            expect(kpis.ordersSubtext).toBe('All packed orders');
        });
    });

    describe('KPI 3: Pending Orders Actionability', () => {
        test('identifies only orders requiring merchant fulfillment action', () => {
            const kpis = calculateMerchantOrderKPIs(sampleOrders, 'all', fixedNow);
            // ord-101 is the only pending order needing action
            expect(kpis.pendingOrdersCount).toBe(1);
            expect(kpis.pendingOrdersSubtext).toBe('Needs your action');
        });

        test('reports "All caught up" when no pending orders exist', () => {
            const fulfilledOnly = sampleOrders.filter(o => o.delivery_status !== 'pending');
            const kpis = calculateMerchantOrderKPIs(fulfilledOnly, 'all', fixedNow);
            expect(kpis.pendingOrdersCount).toBe(0);
            expect(kpis.pendingOrdersSubtext).toBe('All caught up');
        });
    });

    describe('KPI 4: Settled Earnings & Regression Guard', () => {
        test('strictly excludes contingent profit on pending orders from Settled Earnings', () => {
            // ord-101 has contingent profit of ₹350 (35000 paise), but is NOT settled
            const pendingOnly = [sampleOrders[0]];
            const kpis = calculateMerchantOrderKPIs(pendingOnly, 'all', fixedNow);

            expect(kpis.settledEarningsPaise).toBe(0);
            expect(kpis.settledOrdersCount).toBe(0);
            expect(kpis.contingentProfitPaise).toBe(35000); // Tracked separately as expected margin
        });

        test('includes actual settled profit for settled and admin takeover orders', () => {
            const kpis = calculateMerchantOrderKPIs(sampleOrders, 'all', fixedNow);
            // Settled orders:
            // ord-102: 56000
            // ord-103: 21000
            // ord-105: 0 (settled_zero)
            // ord-106: 30000 (admin_takeover settled)
            // ord-107: 28000
            // ord-108: 49000
            // Total = 56000 + 21000 + 0 + 30000 + 28000 + 49000 = 184000 paise (₹1,840)
            expect(kpis.settledEarningsPaise).toBe(184000);
            expect(kpis.settledEarningsFormatted).toBe('1,840.00');
            expect(kpis.settledOrdersCount).toBe(6);
        });

        test('cancelled order contributes ₹0 to settled earnings even if marked settled improperly', () => {
            const corruptCancelled = {
                ...sampleOrders[3],
                settlement_status: 'settled',
                delivery_status: 'cancelled',
                merchant_profit_paise: 99999
            };
            expect(isSettledOrder(corruptCancelled)).toBe(false);
        });
    });

    describe('Date / Period Boundary Filtering (Packed Timestamp Attribution)', () => {
        test('Today: includes orders packed today, even if placed yesterday, and excludes pending placed today', () => {
            const kpis = calculateMerchantOrderKPIs(sampleOrders, 'today', fixedNow);
            // ord-108 was placed yesterday (Sep 10) but packed TODAY (Sep 11): counts as sale today!
            // ord-101 was placed today (Sep 11) but is pending: does NOT count as sale!
            expect(kpis.validOrdersCount).toBe(1); // ord-108
            expect(kpis.totalSalesPaise).toBe(350000); // ₹3,500
            expect(kpis.pendingOrdersCount).toBe(1); // ord-101 pending action
            expect(kpis.settledEarningsPaise).toBe(49000); // ord-108 settled
        });

        test('7 Days: includes orders packed within the last 7 days', () => {
            const kpis = calculateMerchantOrderKPIs(sampleOrders, '7d', fixedNow);
            // Packed in last 7d: ord-108 (today), ord-102 (2d ago), ord-105 (5d ago), ord-106 (4d ago)
            // Valid sales: 4 orders
            expect(kpis.validOrdersCount).toBe(4);
            // Sales: 3500 + 4000 + 1000 + 5000 = 13,500 = 1350000 paise
            expect(kpis.totalSalesPaise).toBe(1350000);
            // Settled: ord-108 (490) + ord-102 (560) + ord-105 (0) + ord-106 (300) = 135000 paise
            expect(kpis.settledEarningsPaise).toBe(135000);
        });

        test('This Month: includes all orders packed in September 2026 (excludes July ord-107)', () => {
            const kpis = calculateMerchantOrderKPIs(sampleOrders, 'this_month', fixedNow);
            // Valid sales in September: ord-108, 102, 103, 105, 106 = 5 sales orders
            expect(kpis.validOrdersCount).toBe(5);
            expect(kpis.totalSalesPaise).toBe(1500000); // 1,500,000 paise (₹15,000)
            // Settled: 135000 (from 7d) + ord-103 (21000) = 156000 paise
            expect(kpis.settledEarningsPaise).toBe(156000);
        });

        test('30 Days: includes orders packed within the last 30 days', () => {
            const kpis = calculateMerchantOrderKPIs(sampleOrders, '30d', fixedNow);
            // Valid sales within last 30d: ord-108, 102, 103, 105, 106 = 5 orders
            expect(kpis.validOrdersCount).toBe(5);
            expect(kpis.totalSalesPaise).toBe(1500000); // Excludes July ord-107 (200000)
        });

        test('Empty orders array produces zeroed metrics without NaN or runtime errors', () => {
            const kpis = calculateMerchantOrderKPIs([], 'all', fixedNow);
            expect(kpis.totalSalesPaise).toBe(0);
            expect(kpis.totalSalesFormatted).toBe('0.00');
            expect(kpis.validOrdersCount).toBe(0);
            expect(kpis.ordersFormatted).toBe('0');
            expect(kpis.pendingOrdersCount).toBe(0);
            expect(kpis.pendingOrdersSubtext).toBe('All caught up');
            expect(kpis.settledEarningsPaise).toBe(0);
            expect(kpis.settledEarningsFormatted).toBe('0.00');
            expect(kpis.settledOrdersCount).toBe(0);
        });

        test('formatPaise handles null, undefined, zero and large numbers', () => {
            expect(formatPaise(null)).toBe('0.00');
            expect(formatPaise(undefined)).toBe('0.00');
            expect(formatPaise(0)).toBe('0.00');
            expect(formatPaise(3055384)).toBe('30,553.84');
            expect(formatPaise(100000000)).toBe('10,00,000.00');
        });
    });

    describe('Merchant Isolation Safety', () => {
        test('orders from Merchant A are never contaminated with Merchant B data', () => {
            const merchantBOrder = {
                id: 'ord-b-999',
                merchant_id: 'merchant-bbb',
                total_amount_paise: 888800,
                merchant_profit_paise: 99900,
                delivery_status: 'delivered',
                settlement_status: 'settled',
                created_at: '2026-09-11T10:00:00.000Z',
                packed_at: '2026-09-11T10:30:00.000Z'
            };

            const mixed = [...sampleOrders, merchantBOrder];
            const isolatedA = mixed.filter(o => o.merchant_id === 'merchant-aaa');
            const isolatedB = mixed.filter(o => o.merchant_id === 'merchant-bbb');

            const kpiA = calculateMerchantOrderKPIs(isolatedA, 'all', fixedNow);
            const kpiB = calculateMerchantOrderKPIs(isolatedB, 'all', fixedNow);

            expect(kpiA.totalSalesPaise).toBe(1700000);
            expect(kpiB.totalSalesPaise).toBe(888800);
            expect(kpiA.validOrdersCount).toBe(6);
            expect(kpiB.validOrdersCount).toBe(1);
        });
    });
});
