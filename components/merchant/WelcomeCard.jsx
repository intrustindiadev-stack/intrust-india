'use client';

import Link from 'next/link';
import { Rocket, ShoppingCart, Package, ToggleRight } from 'lucide-react';

const steps = [
    {
        num: 'Step 1',
        title: 'Purchase Coupons',
        label: 'Go to Purchase →',
        href: '/merchant/purchase',
        icon: ShoppingCart,
        highlight: false,
    },
    {
        num: 'Step 2',
        title: 'List Your Inventory',
        label: 'View Inventory →',
        href: '/merchant/inventory',
        icon: Package,
        highlight: true,
    },
    {
        num: 'Step 3',
        title: 'Go Live',
        label: 'Toggle Store Status ↑',
        href: null,
        icon: ToggleRight,
        highlight: false,
    },
];

export default function WelcomeCard() {
    return (
        <div className="mb-8 w-full rounded-[1.5rem] border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 backdrop-blur-sm p-8 text-center shadow-sm">
            <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-3xl">
                    <Rocket className="text-[#D4AF37] w-7 h-7" />
                </div>
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
                Welcome to your dashboard
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                You haven&apos;t made any sales yet. Here&apos;s how to get started.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {steps.map((step) => {
                    const Icon = step.icon;
                    const inner = (
                        <div
                            className={`flex flex-col text-left p-5 rounded-2xl border w-full sm:w-48 transition-all hover:scale-[1.02] ${step.highlight
                                    ? 'bg-[#fefce8] dark:bg-[#D4AF37]/10 border-[#D4AF37]/40'
                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            <Icon className={`w-5 h-5 mb-3 ${step.highlight ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                {step.num}
                            </span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
                                {step.title}
                            </span>
                            <span className={`text-xs font-semibold ${step.highlight ? 'text-[#D4AF37]' : 'text-slate-500'}`}>
                                {step.label}
                            </span>
                        </div>
                    );

                    return step.href ? (
                        <Link key={step.num} href={step.href} className="flex">
                            {inner}
                        </Link>
                    ) : (
                        <div key={step.num} className="flex">
                            {inner}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
