'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
    { icon: 'home', label: 'Home', href: '/merchant/dashboard' },
    { icon: 'shopping_bag', label: 'Buy Stock', href: '/merchant/shopping/wholesale' },
    { icon: 'storefront', label: 'My Shop', href: '/merchant/shopping/inventory' },
    { icon: 'account_balance_wallet', label: 'Portfolio', href: '/merchant/wallet' },
    { icon: 'person', label: 'Account', href: '/merchant/profile' },
];

export default function MerchantBottomNav() {
    const pathname = usePathname();

    return (
        <>
            {/* Spacer to prevent content from being hidden behind bottom nav */}
            <div className="h-28 lg:hidden" />

            {/* Bottom Navigation - Floating Pill - Mobile/Tablet Only */}
            <nav className="fixed bottom-6 left-4 right-4 z-40 lg:hidden pointer-events-none">
                <div className="bg-navy-800 dark:bg-navy-900 rounded-full shadow-2xl border border-white/10 p-2 pointer-events-auto flex items-center justify-between mx-auto max-w-md">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative flex flex-col items-center justify-center h-14 flex-1 rounded-full transition-all duration-300 ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <span className={`material-icons-round text-[22px] transition-transform ${isActive ? 'scale-110 text-[#D4AF37]' : ''}`}>
                                    {item.icon}
                                </span>
                                {isActive && (
                                    <span className="text-[10px] font-bold mt-1 tracking-wide text-[#D4AF37]">
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
