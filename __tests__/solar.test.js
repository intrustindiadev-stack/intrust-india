import { estimateSavings } from '../lib/solar/estimator';
import { isValidTransition } from '../lib/solar/statuses';
import { solarLeadSchema } from '../lib/solar/schema';

describe('Solar Domain Logic', () => {
    describe('Estimator', () => {
        it('returns correct estimate for less_1500 range', () => {
            const result = estimateSavings('less_1500');
            expect(result).toEqual({
                kwSuggestion: '1–2 kW',
                estimatedMonthlySavings: 1200,
                estimatedAnnualSavings: 14400,
                paybackPeriodYears: '3-4'
            });
        });

        it('returns null for invalid range', () => {
            expect(estimateSavings('invalid_range')).toBeNull();
        });
    });

    describe('Status Transitions', () => {
        it('allows forward transitions', () => {
            expect(isValidTransition('new', 'contacted')).toBe(true);
            expect(isValidTransition('contacted', 'site_visit')).toBe(true);
        });

        it('disallows backward transitions', () => {
            expect(isValidTransition('site_visit', 'new')).toBe(false);
            expect(isValidTransition('converted', 'contacted')).toBe(false);
        });

        it('always allows transitions to lost or cancelled from active states', () => {
            expect(isValidTransition('new', 'lost')).toBe(true);
            expect(isValidTransition('quoted', 'cancelled')).toBe(true);
        });

        it('disallows transitions out of terminal states', () => {
            expect(isValidTransition('lost', 'contacted')).toBe(false);
            expect(isValidTransition('converted', 'new')).toBe(false);
        });
    });

    describe('Zod Schema Validation', () => {
        it('validates a correct payload', () => {
            const validPayload = {
                name: 'John Doe',
                mobile: '9876543210',
                pincode: '400001',
                city: 'Mumbai',
                monthly_bill_range: '1500_2500',
                property_type: 'residential'
            };
            const result = solarLeadSchema.safeParse(validPayload);
            expect(result.success).toBe(true);
        });

        it('rejects invalid mobile numbers', () => {
            const invalidPayload = {
                name: 'John Doe',
                mobile: '12345',
                pincode: '400001',
                city: 'Mumbai',
                monthly_bill_range: '1500_2500',
                property_type: 'residential'
            };
            const result = solarLeadSchema.safeParse(invalidPayload);
            expect(result.success).toBe(false);
            expect(result.error.issues[0].message).toContain('valid 10-digit');
        });
    });
});
