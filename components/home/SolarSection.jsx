'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { Sun, Zap, ArrowRight, CheckCircle2, IndianRupee, Phone } from 'lucide-react';

// Animated spinning sun with rays
function AnimatedSunHero({ size = 120 }) {
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Outer rotating ring of rays */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
            >
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute left-1/2 top-0"
                        style={{
                            width: 2.5,
                            height: size * 0.22,
                            borderRadius: 99,
                            background: 'linear-gradient(to bottom, #FCD34D, transparent)',
                            transformOrigin: `1.25px ${size / 2}px`,
                            transform: `rotate(${i * 30}deg)`,
                            marginLeft: -1.25,
                        }}
                    />
                ))}
            </motion.div>
            {/* Inner pulsing glow */}
            <motion.div
                className="absolute rounded-full bg-amber-400/20"
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ width: size * 0.6, height: size * 0.6 }}
            />
            {/* Core */}
            <motion.div
                className="relative rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                    width: size * 0.46, height: size * 0.46,
                    background: 'radial-gradient(circle, #FDE68A 30%, #F59E0B 75%, #D97706)',
                    boxShadow: '0 0 40px 12px #FCD34D55',
                }}
            >
                <Sun size={size * 0.24} className="text-amber-900" />
            </motion.div>
        </div>
    );
}

const KW_PLANS = [
    { kw: '5 kW', monthly: '₹5,700', saving: '₹5,700+/mo', highlight: false },
    { kw: '7 kW', monthly: '₹7,900', saving: '₹8,000+/mo', highlight: true },
    { kw: '10 kW', monthly: '₹10,000', saving: '₹11,000+/mo', highlight: false },
];

const FEATURES = [
    'Government subsidy up to ₹78,000',
    '₹0 down payment required',
    'EMI covered by electricity savings',
    '25-year manufacturer warranty',
    "India's #1 solar company",
    'Free site survey & consultation',
];

