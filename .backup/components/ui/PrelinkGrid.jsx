'use client';

import Link from 'next/link';
import {
    CreditCard,
    Smartphone,
    ShoppingBag,
    GiftIcon,
    Zap,
    Plane,
    Briefcase,
    MoreHorizontal,
} from 'lucide-react';

const prelinkItems = [
    {
        id: 'gift-cards',
        title: 'Gift Cards',
        icon: GiftIcon,
        href: '/gift-cards',
        color: 'from-[#7A93AC] to-[#92BCEA]',
        enabled: true,
    },
    {
        id: 'loans',
        title: 'Loans',
        icon: CreditCard,
        href: '/loans',
        color: 'from-[#92BCEA] to-[#AFB3F7]',
        enabled: false, // Coming soon
    },
    {
        id: 'recharge',
        title: 'Recharge',
        icon: Smartphone,
        href: '/recharge',
        color: 'from-[#AFB3F7] to-[#7A93AC]',
        enabled: false,
    },
    {
        id: 'ecommerce',
        title: 'Shopping',
        icon: ShoppingBag,
        href: '/shop',
        color: 'from-[#617073] to-[#7A93AC]',
        enabled: false,
    },
    {
        id: 'bills',
        title: 'Bill Pay',
        icon: Zap,
        href: '/bills',
        color: 'from-[#7A93AC] to-[#617073]',
        enabled: false,
    },
    {
        id: 'bookings',
        title: 'Bookings',
        icon: Plane,
        href: '/bookings',
        color: 'from-[#92BCEA] to-[#7A93AC]',
        enabled: false,
    },
    {
        id: 'business',
        title: 'Business',
        icon: Briefcase,
        href: '/business',
        color: 'from-[#AFB3F7] to-[#617073]',
        enabled: false,
    },
    {
        id: 'more',
        title: 'More',
        icon: MoreHorizontal,
        href: '/services',
        color: 'from-[#617073] to-[#92BCEA]',
        enabled: true,
    },
];

export default function PrelinkGrid() {
    return (
        <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center font-[family-name:var(--font-outfit)]">
                Explore Services
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                {prelinkItems.map((item) => {
                    const Icon = item.icon;

                    const CardContent = (
                        <>
                            <div
                                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 md:mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3`}
                            >
                                <Icon size={32} className="text-white" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-white font-semibold text-sm md:text-base">
                                {item.title}
                            </h3>
                            {!item.enabled && (
                                <span className="text-xs text-white/50 mt-1">Coming Soon</span>
                            )}
                        </>
                    );

                    if (item.enabled) {
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="group glass rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:scale-105 hover:shadow-lg transition-all duration-300 touch-feedback"
                            >
                                {CardContent}
                            </Link>
                        );
                    }

                    return (
                        <div
                            key={item.id}
                            className="glass rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-60 cursor-not-allowed"
                        >
                            {CardContent}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
