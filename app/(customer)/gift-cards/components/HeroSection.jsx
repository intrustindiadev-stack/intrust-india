'use client';

import { motion } from 'framer-motion';
import { Sparkles, Star, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const staggerContainer = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
};

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const trustItems = [
    { icon: ShieldCheck, label: '100% Verified', color: 'text-emerald-400' },
    { icon: Zap, label: 'Instant Delivery', color: 'text-sky-400' },
    { icon: Star, label: '4.9/5 Rating', color: 'text-amber-400' },
];

export default function HeroSection() {
    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl mb-8 min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]"
            style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0D1526 60%, #111827 100%)' }}
        >
            {/* Hero image — right side */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/giftcard_banner_premium.png"
                    alt="Premium gift cards"
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    className="object-cover object-right opacity-60"
                    priority
                />
                {/* Left gradient fade so text stays readable */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1E] via-[#0A0F1E]/80 to-transparent" />
                {/* Bottom fade */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E]/60 via-transparent to-transparent" />
            </div>

            {/* Floating glow orbs */}
            <div className="absolute top-6 left-1/3 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #92BCEA, transparent)' }} />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full opacity-10 blur-2xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #AFB3F7, transparent)' }} />

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-center h-full p-6 sm:p-10 lg:p-14 max-w-2xl">

                {/* Badge */}
                <motion.div variants={fadeUp} className="mb-5 inline-flex">
                    <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 text-white/90 px-4 py-2 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-lg">
                        <Sparkles size={14} className="text-[#AFB3F7]" />
                        India's Most Trusted Gift Card Marketplace
                    </span>
                </motion.div>

                {/* Headline */}
                <motion.h1 variants={fadeUp}
                    className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-[1.05] tracking-tight mb-4">
                    Buy Gift Cards at{' '}
                    <span className="bg-gradient-to-r from-[#92BCEA] via-[#AFB3F7] to-[#92BCEA] bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
                        Unbeatable Prices
                    </span>
                </motion.h1>

                {/* Sub */}
                <motion.p variants={fadeUp}
                    className="text-white/50 text-sm sm:text-base lg:text-lg max-w-md leading-relaxed mb-7">
                    Verified cards from trusted merchants. Instant delivery. Save up to&nbsp;
                    <span className="text-white/80 font-semibold">20% on every purchase.</span>
                </motion.p>

                {/* CTA */}
                <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 mb-8">
                    <Link
                        href="#cards"
                        className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-[#92BCEA]/25 hover:shadow-[#92BCEA]/40 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Shop Now
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <span className="text-white/30 text-sm font-medium">50,000+ happy customers</span>
                </motion.div>

                {/* Trust badges */}
                <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                    {trustItems.map(({ icon: Icon, label, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <Icon size={14} className={color} />
                            <span className="text-white/60 text-xs font-semibold">{label}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <div className="flex">
                            {[1,2,3,4,5].map(i => (
                                <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                        <span className="text-white/60 text-xs font-semibold">4.9/5</span>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
