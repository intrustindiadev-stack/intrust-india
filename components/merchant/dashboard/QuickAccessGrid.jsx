import Link from 'next/link';

export default function QuickAccessGrid({ pendingUdhariCount, pendingOrdersCount }) {
    const accessItems = [
        {
            icon: 'storefront',
            label: 'Wholesale',
            href: '/merchant/shopping/wholesale',
            color: 'text-slate-800 dark:text-[#D4AF37]',
            bg: 'bg-slate-100 dark:bg-[#D4AF37]/10',
        },
        {
            icon: 'inventory_2',
            label: 'Inventory',
            href: '/merchant/inventory',
            color: 'text-slate-800 dark:text-[#D4AF37]',
            bg: 'bg-slate-100 dark:bg-[#D4AF37]/10',
        },
        {
            icon: 'local_shipping',
            label: 'Orders',
            href: '/merchant/shopping/orders',
            color: 'text-slate-800 dark:text-[#D4AF37]',
            bg: 'bg-slate-100 dark:bg-[#D4AF37]/10',
            badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
        },
        {
            icon: 'card_giftcard',
            label: 'Gift Cards',
            href: '/merchant/purchase',
            color: 'text-slate-800 dark:text-[#D4AF37]',
            bg: 'bg-slate-100 dark:bg-[#D4AF37]/10',
        },
        {
            icon: 'account_balance_wallet',
            label: 'Wallet',
            href: '/merchant/wallet',
            color: 'text-slate-800 dark:text-[#D4AF37]',
            bg: 'bg-slate-100 dark:bg-[#D4AF37]/10',
        },
        {
            icon: 'payments',
            label: 'Credits',
            href: '/merchant/udhari',
            color: 'text-slate-800 dark:text-[#D4AF37]',
            bg: 'bg-slate-100 dark:bg-[#D4AF37]/10',
            badge: pendingUdhariCount > 0 ? pendingUdhariCount : null,
        },
        {
            icon: 'insights',
            label: 'Analytics',
            href: '/merchant/analytics',
            color: 'text-slate-800 dark:text-[#D4AF37]',
            bg: 'bg-slate-100 dark:bg-[#D4AF37]/10',
        },
        {
            icon: 'star_rate',
            label: 'Ratings',
            href: '/merchant/ratings',
            color: 'text-slate-800 dark:text-[#D4AF37]',
            bg: 'bg-slate-100 dark:bg-[#D4AF37]/10',
        },
    ];

    return (
        <div className="mb-10">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-4 px-2 tracking-wide">Quick Access</h3>
            <div className="grid grid-cols-4 gap-3 sm:gap-4 px-2">
                {accessItems.map((item, index) => (
                    <Link key={index} href={item.href} className="flex flex-col items-center group">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] ${item.bg} flex items-center justify-center mb-2 relative transition-transform group-hover:scale-105 border border-black/5 dark:border-white/5`}>
                            <span className={`material-icons-round text-2xl sm:text-3xl ${item.color}`}>
                                {item.icon}
                            </span>
                            {item.badge && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-[#020617] shadow-sm animate-bounce">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                            {item.label}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
