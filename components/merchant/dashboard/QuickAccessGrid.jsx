import Link from 'next/link';
import { Warehouse, Package, ShoppingCart, Gift, Wallet, CreditCard, BarChart3, Bot, ArrowRight } from 'lucide-react';

export default function QuickAccessGrid({ pendingUdhariCount, pendingOrdersCount }) {
    const accessItems = [
        {
            icon: <Warehouse className="w-6 h-6 text-blue-600" />,
            label: 'Wholesale',
            href: '/merchant/shopping/wholesale',
            bgIcon: 'bg-blue-50 border border-blue-100',
            hoverGroup: 'hover:border-blue-300 hover:shadow-[0_8px_30px_rgb(37,99,235,0.12)]',
        },
        {
            icon: <Package className="w-6 h-6 text-indigo-600" />,
            label: 'Inventory',
            href: '/merchant/inventory',
            bgIcon: 'bg-indigo-50 border border-indigo-100',
            hoverGroup: 'hover:border-indigo-300 hover:shadow-[0_8px_30px_rgb(79,70,229,0.12)]',
        },
        {
            icon: <ShoppingCart className="w-6 h-6 text-purple-600" />,
            label: 'Orders',
            href: '/merchant/shopping/orders',
            bgIcon: 'bg-purple-50 border border-purple-100',
            hoverGroup: 'hover:border-purple-300 hover:shadow-[0_8px_30px_rgb(147,51,234,0.12)]',
            badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
        },
        {
            icon: <Gift className="w-6 h-6 text-pink-600" />,
            label: 'Gift Cards',
            href: '/merchant/purchase',
            bgIcon: 'bg-pink-50 border border-pink-100',
            hoverGroup: 'hover:border-pink-300 hover:shadow-[0_8px_30px_rgb(219,39,119,0.12)]',
        },
        {
            icon: <Wallet className="w-6 h-6 text-emerald-600" />,
            label: 'Wallet',
            href: '/merchant/wallet',
            bgIcon: 'bg-emerald-50 border border-emerald-100',
            hoverGroup: 'hover:border-emerald-300 hover:shadow-[0_8px_30px_rgb(5,150,105,0.12)]',
        },
        {
            icon: <CreditCard className="w-6 h-6 text-amber-600" />,
            label: 'Credits',
            href: '/merchant/udhari',
            bgIcon: 'bg-amber-50 border border-amber-100',
            hoverGroup: 'hover:border-amber-300 hover:shadow-[0_8px_30px_rgb(217,119,6,0.12)]',
            badge: pendingUdhariCount > 0 ? pendingUdhariCount : null,
        },
        {
            icon: <BarChart3 className="w-6 h-6 text-cyan-600" />,
            label: 'Analytics',
            href: '/merchant/analytics',
            bgIcon: 'bg-cyan-50 border border-cyan-100',
            hoverGroup: 'hover:border-cyan-300 hover:shadow-[0_8px_30px_rgb(8,145,178,0.12)]',
        },
        {
            icon: <Bot className="w-6 h-6 text-orange-600" />,
            label: 'Auto Mode',
            href: '/merchant/shopping/auto-mode',
            bgIcon: 'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100',
            hoverGroup: 'hover:border-orange-300 hover:shadow-[0_8px_30px_rgb(234,88,12,0.12)]',
        },
    ];

    return (
        <section className="mb-8 relative z-10">
            <div className="flex items-center justify-between mb-5 px-1 sm:px-0">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Quick Access</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 px-1 sm:px-0">
                {accessItems.map((item, index) => (
                    <Link key={index} href={item.href} className={`group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${item.hoverGroup}`}>
                        {item.badge && (
                            <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-black shadow-lg ring-4 ring-white animate-bounce z-10">
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                        <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110 ${item.bgIcon}`}>
                                {item.icon}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 border border-slate-100">
                                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{item.label}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
