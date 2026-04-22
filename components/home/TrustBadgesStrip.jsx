'use client';

import { motion } from 'framer-motion';
import { Truck, ShieldCheck, RefreshCcw, Headphones } from 'lucide-react';

const BADGES = [
    {
        id: 'delivery',
        icon: Truck,
        label: 'Fast Delivery',
        desc: 'Same-day delivery available',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
        id: 'payments',
        icon: ShieldCheck,
        label: 'Secure Payments',
        desc: '256-bit SSL encrypted',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
        id: 'returns',
        icon: RefreshCcw,
        label: 'Easy Refunds',
        desc: 'Hassle-free return policy',
        color: 'text-violet-500',
        bg: 'bg-violet-50 dark:bg-violet-900/20',
    },
    {
        id: 'support',
        icon: Headphones,
        label: '24/7 Support',
        desc: 'Always here to help',
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
];

export default function TrustBadgesStrip() {
    return (
        <section
            className="py-10 md:py-14 font-[family-name:var(--font-outfit)]"
            style={{
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
            }}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {BADGES.map((badge, i) => (
                        <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.07 }}
                            className="flex items-center gap-3 md:justify-center"
                        >
                            {/* Icon */}
                            <div className={`
                                w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                ${badge.bg}
                            `}>
                                <badge.icon size={20} className={badge.color} strokeWidth={1.75} />
                            </div>

                            {/* Text */}
                            <div>
                                <p className="text-sm font-bold leading-tight"
                                    style={{ color: 'var(--text-primary)' }}>
                                    {badge.label}
                                </p>
                                <p className="text-[11px] leading-snug"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    {badge.desc}
                                </p>
                            </div>

                            {/* Divider — visible on md between items */}
                            {i < BADGES.length - 1 && (
                                <div
                                    className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-8"
                                    style={{ background: 'var(--border-color)' }}
                                />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
