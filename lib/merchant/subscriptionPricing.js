import { MERCHANT_SUBSCRIPTION_PLANS } from '@/lib/constants';

/**
 * Maps plan key → pricing object key returned by getPricingSettings().
 * This is the single place that binds plan keys to DB column names.
 */
const PLAN_KEY_TO_PRICING_FIELD = {
    MSUB_1M:  'sub1m',
    MSUB_6M:  'sub6m',
    MSUB_12M: 'sub12m',
};

/**
 * Builds the canonical merchant subscription plan array from admin-set prices.
 *
 * Pure function — no I/O. Pass the `pricing` object returned by
 * `getPricingSettings()` and get back a shaped plan array ready for the UI
 * and payment modal. `key`, `label`, `durationDays`, and `description` are
 * sourced from `MERCHANT_SUBSCRIPTION_PLANS`; `price` and `priceFormatted`
 * are sourced from the live `pricing` object.
 *
 * @param {object} pricing - The pricing object from getPricingSettings()
 *   e.g. { sub1m: 499, sub6m: 1999, sub12m: 3999, ... }
 * @returns {{ key: string, label: string, price: number, priceFormatted: string, durationDays: number, description: string|null }[]}
 */
export function buildMerchantSubscriptionPlans(pricing) {
    return MERCHANT_SUBSCRIPTION_PLANS.map((plan) => {
        const field = PLAN_KEY_TO_PRICING_FIELD[plan.key];
        const price = field != null && pricing[field] != null
            ? Number(pricing[field])
            : plan.price; // fall back to constants display price
        return {
            key:            plan.key,
            label:          plan.label,
            price,
            priceFormatted: price.toFixed(2),
            durationDays:   plan.durationDays,
            description:    plan.description,
        };
    });
}

/**
 * Returns the canonical price in **paise** for a given plan key,
 * using the live admin-set price from the `pricing` object.
 *
 * Returns `null` for an unrecognised plan key.
 *
 * @param {object} pricing - The pricing object from getPricingSettings()
 * @param {string} planKey - e.g. 'MSUB_1M', 'MSUB_6M', 'MSUB_12M'
 * @returns {number|null} Price in paise, or null if key is unknown.
 */
export function resolveMerchantPlanPaise(pricing, planKey) {
    const field = PLAN_KEY_TO_PRICING_FIELD[planKey];
    if (field == null) return null;
    const priceRupees = Number(pricing[field]);
    if (!Number.isFinite(priceRupees)) return null;
    return Math.round(priceRupees * 100);
}
