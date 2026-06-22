'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Truck, ShoppingBag, Wallet, TrendingUp,
    BarChart3, Settings, Store, X, Zap, ArrowRight, LayoutGrid
} from 'lucide-react';

const actions = [
    { icon: Package,     label: 'Inventory',  sub: 'Stock & listings',   href: '/merchant/inventory',          bg: 'bg-indigo-50 dark:bg-indigo-500/15',   iconColor: 'text-indigo-500',   highlight: true },
    { icon: Truck,       label: 'Orders',     sub: 'Track deliveries',   href: '/merchant/shopping/orders',    bg: 'bg-emerald-50 dark:bg-emerald-500/15', iconColor: 'text-emerald-500',  badge: 'orders' },
    { icon: ShoppingBag, label: 'Coupons',    sub: 'Manage coupons',     href: '/merchant/purchase',           bg: 'bg-amber-50 dark:bg-amber-500/15',     iconColor: 'text-amber-500' },
    { icon: Wallet,      label: 'Credits',    sub: 'Udhari & payables',  href: '/merchant/udhari',             bg: 'bg-rose-50 dark:bg-rose-500/15',       iconColor: 'text-rose-500',     badge: 'udhari' },
    { icon: TrendingUp,  label: 'AI Grow',    sub: 'Growth plans',       href: '/merchant/investments',        bg: 'bg-violet-50 dark:bg-violet-500/15',   iconColor: 'text-violet-500' },
    { icon: BarChart3,   label: 'Analytics',  sub: 'Revenue & trends',   href: '/merchant/analytics',          bg: 'bg-cyan-50 dark:bg-cyan-500/15',       iconColor: 'text-cyan-500' },
    { icon: Store,       label: 'My Shop',    sub: 'Storefront view',    href: '/merchant/shopping/inventory', bg: 'bg-orange-50 dark:bg-orange-500/15',   iconColor: 'text-orange-500' },
    { icon: Settings,    label: 'Settings',   sub: 'Account & profile',  href: '/merchant/profile',            bg: 'bg-slate-100 dark:bg-slate-500/15',    iconColor: 'text-slate-500' },
];

// Container variants — stagger children
const gridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.94 },
    show:   { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

export default function MerchantControlCenter({ pendingUdhariCount = 0, pendingOrdersCount = 0 }) {
    const [open, setOpen] = useState(false);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    const getBadge = (a) => {
        if (a.badge === 'orders' && pendingOrdersCount > 0) return pendingOrdersCount;
        if (a.badge === 'udhari'  && pendingUdhariCount  > 0) return pendingUdhariCount;
        return null;
    };

    return (
        <>
            {/* ─────────────────────────────────────────
                TRIGGER  — two variants:
                  • Mobile  → square icon button
                  • Desktop → wide pill (looks like search bar)
               ───────────────────────────────────────── */}

            {/* Mobile icon button */}
            <button
                onClick={() => setOpen(true)}
                aria-label="Open control center"
                className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full bg-black/5 dark:bg-white/8 border border-black/10 dark:border-white/10 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 transition-all duration-200 relative"
            >
                <LayoutGrid size={17} className="text-slate-500 dark:text-slate-400" />
                {(pendingUdhariCount + pendingOrdersCount) > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shadow ring-2 ring-white dark:ring-[#020617]">
                        {Math.min(pendingUdhariCount + pendingOrdersCount, 9)}
                    </span>
                )}
            </button>

            {/* Desktop pill trigger */}
            <button
                onClick={() => setOpen(true)}
                aria-label="Open control center"
                className="hidden sm:flex items-center gap-3 w-full max-w-md px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-left group hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/5 transition-all duration-200 relative"
            >
                <span className="material-icons-round text-slate-400 group-hover:text-[#D4AF37] text-sm transition-colors select-none">apps</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium flex-1 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    Quick navigate — Inventory, Orders, Analytics…
                </span>
                <span className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase border border-slate-200 dark:border-white/10 rounded-lg px-2 py-0.5 select-none">
                    ⌘K
                </span>
                {(pendingUdhariCount + pendingOrdersCount) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow ring-2 ring-white dark:ring-[#020617]">
                        {Math.min(pendingUdhariCount + pendingOrdersCount, 9)}
                    </span>
                )}
            </button>

            {/* ─────────────────────────────────────────
                MODAL
               ───────────────────────────────────────── */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="cc-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[6px]"
                        />

                        {/* Modal */}
                        <motion.div
                            key="cc-modal"
                            initial={{ opacity: 0, scale: 0.92, y: -16 }}
                            animate={{ opacity: 1, scale: 1,    y: 0   }}
                            exit={{   opacity: 0, scale: 0.92,  y: -16 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
                            className="fixed inset-0 z-[201] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 pointer-events-none"
                        >
                            <div className="pointer-events-auto w-full max-w-[400px] bg-white dark:bg-[#0c0e16] rounded-[1.8rem] shadow-[0_32px_80px_rgba(0,0,0,0.28)] border border-slate-100/80 dark:border-white/[0.07] overflow-hidden">

                                {/* Header */}
                                <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center shadow-sm">
                                            <Zap size={13} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black tracking-[0.22em] uppercase text-[#D4AF37] leading-none mb-0.5">Control Center</p>
                                            <h2 className="text-[15px] font-black text-slate-900 dark:text-white leading-none tracking-tight">Quick Navigate</h2>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="w-8 h-8 rounded-2xl bg-slate-100 dark:bg-white/8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/15 active:scale-95 transition-all"
                                        aria-label="Close"
                                    >
                                        <X size={14} className="text-slate-600 dark:text-slate-300" strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Icon Grid */}
                                <motion.div
                                    variants={gridVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="p-4 grid grid-cols-4 gap-2.5"
                                >
                                    {actions.map((a) => {
                                        const badge = getBadge(a);
                                        return (
                                            <motion.div key={a.href} variants={itemVariants}>
                                                <Link
                                                    href={a.href}
                                                    onClick={() => setOpen(false)}
                                                    className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all active:scale-95 group border ${
                                                        a.highlight
                                                            ? 'bg-gradient-to-br from-indigo-500 to-blue-600 border-indigo-400/20 shadow-lg shadow-indigo-500/20'
                                                            : 'bg-transparent border-slate-100 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/12'
                                                    }`}
                                                >
                                                    {badge && (
                                                        <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-0.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow ring-[1.5px] ring-white dark:ring-[#0c0e16] z-10">
                                                            {badge > 9 ? '9+' : badge}
                                                        </span>
                                                    )}

                                                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${a.highlight ? 'bg-white/20' : a.bg}`}>
                                                        <a.icon size={17} className={a.highlight ? 'text-white' : a.iconColor} />
                                                    </div>
                                                    <span className={`text-[10px] font-black tracking-tight text-center leading-none ${a.highlight ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {a.label}
                                                    </span>
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>

                                {/* Footer CTA */}
                                <div className="px-4 pb-4">
                                    <Link
                                        href="/merchant/analytics"
                                        onClick={() => setOpen(false)}
                                        className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-[#D4AF37]/8 to-[#B8860B]/5 border border-[#D4AF37]/15 rounded-2xl group hover:from-[#D4AF37]/15 hover:to-[#B8860B]/10 transition-all duration-150"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <BarChart3 size={15} className="text-[#D4AF37]" />
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">Full Analytics</span>
                                        </div>
                                        <ArrowRight size={14} className="text-[#D4AF37] group-hover:translate-x-1 transition-transform duration-150" />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
