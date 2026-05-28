/**
 * Feature gate definitions for merchant subscription gating.
 *
 * ACCOUNT_FEATURES — always accessible regardless of subscription status.
 * OPERATIONS_FEATURES — require active subscription (or admin role) to access.
 */

export const ACCOUNT_FEATURES = [
    'profile',
    'settings/business',
    'settings/account',
    'settings/notifications',
    'settings/whatsapp',
    'settings/subscription',
];

export const OPERATIONS_FEATURES = {
    dashboard: {
        label: 'Dashboard',
        icon: 'grid_view',
        route: '/merchant/dashboard',
        lockedCopy: 'Subscribe to access your dashboard',
    },
    inventory: {
        label: 'Inventory',
        icon: 'inventory_2',
        route: '/merchant/inventory',
        lockedCopy: 'Subscribe to manage inventory',
    },
    purchase: {
        label: 'Purchase Coupons',
        icon: 'add_shopping_cart',
        route: '/merchant/purchase',
        lockedCopy: 'Subscribe to purchase coupons',
    },
    'store-credits': {
        label: 'Store Credits',
        icon: 'credit_score',
        route: '/merchant/udhari',
        lockedCopy: 'Subscribe to manage store credits',
    },
    'nfc-service': {
        label: 'NFC Card',
        icon: 'contactless',
        route: '/merchant/nfc-service',
        lockedCopy: 'Subscribe to use NFC services',
    },
    lockin: {
        label: 'Lockin Portfolio',
        icon: 'lock_clock',
        route: '/merchant/lockin',
        lockedCopy: 'Subscribe to access Lockin Portfolio',
    },
    investments: {
        label: 'Mera Paisa',
        icon: 'savings',
        route: '/merchant/investments',
        lockedCopy: 'Subscribe to manage investments',
    },
    wallet: {
        label: 'Wallet',
        icon: 'account_balance_wallet',
        route: '/merchant/wallet',
        lockedCopy: 'Subscribe to access your wallet',
    },
    referrals: {
        label: 'My Network',
        icon: 'share',
        route: '/merchant/referrals',
        lockedCopy: 'Subscribe to access your referral network',
    },
    'shopping-orders': {
        label: 'Shopping Orders',
        icon: 'shopping_basket',
        route: '/merchant/shopping/orders',
        lockedCopy: 'Subscribe to view shopping orders',
    },
    'auto-mode': {
        label: 'Auto Mode',
        icon: 'offline_bolt',
        route: '/merchant/shopping/auto-mode',
        lockedCopy: 'Subscribe to enable auto mode',
    },
    ratings: {
        label: 'Ratings',
        icon: 'star',
        route: '/merchant/ratings',
        lockedCopy: 'Subscribe to view ratings',
    },
    analytics: {
        label: 'Analytics',
        icon: 'analytics',
        route: '/merchant/analytics',
        lockedCopy: 'Subscribe to access analytics',
    },
    'settings/store-status': {
        label: 'Store Status',
        icon: 'storefront',
        route: '/merchant/settings?tab=store',
        lockedCopy: 'Subscribe to manage store status',
    },
    'settings/bank-account': {
        label: 'Bank Account',
        icon: 'account_balance',
        route: '/merchant/settings?tab=bank',
        lockedCopy: 'Subscribe to manage bank account',
    },
    'settings/store-credit': {
        label: 'Store Credit',
        icon: 'credit_card',
        route: '/merchant/settings?tab=store',
        lockedCopy: 'Subscribe to configure store credit',
    },
};

// Collect all Operations routes for quick lookup
const _operationsRoutes = Object.values(OPERATIONS_FEATURES).map((f) => f.route.split('?')[0]);

/**
 * Returns true if the given pathname corresponds to a subscription-gated
 * Operations route and the merchant is not subscribed.
 */
export function isRouteLocked(pathname, isSubscribed) {
    if (isSubscribed) return false;
    return _operationsRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
    );
}
