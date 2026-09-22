import { Gift, Users, Store, Package, Briefcase } from 'lucide-react';

/**
 * Returns the list of Quick Actions for the Admin Dashboard.
 * Separates data and business logic from presentation wrappers.
 * 
 * @param {Object} [shoppingStats] - Optional shopping metrics
 * @param {number} [shoppingStats.sales] - Confirmed order sales count
 * @param {number} [shoppingStats.pendingOrders] - Orders requiring action
 * @returns {Array<Object>} List of quick action definitions
 */
export function getQuickActions(shoppingStats = {}) {
    const pendingOrders = Number(shoppingStats?.pendingOrders) || 0;
    const sales = Number(shoppingStats?.sales) || 0;

    return [
        {
            id: 'giftcards',
            title: 'Gift Cards Platform',
            description: 'Manage global inventory and brand catalogs',
            href: '/admin/giftcards',
            icon: Gift,
            emoji: '🎁',
            gradient: 'from-blue-500 to-blue-600',
            shadow: 'shadow-blue-500/20',
            hoverBorder: 'hover:border-blue-100',
            hoverText: 'group-hover:text-blue-600',
            hoverBg: 'hover:bg-blue-50/50',
            lightBg: 'bg-blue-50 text-blue-600',
        },
        {
            id: 'users',
            title: 'User Management',
            description: 'Handle role assignments and view KYC',
            href: '/admin/users',
            icon: Users,
            emoji: '👥',
            gradient: 'from-emerald-500 to-emerald-600',
            shadow: 'shadow-emerald-500/20',
            hoverBorder: 'hover:border-emerald-100',
            hoverText: 'group-hover:text-emerald-600',
            hoverBg: 'hover:bg-emerald-50/50',
            lightBg: 'bg-emerald-50 text-emerald-600',
        },
        {
            id: 'marketing',
            title: 'Marketing Suite',
            description: 'Targets, billboard sponsorships & quizzes',
            href: '/admin/marketing',
            emoji: '🚀',
            gradient: 'from-amber-500 to-orange-500',
            shadow: 'shadow-amber-500/20',
            hoverBorder: 'hover:border-amber-100',
            hoverText: 'group-hover:text-amber-600',
            hoverBg: 'hover:bg-amber-50/50',
            lightBg: 'bg-amber-50 text-amber-600',
        },
        {
            id: 'merchants',
            title: 'Merchant Directory',
            description: 'Review applications and control access',
            href: '/admin/merchants',
            icon: Store,
            emoji: '🏪',
            gradient: 'from-sky-500 to-sky-600',
            shadow: 'shadow-sky-500/20',
            hoverBorder: 'hover:border-sky-100',
            hoverText: 'group-hover:text-sky-600',
            hoverBg: 'hover:bg-sky-50/50',
            lightBg: 'bg-sky-50 text-sky-600',
        },
        {
            id: 'orders',
            title: 'Shopping Orders',
            description: shoppingStats?.sales !== undefined
                ? `${sales} total · ${pendingOrders} pending dispatch`
                : 'Review orders and track fulfillment',
            href: '/admin/shopping/orders',
            icon: Package,
            emoji: '📦',
            gradient: 'from-violet-500 to-indigo-600',
            shadow: 'shadow-violet-500/20',
            hoverBorder: 'hover:border-violet-100',
            hoverText: 'group-hover:text-violet-600',
            hoverBg: 'hover:bg-violet-50/50',
            lightBg: 'bg-violet-50 text-violet-600',
            badge: pendingOrders > 0 ? pendingOrders : null,
        },
        {
            id: 'careers',
            title: 'Career Applications',
            description: 'Review freelancer, agent & DSA applications',
            href: '/admin/careers',
            icon: Briefcase,
            emoji: '💼',
            gradient: 'from-violet-600 to-blue-600',
            shadow: 'shadow-violet-500/20',
            hoverBorder: 'hover:border-violet-100',
            hoverText: 'group-hover:text-violet-600',
            hoverBg: 'hover:bg-violet-50/50',
            lightBg: 'bg-indigo-50 text-indigo-600',
        },
    ];
}
