'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
    { icon: 'grid_view', label: 'Dashboard', href: '/merchant/dashboard' },
    { icon: 'inventory_2', label: 'Inventory', href: '/merchant/inventory' },
    { icon: 'add_shopping_cart', label: 'Purchase', href: '/merchant/purchase', special: true },
    { icon: 'account_balance_wallet', label: 'Wallet', href: '/merchant/wallet' },
    { icon: 'person', label: 'Profile', href: '/merchant/profile' },
];

export default function MerchantBottomNav() {
    const pathname = usePathname();

    return (
        <>
            {/* Spacer to prevent content from being hidden behind bottom nav */}
            <div className="h-24 lg:hidden" />

            {/* Bottom Navigation - Mobile/Tablet Only */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-t border-black/5 dark:border-white/10 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] transition-colors">
                <div className="flex items-center justify-around h-20 px-2 pb-safe">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                        // Special styling for "Purchase" button
                        if (item.special) {
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="relative flex flex-col items-center justify-center flex-1 h-full group -mt-10"
                                >
                                    {/* Floating action button */}
                                    <div className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-[#D4AF37] text-white dark:text-[#020617] scale-105 shadow-[#D4AF37]/30 gold-glow' : 'bg-white dark:bg-white/10 text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/20 border border-black/5 dark:border-white/10 shadow-lg'}`}>
                                        <span className="material-icons-round text-3xl">{item.icon}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors ${isActive ? 'text-[#D4AF37]' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#D4AF37]'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center justify-center flex-1 h-full group py-2"
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#D4AF37] rounded-b-full shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
                                )}

                                {/* Icon container */}
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isActive
                                        ? 'text-[#D4AF37]'
                                        : 'text-slate-400 dark:text-slate-500 group-hover:text-[#D4AF37] group-hover:bg-black/5 dark:group-hover:bg-white/5'
                                        }`}
                                >
                                    <span className={`material-icons-round text-2xl transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                                </div>

                                {/* Label */}
                                <span
                                    className={`text-[10px] font-bold uppercase tracking-wider mt-1 transition-colors ${isActive ? 'text-[#D4AF37]' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#D4AF37]'
                                        }`}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
