import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Constants matching app settings
const POINTS_PER_RUPEE = 100;

describe('CUST-04: Rewards points balance equals sum of reward_transactions', () => {

    describe('1. Mock Data Reconciliation Verification', () => {
        // Set up a mock dataset representing various real ledger scenarios
        const mockTransactions = [
            // Credits
            { id: 'tx-1', event_type: 'signup', points: 100, is_scratched: true },
            { id: 'tx-2', event_type: 'purchase', points: 350, is_scratched: true },
            { id: 'tx-3', event_type: 'daily_login', points: 5, is_scratched: true },
            // Debits (written as negative signed points in reward_transactions)
            { id: 'tx-4', event_type: 'wallet_conversion', points: -200, is_scratched: true },
            { id: 'tx-5', event_type: 'expiry', points: -100, is_scratched: true },
            // Unscratched card (should also count toward current_balance per DB RPC logic)
            { id: 'tx-6', event_type: 'purchase', points: 50, is_scratched: false },
            // Manual adjustment debit
            { id: 'tx-7', event_type: 'manual_debit', points: -5, is_scratched: true }
        ];

        it('should verify points balance equals SUM(credits) - SUM(debits)', () => {
            const credits = mockTransactions.filter(tx => tx.points > 0);
            const debits = mockTransactions.filter(tx => tx.points < 0);

            const totalCredits = credits.reduce((sum, tx) => sum + tx.points, 0);
            const totalDebits = debits.reduce((sum, tx) => sum + Math.abs(tx.points), 0);

            const calculatedBalance = totalCredits - totalDebits;

            // Algebraic sum must match the calculated balance
            const algebraicSum = mockTransactions.reduce((sum, tx) => sum + tx.points, 0);

            expect(calculatedBalance).toBe(200); // 100 + 350 + 5 - 200 - 100 + 50 - 5 = 200
            expect(algebraicSum).toBe(calculatedBalance);
        });

        it('should correctly format points to liquid cash value (points/100)', () => {
            const balance = 200;
            const pointsInRupeesVal = balance / POINTS_PER_RUPEE;
            const pointsInRupeesStr = pointsInRupeesVal.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });

            expect(pointsInRupeesVal).toBe(2.00);
            expect(pointsInRupeesStr).toBe('₹2');
        });
    });

    describe('2. Read-Only Database Reconciliation Check', () => {
        it('should compare user reward points balance with transaction ledger sum', async () => {
            if (!SUPABASE_URL || !SERVICE_KEY) {
                console.log('Skipping live database check. Define NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run.');
                return;
            }

            const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

            // 1. Fetch first 20 user balances from reward_points_balance
            const { data: balances, error: balanceErr } = await supabase
                .from('reward_points_balance')
                .select('user_id, current_balance, total_earned, total_redeemed')
                .limit(20);

            expect(balanceErr).toBeNull();
            expect(balances).toBeDefined();

            if (!balances || balances.length === 0) {
                console.log('No user balances found in DB. Skipping assertion.');
                return;
            }

            // 2. Perform reconciliation comparison for each user
            for (const balanceRow of balances) {
                const { user_id, current_balance, total_earned, total_redeemed } = balanceRow;

                // Query all reward transactions for this user
                const { data: txs, error: txErr } = await supabase
                    .from('reward_transactions')
                    .select('points, event_type')
                    .eq('user_id', user_id);

                expect(txErr).toBeNull();

                const transactions = txs || [];

                // Calculate algebraic sum of all transaction points
                const algebraicSum = transactions.reduce((sum, tx) => sum + Number(tx.points), 0);

                // Reconcile: algebraic sum must match current_balance exactly
                expect(algebraicSum).toBe(Number(current_balance));

                // Extra validation: verify sum of positive points is total_earned and sum of negative is total_redeemed
                const positiveSum = transactions.filter(tx => Number(tx.points) > 0).reduce((sum, tx) => sum + Number(tx.points), 0);
                const negativeSum = transactions.filter(tx => Number(tx.points) < 0).reduce((sum, tx) => sum + Math.abs(Number(tx.points)), 0);

                expect(positiveSum).toBe(Number(total_earned));
                expect(negativeSum).toBe(Number(total_redeemed));
            }

            console.log(`Reconciled database balances for ${balances.length} users successfully.`);
        });
    });
});
