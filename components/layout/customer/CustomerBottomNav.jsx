'use client';

import { usePathname }                       from 'next/navigation';
import Link                                  from 'next/link';
import { Home, ShoppingCart, ScanFace, Gift, User, Trophy } from 'lucide-react';
import { motion }                            from 'framer-motion';
import ActiveOrdersOverlay                   from './ActiveOrdersOverlay';
import RatingPromptModal                     from './RatingPromptModal';
import { useRewardsRealtime }                from '@/lib/contexts/RewardsRealtimeContext';

const navItems = [
    { icon: Home,         label: 'Home',      href: '/dashboard'   },
    { icon: ScanFace,     label: 'NFC Pass',  href: '/nfc-service' },
    { icon: ShoppingCart, label: 'Shop',       href: '/shop'        },
    { icon: Trophy,       label: 'Rewards',   href: '/rewards'     },
    { icon: User,         label: 'Profile',   href: '/profile'     },
];

export default function CustomerBottomNav() {
    const pathname = usePathname();

    // Unscratched count badge — provided by RewardsRealtimeProvider mounted in
    // app/(customer)/(protected)/layout.jsx.
    // useRewardsRealtime() throws if rendered outside the provider, so we wrap
    // in a sub-component that is conditionally rendered only inside the provider.
    return <CustomerBottomNavInner pathname={pathname} />;
}

function CustomerBottomNavInner({ pathname }) {
    // Safe to call unconditionally here; parent is always inside the provider
    // when this nav renders for authenticated customer routes.
    let unscratchedCount = 0;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const ctx = useRewardsRealtime();
        unscratchedCount = ctx.unscratchedCount;
    } catch {
        // Outside provider (e.g. SSR, non-protected pages) — no badge
    }

    // Hide bottom nav on specific routes
    const hiddenRoutes = ['/merchant-apply'];
    const shouldHide = hiddenRoutes.some(route => pathname?.startsWith(route));
    if (shouldHide) return null;

    const badgeLabel = unscratchedCount > 9 ? '9+' : String(unscratchedCount);

    return (
        <>
            {/* Spacer */}
            <div className="h-24 md:hidden" />

            {/* Premium Bottom Navigation */}
            <motion.nav
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe flex flex-col justify-end pointer-events-none"
            >
                {/* Rating Prompt Overlay Modal */}
                <div className="pointer-events-auto w-full px-4 mb-2">
                    <RatingPromptModal />
                </div>

                {/* Active Orders Overlay Modal */}
                {!pathname?.startsWith('/shop') && (
                    <div className="pointer-events-auto w-full px-4 mb-4">
                        <ActiveOrdersOverlay />
                    </div>
                )}

                {/* Glass Container */}
                <div className="mx-4 mb-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2rem] p-2 pointer-events-auto">
                    <div className="flex items-center justify-between relative z-10 w-full">
                        {navItems.map((item) => {
                            const Icon     = item.icon;
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                            const showBadge = item.href === '/rewards' && unscratchedCount > 0;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="relative flex-1 flex flex-col items-center justify-center py-3 px-1 cursor-pointer select-none"
                                    aria-label={`${item.label}${showBadge ? `, ${unscratchedCount} pending rewards` : ''}`}
                                >
                                    {/* Link Container with Ripple/Tap Effect */}
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className="relative flex flex-col items-center gap-1 z-10"
                                    >
                                        {/* Icon */}
                                        <div className={`relative transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-gray-500'}`}>
                                            <Icon
                                                size={24}
                                                strokeWidth={isActive ? 2.5 : 2}
                                                className="relative z-10"
                                            />

                                            {/* Unscratched-card badge */}
                                            {showBadge && (
                                                <motion.span
                                                    key={unscratchedCount}
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center leading-none z-20 shadow-sm shadow-emerald-500/40"
                                                    aria-hidden="true"
                                                >
                                                    {badgeLabel}
                                                </motion.span>
                                            )}

                                            {/* Subtle Glow behind icon when active */}
                                            {isActive && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="absolute inset-0 bg-blue-400/20 blur-lg rounded-full"
                                                />
                                            )}
                                        </div>

                                        {/* Label */}
                                        <motion.span
                                            initial={false}
                                            animate={{
                                                height:  isActive ? 'auto' : 0,
                                                opacity: isActive ? 1 : 0,
                                                y:       isActive ? 0 : 4,
                                            }}
                                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 overflow-hidden whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    </motion.div>

                                    {/* Active "Capsule" Background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-capsule"
                                            className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[1.5rem]"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        >
                                            {/* Inner border for depth */}
                                            <div className="absolute inset-0 border border-blue-100/50 dark:border-blue-500/20 rounded-[1.5rem]" />
                                        </motion.div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </motion.nav>
        </>
    );
}
