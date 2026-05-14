export const SHOP_CATEGORIES = [
    'Electronics',
    'Beauty',
    'Home',
    'Fashion',
    'Groceries',
    'Sports',
    'Toys',
    'Health'
];

/**
 * Merchant subscription plans — single source of truth for pricing and duration.
 * `priceFormatted` is used directly in the SabPaisa amount field.
 * `key` is passed via udf3 so the callback can compute the correct expiry.
 */
export const MERCHANT_SUBSCRIPTION_PLANS = [
    {
        key: 'MSUB_1M',
        label: '1 Month',
        price: 499,
        priceFormatted: '499.00',
        durationDays: 30,
        description: null,
    },
    {
        key: 'MSUB_6M',
        label: '6 Months',
        price: 1999,
        priceFormatted: '1999.00',
        durationDays: 180,
        description: 'Best Value',
    },
    {
        key: 'MSUB_12M',
        label: '12 Months',
        price: 3999,
        priceFormatted: '3999.00',
        durationDays: 365,
        description: 'Most Savings',
    },
];

/** Minimum payout amount in rupees. */
export const MIN_PAYOUT_RUPEES = 100;

/**
 * Gold subscription plans — single source of truth for pricing, duration, and cashback.
 * `price` is in rupees. `durationMonths` is in calendar months. `cashback` is in rupees.
 * `key` is passed via udf2 so the initiate and callback routes can derive the canonical amount.
 */
export const GOLD_SUBSCRIPTION_PLANS = [
    {
        key: 'GOLD_1M',
        label: '1 Month',
        price: 999,
        durationMonths: 1,
        cashback: 199,
    },
    {
        key: 'GOLD_3M',
        label: '3 Months',
        price: 2499,
        durationMonths: 3,
        cashback: 499,
    },
    {
        key: 'GOLD_1Y',
        label: '12 Months',
        price: 7999,
        durationMonths: 12,
        cashback: 1499,
    },
];
