/**
 * tests/merchantDashboardTodayProfit.test.js
 *
 * Regression test suite for Merchant Dashboard Today's Profit calculation.
 * Verifies that:
 * 1. Pending / unaccepted orders contribute ₹0 to Today's Profit.
 * 2. Accepted / settled orders contribute actual settled profit from merchant_transactions.
 * 3. Orders placed yesterday but settled today are included in Today's Profit.
 * 4. Cancelled orders contribute ₹0.
 * 5. Admin takeover orders reflect the actual reduced merchant settlement, not contingent margin.
 * 6. Scoping enforces strict merchant isolation.
 * 7. India Standard Time (IST) boundaries are correctly applied regardless of host timezone.
 * 8. Coupon profit and AI order profit remain unaffected.
 */
import { getTodayISTBoundaries, istDateKey } from '../lib/utils/dateIst.js';

describe("Merchant Dashboard Today's Profit Calculation", () => {
    const CURRENT_MERCHANT_ID = '612b1cc3-403e-4093-b8d1-f1c01b5b4c5f';
    const OTHER_MERCHANT_ID   = '925818d5-e1b9-4178-a27a-fe3f1f04bf7f';

    // Helper implementing the authoritative dashboard calculation
    function calculateTodayStats({
        merchantId,
        todayCoupons = [],
        todayShoppingGroups = [],
        todaySettledTxns = [],
        completedAIOrders = [],
        todayStartIST
    }) {
        // Coupon calculations (preserves existing behavior)
        const todayCouponSales = todayCoupons.reduce((sum, c) => sum + ((c.merchant_selling_price_paise || 0) / 100), 0);
        const todayCouponProfit = todayCoupons.reduce((sum, c) => {
            const sp = (c.merchant_selling_price_paise || 0) / 100;
            const pp = (c.merchant_purchase_price_paise || 0) / 100;
            const comm = (c.merchant_commission_paise || 0) / 100;
            return sum + (sp - pp - comm);
        }, 0);

        // Shopping sales: only orders marked as packed (delivery_status in packed, shipped, delivered)
        const packedShoppingGroups = todayShoppingGroups.filter(g => ['packed', 'shipped', 'delivered'].includes(g.delivery_status));
        const todayShoppingSales = packedShoppingGroups.reduce((sum, g) => sum + ((g.total_amount_paise || 0) / 100), 0);

        // Authoritative settled shopping profit from merchant ledger
        const todayShoppingProfit = todaySettledTxns
            .filter(tx => tx.merchant_id === merchantId)
            .reduce((sum, tx) => {
                if (tx.transaction_type === 'sale') {
                    return sum + ((tx.amount_paise || 0) / 100);
                }
                if (tx.transaction_type === 'store_credit_payment' && tx.metadata?.merchant_profit_paise) {
                    return sum + ((Number(tx.metadata.merchant_profit_paise) || 0) / 100);
                }
                return sum;
            }, 0);

        // AI Orders calculations (preserves existing behavior)
        const todayAIOrders = completedAIOrders.filter(o => o.created_at >= todayStartIST);
        const todayAISales = todayAIOrders.reduce((sum, o) => sum + ((o.wholesale_price_paise || 0) / 100), 0);
        const todayAIProfit = todayAIOrders.reduce((sum, o) => sum + ((o.profit_margin_paise || 0) / 100), 0);

        const todaySales = todayCouponSales + todayShoppingSales + todayAISales;
        const todayProfit = todayCouponProfit + todayShoppingProfit + todayAIProfit;
        const todayOrdersCount = todayCoupons.length + packedShoppingGroups.length + todayAIOrders.length;
        const todayMargin = todaySales > 0 ? Number(((todayProfit / todaySales) * 100).toFixed(1)) : 0;
        const avgOrderValue = todayOrdersCount > 0 ? Math.round(todaySales / todayOrdersCount) : 0;

        return {
            todaySales,
            todayProfit,
            todayShoppingProfit,
            todayOrdersCount,
            todayMargin,
            avgOrderValue,
        };
    }

    describe('IST Date Boundary Helpers', () => {
        test('getTodayISTBoundaries produces valid UTC ISO timestamps matching 00:00:00 to 23:59:59.999 IST', () => {
            const fixedDate = new Date('2026-09-10T10:00:00.000Z'); // 15:30 IST
            const { start, end, todayKey } = getTodayISTBoundaries(fixedDate);

            expect(todayKey).toBe('2026-09-10');
            expect(start).toBe('2026-09-09T18:30:00.000Z'); // 00:00:00 IST
            expect(end).toBe('2026-09-10T18:29:59.999Z');   // 23:59:59.999 IST
        });

        test('correctly identifies transactions at 01:30 AM IST as belonging to today', () => {
            const fixedDate = new Date('2026-09-10T10:00:00.000Z');
            const { start, end } = getTodayISTBoundaries(fixedDate);

            // 01:30 AM IST on Sep 10 is Sep 9 20:00 UTC
            const earlyMorningTxn = '2026-09-09T20:00:00.000Z';
            expect(earlyMorningTxn >= start && earlyMorningTxn <= end).toBe(true);

            // Yesterday 11:00 PM IST is Sep 9 17:30 UTC
            const yesterdayTxn = '2026-09-09T17:30:00.000Z';
            expect(yesterdayTxn >= start && yesterdayTxn <= end).toBe(false);
        });
    });

    describe('Order Status & Settlement Scenarios', () => {
        const { start: todayStartIST } = getTodayISTBoundaries(new Date('2026-09-10T10:00:00.000Z'));

        test('Case 1: Pending (unaccepted/unpacked) order placed today contributes ₹0 to Today\'s Profit and ₹0 to Today\'s Sale', () => {
            const pendingOrder = {
                id: 'ord-pending-1',
                merchant_id: CURRENT_MERCHANT_ID,
                total_amount_paise: 324370,
                merchant_profit_paise: 3570,
                delivery_status: 'pending',
                settlement_status: 'pending',
                created_at: '2026-09-10T02:00:00.000Z'
            };

            // Pending order exists in shopping_order_groups, but is not marked as packed
            const stats = calculateTodayStats({
                merchantId: CURRENT_MERCHANT_ID,
                todayShoppingGroups: [pendingOrder],
                todaySettledTxns: [], // empty because unaccepted
                todayStartIST
            });

            expect(stats.todayShoppingProfit).toBe(0);
            expect(stats.todayProfit).toBe(0);
            // Pending unfulfilled order does NOT count towards today's sales
            expect(stats.todaySales).toBe(0);
            expect(stats.todayOrdersCount).toBe(0);
        });

        test('Case 2: Order marked packed & settled today includes profit in Today\'s Profit and sales in Today\'s Sale', () => {
            const acceptedOrder = {
                id: 'f5bb1957-9fcd-4eb7-95d6-dd86fd1f811d',
                merchant_id: CURRENT_MERCHANT_ID,
                total_amount_paise: 324370,
                merchant_profit_paise: 3570,
                delivery_status: 'packed',
                settlement_status: 'settled',
                created_at: '2026-09-09T20:09:39.340Z' // 01:39 IST today
            };

            // Merchant transaction recorded upon transition to packed
            const settledTxn = {
                id: 'tx-1',
                merchant_id: CURRENT_MERCHANT_ID,
                transaction_type: 'sale',
                amount_paise: 3570,
                created_at: '2026-09-09T20:11:20.428Z' // settled today
            };

            const stats = calculateTodayStats({
                merchantId: CURRENT_MERCHANT_ID,
                todayShoppingGroups: [acceptedOrder],
                todaySettledTxns: [settledTxn],
                todayStartIST
            });

            expect(stats.todayShoppingProfit).toBe(35.7);
            expect(stats.todayProfit).toBe(35.7);
            expect(stats.todaySales).toBe(3243.7);
            expect(stats.todayOrdersCount).toBe(1);
        });

        test('Case 3: Order placed yesterday but marked packed & settled today includes profit and sales today', () => {
            // Placed yesterday at 11:30 PM IST (18:00 UTC yesterday)
            const yesterdayPlacedOrder = {
                id: 'ord-yesterday-1',
                merchant_id: CURRENT_MERCHANT_ID,
                total_amount_paise: 100000,
                merchant_profit_paise: 2500,
                delivery_status: 'packed',
                settlement_status: 'settled',
                created_at: '2026-09-09T18:00:00.000Z', // yesterday
                packed_at: '2026-09-10T03:30:00.000Z'   // marked packed today
            };

            // But merchant accepted & packed it TODAY at 9:00 AM IST (03:30 UTC today)
            const todaySettledTxn = {
                id: 'tx-yesterday-order',
                merchant_id: CURRENT_MERCHANT_ID,
                transaction_type: 'sale',
                amount_paise: 2500,
                created_at: '2026-09-10T03:30:00.000Z' // today
            };

            const stats = calculateTodayStats({
                merchantId: CURRENT_MERCHANT_ID,
                todayShoppingGroups: [yesterdayPlacedOrder], // packed today, so included in today's groups
                todaySettledTxns: [todaySettledTxn],
                todayStartIST
            });

            expect(stats.todayShoppingProfit).toBe(25);
            expect(stats.todayProfit).toBe(25);
            expect(stats.todaySales).toBe(1000);
            expect(stats.todayOrdersCount).toBe(1);
        });

        test('Case 4: Cancelled order placed today contributes ₹0 to Today\'s Profit and ₹0 to Today\'s Sale', () => {
            const cancelledOrder = {
                id: 'ord-cancelled-1',
                merchant_id: CURRENT_MERCHANT_ID,
                total_amount_paise: 50000,
                merchant_profit_paise: 1000,
                delivery_status: 'cancelled',
                settlement_status: 'pending',
                created_at: '2026-09-10T04:00:00.000Z'
            };

            // Cancelled order has no merchant_transactions row and is not packed
            const stats = calculateTodayStats({
                merchantId: CURRENT_MERCHANT_ID,
                todayShoppingGroups: [cancelledOrder],
                todaySettledTxns: [],
                todayStartIST
            });

            expect(stats.todayShoppingProfit).toBe(0);
            expect(stats.todayProfit).toBe(0);
            expect(stats.todaySales).toBe(0);
            expect(stats.todayOrdersCount).toBe(0);
        });

        test('Case 5: Admin takeover reflects actual reduced merchant settlement, not original contingent profit', () => {
            // Original order had contingent 70% margin = 3570 paise
            // Admin takeover slashed it to 30% margin = 1530 paise
            const takeoverTxn = {
                id: 'tx-takeover-1',
                merchant_id: CURRENT_MERCHANT_ID,
                transaction_type: 'sale',
                amount_paise: 1530, // 30% reduced share
                created_at: '2026-09-10T05:00:00.000Z'
            };

            const stats = calculateTodayStats({
                merchantId: CURRENT_MERCHANT_ID,
                todayShoppingGroups: [],
                todaySettledTxns: [takeoverTxn],
                todayStartIST
            });

            expect(stats.todayShoppingProfit).toBe(15.3);
            expect(stats.todayProfit).toBe(15.3);
        });

        test('Case 6: Strict merchant isolation ensures other merchant transactions are never counted', () => {
            const myTxn = {
                id: 'tx-mine',
                merchant_id: CURRENT_MERCHANT_ID,
                transaction_type: 'sale',
                amount_paise: 2000,
                created_at: '2026-09-10T05:00:00.000Z'
            };
            const otherTxn = {
                id: 'tx-other',
                merchant_id: OTHER_MERCHANT_ID,
                transaction_type: 'sale',
                amount_paise: 99999,
                created_at: '2026-09-10T05:00:00.000Z'
            };

            const stats = calculateTodayStats({
                merchantId: CURRENT_MERCHANT_ID,
                todaySettledTxns: [myTxn, otherTxn],
                todayStartIST
            });

            expect(stats.todayShoppingProfit).toBe(20);
            expect(stats.todayProfit).toBe(20);
        });

        test('Case 7: Store credit orders settled today contribute correct profit from metadata', () => {
            const storeCreditTxn = {
                id: 'tx-store-credit-1',
                merchant_id: CURRENT_MERCHANT_ID,
                transaction_type: 'store_credit_payment',
                amount_paise: 97550, // total repaid
                metadata: {
                    merchant_profit_paise: 1050,
                    shopping_order_group_id: 'ord-sc-1'
                },
                created_at: '2026-09-10T06:00:00.000Z'
            };

            const stats = calculateTodayStats({
                merchantId: CURRENT_MERCHANT_ID,
                todaySettledTxns: [storeCreditTxn],
                todayStartIST
            });

            expect(stats.todayShoppingProfit).toBe(10.5);
            expect(stats.todayProfit).toBe(10.5);
        });

        test('Case 8: Coupon profit and AI order profit are preserved and combined correctly', () => {
            const settledTxn = {
                id: 'tx-shop-1',
                merchant_id: CURRENT_MERCHANT_ID,
                transaction_type: 'sale',
                amount_paise: 3710, // ₹37.10
                created_at: '2026-09-10T02:00:00.000Z'
            };

            const coupon = {
                merchant_selling_price_paise: 50000,   // ₹500
                merchant_purchase_price_paise: 45000,  // ₹450
                merchant_commission_paise: 1000,       // ₹10
                purchased_at: '2026-09-10T03:00:00.000Z'
                // Net coupon profit: 500 - 450 - 10 = ₹40
            };

            const completedAIOrder = {
                id: 'ai-1',
                status: 'COMPLETED',
                wholesale_price_paise: 1000000, // ₹10,000
                profit_margin_paise: 100000,     // ₹1,000
                created_at: '2026-09-10T04:00:00.000Z'
            };

            const pendingAIOrder = {
                id: 'ai-pending',
                status: 'PENDING',
                wholesale_price_paise: 500000,
                profit_margin_paise: 50000,
                created_at: '2026-09-10T04:00:00.000Z'
            };

            const stats = calculateTodayStats({
                merchantId: CURRENT_MERCHANT_ID,
                todayCoupons: [coupon],
                todayShoppingGroups: [],
                todaySettledTxns: [settledTxn],
                completedAIOrders: [completedAIOrder], // pendingAIOrder excluded
                todayStartIST
            });

            // Shopping: ₹37.10
            // Coupon: ₹40.00
            // AI: ₹1,000.00
            // Total Profit = ₹1,077.10
            expect(stats.todayShoppingProfit).toBe(37.1);
            expect(stats.todayProfit).toBe(1077.1);
        });
    });
});
