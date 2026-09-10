import Link from 'next/link';
import { Warehouse, Package, ShoppingCart, Gift, Wallet, CreditCard, BarChart3, Zap, ArrowRight } from 'lucide-react';

export default function QuickAccessGrid({ pendingUdhariCount, pendingOrdersCount, pendingAIOrdersCount = 0 }) {
    const accessItems = [
        {
            icon: <Warehouse className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
            label: 'Wholesale',
            href: '/merchant/shopping/wholesale',
            bgIcon: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40',
            hoverGroup: 'hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-[0_8px_30px_rgb(37,99,235,0.12)]',
        },
        {
            icon: <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
            label: 'Inventory',
            href: '/merchant/inventory',
            bgIcon: 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40',
            hoverGroup: 'hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-[0_8px_30px_rgb(79,70,229,0.12)]',
        },
        {
            icon: <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
            label: 'Orders',
            href: '/merchant/shopping/orders',
            bgIcon: 'bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40',
            hoverGroup: 'hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-[0_8px_30px_rgb(147,51,234,0.12)]',
            badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
        },
        {
            icon: <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
            label: 'AI Orders',
            href: pendingAIOrdersCount > 0 ? '/merchant/ai-orders?tab=PENDING' : '/merchant/ai-orders',
            bgIcon: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200/60 dark:border-amber-900/40',
            hoverGroup: 'hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-[0_8px_30px_rgb(245,158,11,0.12)]',
            badge: pendingAIOrdersCount > 0 ? pendingAIOrdersCount : null,
        },
        {
            icon: <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
            label: 'Wallet',
            href: '/merchant/wallet',
            bgIcon: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40',
            hoverGroup: 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-[0_8px_30px_rgb(5,150,105,0.12)]',
        },
        {
            icon: <CreditCard className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
            label: 'Credits',
            href: '/merchant/udhari',
            bgIcon: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40',
            hoverGroup: 'hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-[0_8px_30px_rgb(225,29,72,0.12)]',
            badge: pendingUdhariCount > 0 ? pendingUdhariCount : null,
        },
        {
            icon: <Gift className="w-6 h-6 text-pink-600 dark:text-pink-400" />,
            label: 'Gift Cards',
            href: '/merchant/purchase',
            bgIcon: 'bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40',
            hoverGroup: 'hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-[0_8px_30px_rgb(219,39,119,0.12)]',
        },
        {
            icon: <BarChart3 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />,
            label: 'Analytics',
            href: '/merchant/analytics',
            bgIcon: 'bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/40',
            hoverGroup: 'hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-[0_8px_30px_rgb(8,145,178,0.12)]',
        },
    ];

    return (
        <section className="mb-8 relative z-10">
            <div className="flex items-center justify-between mb-5 px-1 sm:px-0">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Quick Access</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 px-1 sm:px-0">
                {accessItems.map((item, index) => (
                    <Link key={index} href={item.href} className={`group relative bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${item.hoverGroup}`}>
                        {item.badge && (
                            <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-black shadow-lg ring-4 ring-white dark:ring-slate-900 animate-bounce z-10">
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                        <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110 ${item.bgIcon}`}>
                                {item.icon}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 border border-slate-100 dark:border-slate-700">
                                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.label}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
