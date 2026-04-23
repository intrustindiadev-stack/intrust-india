'use client';

import { motion } from 'framer-motion';
import { UserPlus, ScanFace, Store, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
    {
        id: 1,
        icon: UserPlus,
        label: 'Create Account',
        desc: 'Sign up instantly with your phone number. Takes under 60 seconds — no paperwork required.',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        ring: 'ring-blue-200 dark:ring-blue-800',
        href: '/signup',
    },
    {
        id: 2,
        icon: ScanFace,
        label: 'Complete KYC',
        desc: 'Verify your identity with Aadhaar & PAN in minutes. Fully digital, fully secure.',
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-50 dark:bg-violet-900/20',
        ring: 'ring-violet-200 dark:ring-violet-800',
        href: '/profile/kyc',
    },
    {
        id: 3,
        icon: Store,
        label: 'Apply as Merchant',
        desc: 'Submit your business details, go live on InTrust Mart and start selling to thousands of customers.',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        ring: 'ring-emerald-200 dark:ring-emerald-800',
        href: '/merchant-apply',
    },
];

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function HowItWorksSection() {
    return (
        <section
            className="py-14 md:py-20 font-[family-name:var(--font-outfit)] relative overflow-hidden"
            style={{ background: 'var(--bg-secondary)' }}
        >
            {/* Subtle grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12 md:mb-16"
                >
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#92BCEA] mb-3">
                        Merchant Onboarding
                    </span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
                        style={{ color: 'var(--text-primary)' }}>
                        Start Selling in 3 Simple Steps
                    </h2>
                    <p className="mt-3 text-sm md:text-base max-w-lg mx-auto leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}>
                        Join hundreds of local merchants already growing their business on InTrust.
                    </p>
                </motion.div>

                {/* Steps */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-40px' }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8"
                >
                    {STEPS.map((step, i) => (
                        <motion.div key={step.id} variants={itemVariants} className="relative">

                            {/* Connector arrow — desktop only */}
                            {i < STEPS.length - 1 && (
                                <div className="hidden sm:flex absolute top-10 left-[calc(100%+0px)] w-full items-center justify-center z-20 pointer-events-none"
                                    style={{ width: 'calc(var(--gap, 2rem) + 0px)' }}>
                                    <ArrowRight size={16} className="text-[var(--border-color)] absolute -right-4 top-1/2 -translate-y-1/2" />
                                </div>
                            )}

                            <Link
                                href={step.href}
                                className="
                                    relative z-10 flex flex-col items-center text-center p-6 rounded-2xl border
                                    bg-[var(--card-bg)] border-[var(--border-color)]
                                    hover:shadow-lg hover:-translate-y-1 transition-all duration-300
                                    group
                                "
                            >
                                {/* Step number badge */}
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                    <span className="
                                        inline-flex w-7 h-7 rounded-full items-center justify-center
                                        text-[11px] font-black text-white
                                        bg-[#171A21] dark:bg-[#92BCEA] dark:text-[#171A21]
                                        shadow-md
                                    ">
                                        {step.id}
                                    </span>
                                </div>

                                {/* Icon */}
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ring-4 transition-transform duration-300 group-hover:scale-110 ${step.bg} ${step.ring}`}>
                                    <step.icon size={28} className={step.color} strokeWidth={1.75} />
                                </div>

                                {/* Label */}
                                <h3 className="text-base font-bold mb-2"
                                    style={{ color: 'var(--text-primary)' }}>
                                    {step.label}
                                </h3>

                                {/* Desc */}
                                <p className="text-xs leading-relaxed"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    {step.desc}
                                </p>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex justify-center mt-10"
                >
                    <Link
                        href="/merchant-apply"
                        className="
                            inline-flex items-center gap-2 px-7 py-3 rounded-xl
                            bg-[#171A21] dark:bg-[#92BCEA]
                            text-white dark:text-[#171A21]
                            text-sm font-bold
                            hover:opacity-90 hover:-translate-y-0.5
                            transition-all duration-200
                            shadow-lg shadow-black/10
                        "
                    >
                        Apply as Merchant <ArrowRight size={15} />
                    </Link>
                </motion.div>

            </div>
        </section>
    );
}