export default function SolarSection() {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <section ref={ref} className="relative overflow-hidden py-16 sm:py-24" style={{ background: 'var(--bg-primary)' }}>
            {/* Full-bleed sky gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#05101e] via-[#0a1e3c] to-[#071530] opacity-95 dark:opacity-100" />
            <div className="absolute top-0 left-1/3 w-[500px] h-[300px] bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-sky-400/8 rounded-full blur-[100px] pointer-events-none" />

            {/* Subtle grid overlay */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">

                {/* ── Section header ── */}
                <div className="text-center mb-12 sm:mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                        className="flex items-center justify-center gap-3 mb-6"
                    >
                        {/* SolarSquare logo pill */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/8 border border-white/15 backdrop-blur-sm">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                                <div className="grid grid-cols-2 gap-0.5 p-1">
                                    {[0,1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-[1px] bg-white" />)}
                                </div>
                            </div>
                            <span className="text-white font-black text-sm">solar<span className="text-sky-400">square</span></span>
                            <span className="text-white/30 text-xs font-bold">× InTrust</span>
                        </div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.08 }}
                        className="text-sky-400 text-xs sm:text-sm font-black uppercase tracking-[0.35em] mb-3"
                    >
                        अब हर घर सोलर — 0 इन्वेस्टमेंट पर
                    </motion.p>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.12 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none mb-4"
                    >
                        Go Solar at{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                            Zero Cost.
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.16 }}
                        className="text-white/50 text-base sm:text-lg font-medium max-w-2xl mx-auto"
                    >
                        Government subsidy covers your full down payment. Your electricity bill savings cover the monthly EMI. You save from day one.
                    </motion.p>
                </div>

                {/* ── Main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

                    {/* Left: Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.18, duration: 0.6 }}
                        className="relative"
                    >
                        {/* House image */}
                        <div className="relative w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl shadow-blue-900/40">
                            <Image
                                src="/solar-home.png"
                                alt="Solar powered Indian home by SolarSquare"
                                fill
                                className="object-cover object-center"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#071530]/70 via-transparent to-transparent" />

                            {/* Floating "on our way" badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5 }}
                                className="absolute bottom-4 left-4 flex items-center gap-2 bg-sky-600/90 backdrop-blur-md px-4 py-2 rounded-xl border border-sky-400/30 shadow-xl"
                            >
                                <Zap size={14} className="text-white" />
                                <p className="text-white text-xs font-black">On our way to power your home with solar</p>
                            </motion.div>

                            {/* Saving ticker badge */}
                            <motion.div
                                initial={{ opacity: 0, y: -10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.6 }}
                                className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-400/30 shadow-xl text-center"
                            >
                                <p className="text-emerald-100 text-[9px] font-black uppercase tracking-widest">Avg Monthly Saving</p>
                                <p className="text-white font-black text-lg leading-none">₹7,500+</p>
                            </motion.div>
                        </div>

                        {/* Animated sun positioned top-left of image */}
                        <div className="absolute -top-10 -left-10 sm:-top-14 sm:-left-14">
                            <AnimatedSunHero size={100} />
                        </div>
                    </motion.div>

                    {/* Right: Plans + features */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.22, duration: 0.6 }}
                        className="space-y-6"
                    >
                        {/* kW Plan table */}
                        <div className="rounded-2xl overflow-hidden border border-white/10">
                            <div className="grid grid-cols-3 bg-sky-950/60 border-b border-white/10 px-4 py-2.5">
                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">System</p>
                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest text-center">Monthly</p>
                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest text-right">Bill Saving</p>
                            </div>
                            {KW_PLANS.map((plan, i) => (
                                <motion.div
                                    key={plan.kw}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={inView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.3 + i * 0.07 }}
                                    className={`grid grid-cols-3 px-4 py-3 ${plan.highlight ? 'bg-sky-500/10' : ''} ${i < KW_PLANS.length - 1 ? 'border-b border-white/5' : ''}`}
                                >
                                    <p className="text-white font-black text-sm">{plan.kw}</p>
                                    <p className={`font-bold text-sm text-center ${plan.highlight ? 'text-sky-300' : 'text-white/70'}`}>{plan.monthly}</p>
                                    <p className="text-amber-400 font-black text-sm text-right">{plan.saving}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Features checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {FEATURES.map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={inView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.38 + i * 0.06 }}
                                    className="flex items-center gap-2"
                                >
                                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                    <span className="text-white/70 text-xs font-medium">{f}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Subsidy highlight */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-2xl">🏛️</div>
                            <div>
                                <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-0.5">PM Surya Ghar Yojana</p>
                                <p className="text-white font-black text-base leading-tight">
                                    Get up to <span className="text-amber-400">₹78,000</span> government subsidy on your solar installation
                                </p>
                            </div>
                        </div>

                        {/* CTA buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/solar" className="flex-1">
                                <motion.div
                                    whileTap={{ scale: 0.97 }}
                                    className="flex items-center justify-between px-6 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 shadow-2xl shadow-sky-500/25 cursor-pointer group"
                                >
                                    <div>
                                        <p className="text-sky-200/60 text-[9px] font-black uppercase tracking-widest leading-none mb-0.5">Free Consultation</p>
                                        <p className="text-white font-black text-base leading-none">Get Free Quote</p>
                                    </div>
                                    <motion.div
                                        animate={{ x: [0, 4, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <ArrowRight size={20} className="text-white" />
                                    </motion.div>
                                </motion.div>
                            </Link>
                            <a
                                href="tel:18002030052"
                                className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/8 border border-white/15 hover:bg-white/12 transition-colors"
                            >
                                <Phone size={16} className="text-sky-400" />
                                <div className="text-left">
                                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Tollfree</p>
                                    <p className="text-white font-black text-sm leading-none">1800-203-0052</p>
                                </div>
                            </a>
                        </div>

                        <p className="text-center text-white/25 text-[10px] font-medium">
                            * Per National Portal for Rooftop Solar data: pmsuryaghar.gov.in
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
