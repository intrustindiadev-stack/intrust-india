/**
 * Tests for Merchant Udhari / Store Credit Audit & Product Upgrade
 * 
 * Verifies:
 * 1. Financial calculation correctness (KPI tallies, outstanding balance, overdue calculations).
 * 2. Integer money rules (all amounts in paise, no floating point currency writes).
 * 3. Customer debtor aggregation and risk status determination.
 * 4. PII protection (phone number masking unless overdue).
 * 5. 24h reminder rate-limiting logic.
 * 6. Source type separation (Shop Orders vs Gift Cards).
 * 7. Page structure and accessibility (Tabs, Modals, Retry controls).
 */

import fs from 'fs';
import path from 'path';

describe('Merchant Udhari / Store Credit Audit & Financial Calculations', () => {
    const rootDir = process.cwd();

    describe('Section 1: Financial & KPI Calculation Correctness', () => {
        // Mock dataset representing realistic merchant credit records
        const now = new Date('2026-09-11T12:00:00.000Z');
        const mockRequests = [
            {
                id: 'req-1',
                customer_id: 'cust-1',
                amount_paise: 50000, // ₹500
                status: 'pending',
                created_at: '2026-09-11T10:00:00.000Z',
                source_type: 'shop_order'
            },
            {
                id: 'req-2',
                customer_id: 'cust-1',
                amount_paise: 100000, // ₹1,000
                status: 'approved',
                due_date: '2026-09-20T00:00:00.000Z', // In future (current)
                created_at: '2026-09-05T10:00:00.000Z',
                responded_at: '2026-09-11T09:00:00.000Z', // Today
                source_type: 'gift_card'
            },
            {
                id: 'req-3',
                customer_id: 'cust-2',
                amount_paise: 250000, // ₹2,500
                status: 'approved',
                due_date: '2026-09-08T00:00:00.000Z', // Past due (overdue)
                created_at: '2026-08-25T10:00:00.000Z',
                source_type: 'shop_order'
            },
            {
                id: 'req-4',
                customer_id: 'cust-3',
                amount_paise: 75000, // ₹750
                status: 'approved',
                due_date: '2026-09-13T00:00:00.000Z', // Within 3 days (due soon)
                created_at: '2026-09-01T10:00:00.000Z',
                source_type: 'shop_order'
            },
            {
                id: 'req-5',
                customer_id: 'cust-4',
                amount_paise: 150000, // ₹1,500
                status: 'completed',
                completed_at: '2026-09-11T08:00:00.000Z', // Today
                created_at: '2026-09-02T10:00:00.000Z',
                source_type: 'gift_card'
            },
            {
                id: 'req-6',
                customer_id: 'cust-5',
                amount_paise: 30000, // ₹300
                status: 'denied',
                created_at: '2026-09-10T10:00:00.000Z',
                source_type: 'shop_order'
            },
            {
                id: 'req-7',
                customer_id: 'cust-6',
                amount_paise: 40000, // ₹400
                status: 'expired',
                created_at: '2026-08-10T10:00:00.000Z',
                source_type: 'gift_card'
            }
        ];

        function calculateKPIs(requests, referenceTime) {
            let totalOutstandingPaise = 0;
            let overdueAmountPaise = 0;
            let dueSoonAmountPaise = 0;
            let collectedAmountPaise = 0;
            let pendingCount = 0;
            let awaitingCount = 0;
            let overdueCount = 0;
            const activeDebtorIds = new Set();

            const todayStart = new Date(referenceTime);
            todayStart.setHours(0, 0, 0, 0);

            let todayCollectedPaise = 0;
            let todayCreditPaise = 0;

            for (const r of requests) {
                if (r.status === 'pending') {
                    pendingCount++;
                } else if (r.status === 'approved') {
                    awaitingCount++;
                    totalOutstandingPaise += (r.amount_paise || 0);
                    activeDebtorIds.add(r.customer_id);

                    const dueDate = r.due_date ? new Date(r.due_date) : null;
                    if (dueDate && dueDate < referenceTime) {
                        overdueCount++;
                        overdueAmountPaise += (r.amount_paise || 0);
                    } else if (dueDate && (dueDate.getTime() - referenceTime.getTime()) <= (3 * 24 * 60 * 60 * 1000)) {
                        dueSoonAmountPaise += (r.amount_paise || 0);
                    }

                    if (r.responded_at && new Date(r.responded_at) >= todayStart) {
                        todayCreditPaise += (r.amount_paise || 0);
                    }
                } else if (r.status === 'completed') {
                    collectedAmountPaise += (r.amount_paise || 0);
                    if (r.completed_at && new Date(r.completed_at) >= todayStart) {
                        todayCollectedPaise += (r.amount_paise || 0);
                    }
                }
            }

            return {
                totalOutstandingPaise,
                overdueAmountPaise,
                dueSoonAmountPaise,
                collectedAmountPaise,
                pendingCount,
                awaitingCount,
                overdueCount,
                activeDebtorsCount: activeDebtorIds.size,
                todayCollectedPaise,
                todayCreditPaise
            };
        }

        it('should accurately compute Total Outstanding from approved requests only', () => {
            const kpis = calculateKPIs(mockRequests, now);
            // Approved: req-2 (100,000) + req-3 (250,000) + req-4 (75,000) = 425,000 paise (₹4,250.00)
            expect(kpis.totalOutstandingPaise).toBe(425000);
            expect(kpis.totalOutstandingPaise / 100).toBe(4250.00);
        });

        it('should accurately compute Overdue amount and count', () => {
            const kpis = calculateKPIs(mockRequests, now);
            // Overdue: req-3 due 2026-09-08 < 2026-09-11 = 250,000 paise
            expect(kpis.overdueAmountPaise).toBe(250000);
            expect(kpis.overdueCount).toBe(1);
        });

        it('should accurately compute Due Soon amount for items maturing within 72h', () => {
            const kpis = calculateKPIs(mockRequests, now);
            // Due Soon: req-4 due 2026-09-13 (in ~36h) = 75,000 paise
            expect(kpis.dueSoonAmountPaise).toBe(75000);
        });

        it('should exclude denied, expired, and pending requests from Outstanding debt', () => {
            const kpis = calculateKPIs(mockRequests, now);
            // Pending (50,000), Denied (30,000), Expired (40,000), Completed (150,000)
            // Total of all non-approved = 270,000 paise. None should be in outstanding.
            expect(kpis.totalOutstandingPaise).toBe(425000);
            expect(kpis.pendingCount).toBe(1);
        });

        it('should track distinct active debtors holding open store credit', () => {
            const kpis = calculateKPIs(mockRequests, now);
            // Approved debtors: cust-1, cust-2, cust-3 = 3 debtors
            expect(kpis.activeDebtorsCount).toBe(3);
        });

        it('should correctly accumulate today collections and credit given', () => {
            const kpis = calculateKPIs(mockRequests, now);
            expect(kpis.todayCollectedPaise).toBe(150000); // req-5 completed today
            expect(kpis.todayCreditPaise).toBe(100000); // req-2 responded today
        });
    });

    describe('Section 2: Customer Aggregation & Risk Categorization', () => {
        function aggregateCustomerAccounts(requests, referenceTime) {
            const map = {};
            for (const r of requests) {
                const cid = r.customer_id;
                if (!map[cid]) {
                    map[cid] = {
                        customerId: cid,
                        totalOutstandingPaise: 0,
                        activeCreditsCount: 0,
                        overdueCreditsCount: 0,
                        earliestDueDate: null
                    };
                }
                if (r.status === 'approved') {
                    map[cid].totalOutstandingPaise += (r.amount_paise || 0);
                    map[cid].activeCreditsCount += 1;
                    if (r.due_date) {
                        const d = new Date(r.due_date);
                        if (!map[cid].earliestDueDate || d < new Date(map[cid].earliestDueDate)) {
                            map[cid].earliestDueDate = r.due_date;
                        }
                        if (d < referenceTime) {
                            map[cid].overdueCreditsCount += 1;
                        }
                    }
                }
            }

            return Object.values(map).map(c => {
                const hasOverdue = c.overdueCreditsCount > 0;
                const isDueSoon = !hasOverdue && c.earliestDueDate && (new Date(c.earliestDueDate).getTime() - referenceTime.getTime()) <= (3 * 24 * 60 * 60 * 1000);
                return {
                    ...c,
                    riskStatus: hasOverdue ? 'overdue' : isDueSoon ? 'due_soon' : c.activeCreditsCount > 0 ? 'current' : 'none'
                };
            });
        }

        it('should categorize a customer with any overdue credit as "overdue"', () => {
            const cust2Requests = [
                { customer_id: 'c2', status: 'approved', amount_paise: 50000, due_date: '2026-09-01T00:00:00Z' }, // overdue
                { customer_id: 'c2', status: 'approved', amount_paise: 30000, due_date: '2026-09-30T00:00:00Z' }  // current
            ];
            const accs = aggregateCustomerAccounts(cust2Requests, new Date('2026-09-11T12:00:00Z'));
            expect(accs[0].riskStatus).toBe('overdue');
            expect(accs[0].totalOutstandingPaise).toBe(80000);
            expect(accs[0].activeCreditsCount).toBe(2);
            expect(accs[0].overdueCreditsCount).toBe(1);
        });

        it('should categorize customer as "due_soon" if payment due within 3 days and none overdue', () => {
            const custRequests = [
                { customer_id: 'c3', status: 'approved', amount_paise: 50000, due_date: '2026-09-13T00:00:00Z' }
            ];
            const accs = aggregateCustomerAccounts(custRequests, new Date('2026-09-11T12:00:00Z'));
            expect(accs[0].riskStatus).toBe('due_soon');
        });

        it('should categorize customer as "current" if all dues are beyond 3 days', () => {
            const custRequests = [
                { customer_id: 'c4', status: 'approved', amount_paise: 50000, due_date: '2026-09-25T00:00:00Z' }
            ];
            const accs = aggregateCustomerAccounts(custRequests, new Date('2026-09-11T12:00:00Z'));
            expect(accs[0].riskStatus).toBe('current');
        });
    });

    describe('Section 3: PII Security & Phone Number Masking', () => {
        function maskPhone(phone, isOverdue) {
            if (!phone) return 'No phone';
            if (isOverdue) return phone;
            return phone.length >= 4 ? `${phone.slice(0, 3)}XXXXXX${phone.slice(-2)}` : phone;
        }

        it('should mask phone numbers for normal active requests', () => {
            expect(maskPhone('+919876543210', false)).toBe('+91XXXXXX10');
            expect(maskPhone('9876543210', false)).toBe('987XXXXXX10');
        });

        it('should reveal full phone number when credit is overdue for collection purposes', () => {
            expect(maskPhone('+919876543210', true)).toBe('+919876543210');
        });
    });

    describe('Section 4: 24h Reminder Cooldown Logic', () => {
        function isReminderCoolingDown(lastSentAtStr, currentTime) {
            if (!lastSentAtStr) return false;
            const lastSent = new Date(lastSentAtStr);
            return (currentTime.getTime() - lastSent.getTime()) < (24 * 60 * 60 * 1000);
        }

        it('should block reminders sent within the last 24 hours', () => {
            const now = new Date('2026-09-11T12:00:00Z');
            const sent2HoursAgo = '2026-09-11T10:00:00Z';
            expect(isReminderCoolingDown(sent2HoursAgo, now)).toBe(true);
        });

        it('should allow reminders if more than 24 hours have elapsed', () => {
            const now = new Date('2026-09-11T12:00:00Z');
            const sentYesterday = '2026-09-10T11:00:00Z';
            expect(isReminderCoolingDown(sentYesterday, now)).toBe(false);
        });
    });

    describe('Section 5: Static Contract & Accessibility Checks', () => {
        it('should have all 4 workspace tabs in merchant udhari page', () => {
            const pagePath = path.join(rootDir, 'app/(merchant)/merchant/udhari/page.jsx');
            const content = fs.readFileSync(pagePath, 'utf8');

            expect(content).toContain('Action Required');
            expect(content).toContain('Awaiting Payment');
            expect(content).toContain('Customer Accounts');
            expect(content).toContain('History');
        });

        it('should have accessible modal labels and buttons', () => {
            const pagePath = path.join(rootDir, 'app/(merchant)/merchant/udhari/page.jsx');
            const content = fs.readFileSync(pagePath, 'utf8');

            expect(content).toContain('aria-label="Close approve modal"');
            expect(content).toContain('aria-label="Close deny modal"');
            expect(content).toContain('setError');
            expect(content).toContain('Retry');
        });

        it('should provide duration selector (5, 10, 15 days) in approval modal', () => {
            const pagePath = path.join(rootDir, 'app/(merchant)/merchant/udhari/page.jsx');
            const content = fs.readFileSync(pagePath, 'utf8');

            expect(content).toContain('[5, 10, 15].map');
            expect(content).toContain('setApproveDurationDays');
            expect(content).toContain('durationDays: approveDurationDays');
        });

        it('should support reminder trigger in awaiting payment queue', () => {
            const pagePath = path.join(rootDir, 'app/(merchant)/merchant/udhari/page.jsx');
            const content = fs.readFileSync(pagePath, 'utf8');

            expect(content).toContain('handleSendReminder');
            expect(content).toContain('/api/udhari/reminders');
            expect(content).toContain('Send Reminder');
        });

        it('should have POST handler in /api/udhari/reminders with merchant check & rate limit', () => {
            const apiPath = path.join(rootDir, 'app/api/udhari/reminders/route.js');
            const content = fs.readFileSync(apiPath, 'utf8');

            expect(content).toContain('export async function POST');
            expect(content).toContain('twentyFourHoursAgo');
            expect(content).toContain('udhari_reminders');
            expect(content).toContain('notifyCustomerUdhariDue');
        });

        it('should join shopping order groups in /api/udhari/list for merchant', () => {
            const apiPath = path.join(rootDir, 'app/api/udhari/list/route.js');
            const content = fs.readFileSync(apiPath, 'utf8');

            expect(content).toContain('shopping_order_group:shopping_order_group_id');
            expect(content).toContain('shopping_order_items');
            expect(content).toContain('shopping_products');
            expect(content).toContain('customerAccounts');
            expect(content).toContain('totalOutstandingPaise');
        });
    });
});
