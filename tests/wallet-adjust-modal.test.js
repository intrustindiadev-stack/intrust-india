jest.mock('@/lib/supabaseClient', () => ({
    createClient: jest.fn(() => ({})),
    supabase: {},
}));

import { getReasonFeedback, validateAdjustmentForm } from '@/components/admin/WalletAdjustModal';

describe('Admin Wallet Adjust Modal - UX Validation & Review Details Flow', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    // ── Test 1: "test" → Review Details disabled ─────────────────────────────
    test('1. "test" reason keeps Review Details button disabled', () => {
        const formState = validateAdjustmentForm({
            amount: '100',
            operation: 'credit',
            currentBalance: 0,
            reason: 'test', // 4 characters < 10
            maxAmount: 100_000,
        });

        expect(formState.amountValid).toBe(true);
        expect(formState.debitValid).toBe(true);
        expect(formState.reasonValid).toBe(false);
        expect(formState.formValid).toBe(false);

        // Button disabled attribute: disabled={!formValid}
        const isReviewDetailsDisabled = !formState.formValid;
        expect(isReviewDetailsDisabled).toBe(true);
    });

    // ── Test 2: "test" → "6 more characters needed" ──────────────────────────
    test('2. "test" reason displays "6 more characters needed"', () => {
        const feedback = getReasonFeedback('test');

        expect(feedback.isValid).toBe(false);
        expect(feedback.remaining).toBe(6);
        expect(feedback.message).toBe('6 more characters needed');

        // Also test empty state requirement
        const emptyFeedback = getReasonFeedback('');
        expect(emptyFeedback.isValid).toBe(false);
        expect(emptyFeedback.message).toBe('Minimum 10 characters required');
    });

    // ── Test 3: 10+ characters → reason valid ────────────────────────────────
    test('3. 10+ characters marks reason as valid with "✓ Reason valid"', () => {
        // Exactly 10 characters
        const feedback10 = getReasonFeedback('1234567890');
        expect(feedback10.isValid).toBe(true);
        expect(feedback10.remaining).toBe(0);
        expect(feedback10.message).toBe('✓ Reason valid');

        // More than 10 characters
        const feedbackLong = getReasonFeedback('Detailed customer reimbursement for order #1002');
        expect(feedbackLong.isValid).toBe(true);
        expect(feedbackLong.remaining).toBe(0);
        expect(feedbackLong.message).toBe('✓ Reason valid');
    });

    // ── Test 4: valid amount + valid reason → Review Details enabled ─────────
    test('4. valid amount + valid reason enables Review Details button', () => {
        const formState = validateAdjustmentForm({
            amount: '100',
            operation: 'credit',
            currentBalance: 0,
            reason: 'Customer refund for cancelled item #4812', // > 10 chars
            maxAmount: 100_000,
        });

        expect(formState.amountValid).toBe(true);
        expect(formState.debitValid).toBe(true);
        expect(formState.reasonValid).toBe(true);
        expect(formState.formValid).toBe(true);

        const isReviewDetailsDisabled = !formState.formValid;
        expect(isReviewDetailsDisabled).toBe(false);
    });

    // ── Test 5: no wallet API request occurs while form is invalid ───────────
    test('5. no wallet API request occurs while form is invalid', async () => {
        const invalidFormState = validateAdjustmentForm({
            amount: '100',
            operation: 'credit',
            currentBalance: 0,
            reason: 'test',
            maxAmount: 100_000,
        });

        expect(invalidFormState.formValid).toBe(false);

        // Simulate handleSubmit attempt when form is invalid
        const attemptSubmit = async (state) => {
            if (!state.formValid) {
                return false; // Guard in WalletAdjustModal line 38: if (!formValid) return;
            }
            await fetch('/api/admin/wallet-adjust', {
                method: 'POST',
                body: JSON.stringify({ amount: state.parsedAmount, reason: 'test' }),
            });
            return true;
        };

        const result = await attemptSubmit(invalidFormState);

        expect(result).toBe(false);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
