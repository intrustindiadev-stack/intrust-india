'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, CreditCard, Gift, Wallet, Store, Sun } from 'lucide-react';
import Link from 'next/link';

const SERVICES = [
    {
        id: 'mart',
        icon: ShoppingCart,
        label: 'InTrust Mart',
        desc: 'Shop from verified local stores & get doorstep delivery',
        href: '/shop',
        gradient: 'from-blue-500/10 to-sky-400/10',
        iconBg: 'bg-blue-50 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        border: 'hover:border-blue-200 dark:hover:border-blue-700',
    },
    {
        id: 'nfc',
        icon: CreditCard,
        label: 'Smart NFC Cards',
        desc: 'Digital business cards with one-tap contact sharing',
        href: '/nfc-service',
        gradient: 'from-violet-500/10 to-purple-400/10',
        iconBg: 'bg-violet-50 dark:bg-violet-900/30',
        iconColor: 'text-violet-600 dark:text-violet-400',
        border: 'hover:border-violet-200 dark:hover:border-violet-700',
    },
    {
        id: 'gift',
        icon: Gift,
        label: 'Brand Gift Cards',
        desc: 'Instant gift cards for Amazon, Netflix, Flipkart & more',
        href: '/gift-cards',
        gradient: 'from-rose-500/10 to-pink-400/10',
        iconBg: 'bg-rose-50 dark:bg-rose-900/30',
        iconColor: 'text-rose-600 dark:text-rose-400',
        border: 'hover:border-rose-200 dark:hover:border-rose-700',
    },
    {
        id: 'wallet',
        icon: Wallet,
        label: 'Digital Wallet',
        desc: 'Secure payments, instant transfers & cashback rewards',
        href: '/wallet',
        gradient: 'from-emerald-500/10 to-teal-400/10',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        border: 'hover:border-emerald-200 dark:hover:border-emerald-700',
    },
    {
        id: 'merchant',
        icon: Store,
        label: 'Become a Merchant',
        desc: 'List your store, sell more & grow your local business',
        href: '/merchant-apply',
        gradient: 'from-amber-500/10 to-orange-400/10',
        iconBg: 'bg-amber-50 dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        border: 'hover:border-amber-200 dark:hover:border-amber-700',
    },
    {
        id: 'solar',
        icon: Sun,
        label: 'Solar Power',
        desc: '₹0 investment. Govt subsidy covers down payment',
        href: '/solar',
        gradient: 'from-yellow-500/10 to-amber-400/10',
        iconBg: 'bg-yellow-50 dark:bg-yellow-900/30',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        border: 'hover:border-yellow-200 dark:hover:border-yellow-700',
        badge: 'New',
    },
];

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function ServicesGrid() {
    return (
        <section className="py-14 md:py-20 font-[family-name:var(--font-outfit)]"
            style={{ background: 'var(--bg-secondary)' }}>

            <div className="max-w-6xl mx-auto px-4 sm:px-6">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-10 md:mb-14"
                >
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#92BCEA] mb-3">
                        What We Offer
                    </span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
                        style={{ color: 'var(--text-primary)' }}>
                        Our Integrated Services
                    </h2>
                    <p className="mt-3 text-sm md:text-base max-w-xl mx-auto leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}>
                        Everything you need — shopping, payments, gifting and networking — all in one platform.
                    </p>
                </motion.div>

                {/* Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-40px' }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
                >
                    {SERVICES.map((svc) => (
                        <motion.div key={svc.id} variants={cardVariants}>
                            <Link
                                href={svc.href}
                                className={`
                                    group relative flex flex-col items-center text-center p-4 md:p-5 rounded-2xl
                                    border transition-all duration-300
                                    bg-[var(--card-bg)] border-[var(--border-color)]
                                    ${svc.border}
                                    hover:-translate-y-1 hover:shadow-lg
                                    active:scale-[0.98]
                                `}
                            >
                                {/* Badge */}
                                {svc.badge && (
                                    <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                                        {svc.badge}
                                    </span>
                                )}

                                {/* Icon */}
                                <div className={`
                                    w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-3
                                    ${svc.iconBg} transition-transform duration-300 group-hover:scale-110
                                `}>
                                    <svc.icon
                                        size={22}
                                        className={svc.iconColor}
                                        strokeWidth={1.75}
                                    />
                                </div>

                                {/* Label */}
                                <p className="text-xs sm:text-sm font-bold leading-tight mb-1.5"
                                    style={{ color: 'var(--text-primary)' }}>
                                    {svc.label}
                                </p>

                                {/* Desc — hidden on xs, shown md+ */}
                                <p className="hidden md:block text-[11px] leading-snug"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    {svc.desc}
                                </p>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
