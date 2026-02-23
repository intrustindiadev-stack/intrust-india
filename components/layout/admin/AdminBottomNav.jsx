'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Store, DollarSign, Settings, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Package, label: 'Cards', href: '/admin/giftcards' },
    { icon: Users, label: 'Users', href: '/admin/users' },
    { icon: Store, label: 'Merchants', href: '/admin/merchants' },
    { icon: DollarSign, label: 'Revenue', href: '/admin/transactions' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminBottomNav() {
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

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center justify-center flex-1 h-full group"
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="adminActiveTab"
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-full"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}

                                {/* Icon container */}
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${isActive
                                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-110'
                                        : 'text-gray-500 group-hover:text-purple-600 group-hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon size={20} strokeWidth={2.5} />
                                </div>

                                {/* Label */}
                                <span
                                    className={`text-xs font-semibold mt-1 transition-colors ${isActive ? 'text-purple-600' : 'text-gray-600 group-hover:text-purple-600'
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
