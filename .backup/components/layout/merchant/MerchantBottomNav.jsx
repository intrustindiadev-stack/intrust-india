'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Package, TrendingUp, Settings, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/merchant/dashboard' },
    { icon: Package, label: 'Inventory', href: '/merchant/coupons' },
    { icon: Plus, label: 'Add', href: '/merchant/coupons/add', special: true },
    { icon: TrendingUp, label: 'Earnings', href: '/merchant/earnings' },
    { icon: Settings, label: 'Settings', href: '/merchant/settings' },
];

export default function MerchantBottomNav() {
    const pathname = usePathname();

    return (
        <>
            {/* Spacer to prevent content from being hidden behind bottom nav */}
            <div className="h-20 md:hidden" />

            {/* Bottom Navigation - Mobile Only */}
            <motion.nav
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t-2 border-gray-200 shadow-2xl"
            >
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                        // Special styling for "Add" button
                        if (item.special) {
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="relative flex flex-col items-center justify-center flex-1 h-full group -mt-6"
                                >
                                    {/* Floating action button */}
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform">
                                        <Icon size={24} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-xs font-semibold text-green-600 mt-1">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center justify-center flex-1 h-full group"
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="merchantActiveTab"
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-b-full"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}

                                {/* Icon container */}
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isActive
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white scale-110'
                                            : 'text-gray-500 group-hover:text-green-600 group-hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon size={20} strokeWidth={2.5} />
                                </div>

                                {/* Label */}
                                <span
                                    className={`text-xs font-semibold mt-1 transition-colors ${isActive ? 'text-green-600' : 'text-gray-600 group-hover:text-green-600'
                                        }`}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </motion.nav>
        </>
    );
}
