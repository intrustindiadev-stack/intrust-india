'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: LayoutGrid, label: 'Services', href: '/services' },
    { icon: ShoppingBag, label: 'My Cards', href: '/my-giftcards' },
    { icon: User, label: 'Profile', href: '/profile' },
];

export default function CustomerBottomNav() {
    const pathname = usePathname();

    // Hide bottom nav on specific routes
    const hiddenRoutes = ['/merchant-apply'];
    const shouldHide = hiddenRoutes.some(route => pathname?.startsWith(route));

    if (shouldHide) return null;

    return (
        <>
            {/* Spacer */}
            <div className="h-24 md:hidden" />

            {/* Premium Bottom Navigation */}
            <motion.nav
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe"
            >
                {/* Glass Container */}
                <div className="mx-4 mb-4 bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2rem] p-2">
                    <div className="flex items-center justify-between relative z-10">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="relative flex-1 flex flex-col items-center justify-center py-3 px-1 cursor-pointer select-none"
                                >
                                    {/* Link Container with Ripple/Tap Effect */}
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className="relative flex flex-col items-center gap-1 z-10"
                                    >
                                        {/* Icon */}
                                        <div className={`relative transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                            <Icon
                                                size={24}
                                                strokeWidth={isActive ? 2.5 : 2}
                                                // Optional: Fill icon on active if supported, or just keep outline
                                                className="relative z-10"
                                            />

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
                                                height: isActive ? 'auto' : 0,
                                                opacity: isActive ? 1 : 0,
                                                y: isActive ? 0 : 4
                                            }}
                                            className="text-[10px] font-bold text-blue-600 overflow-hidden whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    </motion.div>

                                    {/* Active "Capsule" Background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-capsule"
                                            className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-[1.5rem]"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        >
                                            {/* Inner border for depth */}
                                            <div className="absolute inset-0 border border-blue-100/50 rounded-[1.5rem]" />
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
