'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import {
    Sun, Zap, TrendingDown, ArrowRight,
    IndianRupee, CheckCircle2, Star, Phone
} from 'lucide-react';

// SolarSquare kW plan data (from their ad)
const KW_PLANS = [
    { kw: '5 kW', monthly: '₹5,700', saving: '₹5,700+' },
    { kw: '7 kW', monthly: '₹7,900', saving: '₹8,000+' },
    { kw: '10 kW', monthly: '₹10,000', saving: '₹11,000+' },
];

const BADGES = [
    { emoji: '⭐', label: 'Money-Back', sub: 'Guarantee' },
    { emoji: '🏛️', label: '₹78,000', sub: 'Govt Subsidy' },
    { emoji: '🇮🇳', label: 'India\'s #1', sub: 'Solar Company' },
];

// Animated Sun rays component
function AnimatedSun({ size = 80, className = '' }) {
    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            {/* Rotating rays */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    style={{
                        width: 3, height: size * 0.28,
                        borderRadius: 99,
                        background: 'linear-gradient(to bottom, #FCD34D, transparent)',
                        transformOrigin: `1.5px ${size / 2}px`,
                        rotate: i * 45,
                        top: 0, left: '50%', marginLeft: -1.5,
                    }}
                    animate={{ opacity: [0.4, 1, 0.4], scaleY: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 2, delay: i * 0.25, repeat: Infinity }}
                />
            ))}
            {/* Core circle */}
            <motion.div
                className="absolute rounded-full"
                style={{ width: size * 0.44, height: size * 0.44, background: 'radial-gradient(circle, #FCD34D 60%, #F59E0B)' }}
                animate={{ scale: [1, 1.06, 1], boxShadow: ['0 0 16px 4px #FCD34D55', '0 0 32px 12px #FCD34D88', '0 0 16px 4px #FCD34D55'] }}
                transition={{ duration: 2.4, repeat: Infinity }}
            />
        </div>
    );
}

export default function SolarPromoCard() {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-50px' });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] w-full"
        >
            {/* ── Dark sky gradient background ── */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a2040]" />

            {/* Glow layers */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-amber-400/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-60 h-40 bg-sky-400/10 rounded-full blur-[60px] pointer-events-none" />

            {/* ── Header strip: SolarSquare branding ── */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-0">
                <div className="flex items-center gap-2">
                    {/* SolarSquare-style logo mark */}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
                        <div className="grid grid-cols-2 gap-0.5 p-1">
                            {[0,1,2,3].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-[2px] bg-white/90" />
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-white font-black text-sm leading-none tracking-tight">solar<span className="text-sky-400">square</span></p>
                        <p className="text-white/40 text-[9px] font-bold leading-none mt-0.5 uppercase tracking-widest">Channel Partner</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300 text-[10px] font-black uppercase tracking-widest">Free Survey</span>
                </div>
            </div>

            {/* ── Main content ── */}
            <div className="relative z-10 p-5">

                {/* Hero row: headline + animated sun */}
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex-1">
                        <p className="text-sky-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">अब हर घर सोलर</p>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                            ₹0{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
                                Investment
                            </span>
                        </h2>
                        <p className="text-white/50 text-xs font-medium mt-1.5 leading-relaxed max-w-[200px]">
                            Govt subsidy covers your down payment. Bill savings cover your EMI.
                        </p>
                    </div>
                    <AnimatedSun size={76} className="shrink-0" />
                </div>

                {/* House image */}
                <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden mb-4 border border-white/10">
                    <Image
                        src="/solar-home.png"
                        alt="Solar powered Indian home by SolarSquare"
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 via-transparent to-transparent" />
                    {/* "On Our Way" badge like the ad */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-sky-600/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-sky-400/30 shadow-lg">
                        <Zap size={12} className="text-white" />
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">On our way to power your home</span>
                    </div>
                </div>

                {/* kW Plan table — styled like the ad */}
                <div className="rounded-2xl overflow-hidden border border-white/10 mb-4">
                    <div className="grid grid-cols-3 bg-sky-900/40 border-b border-white/10">
                        <p className="text-white/50 text-[9px] font-black uppercase tracking-widest p-2.5">System</p>
                        <p className="text-white/50 text-[9px] font-black uppercase tracking-widest p-2.5 text-center">Monthly Solar</p>
                        <p className="text-white/50 text-[9px] font-black uppercase tracking-widest p-2.5 text-right">Bill Saving</p>
                    </div>
                    {KW_PLANS.map((plan, i) => (
                        <motion.div
                            key={plan.kw}
                            initial={{ opacity: 0, x: -10 }}
                            animate={inView ? { opacity: 1, x: 0 } : {}}
                            transition={{ delay: 0.2 + i * 0.07 }}
                            className={`grid grid-cols-3 ${i < KW_PLANS.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}
                        >
                            <p className="text-white font-black text-sm p-2.5">{plan.kw}</p>
                            <p className="text-sky-300 font-bold text-sm p-2.5 text-center">{plan.monthly}</p>
                            <p className="text-amber-400 font-black text-sm p-2.5 text-right">{plan.saving} <span className="text-[9px] text-amber-400/60">savings</span></p>
                        </motion.div>
                    ))}
                </div>

                {/* Badges row — like the circular badges in the ad */}
                <div className="flex items-center gap-2 mb-4">
                    {BADGES.map((b, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={inView ? { scale: 1, opacity: 1 } : {}}
                            transition={{ delay: 0.35 + i * 0.08, type: 'spring', stiffness: 200 }}
                            className="flex-1 flex flex-col items-center gap-0.5 p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-center"
                        >
                            <span className="text-xl">{b.emoji}</span>
                            <p className="text-white text-[11px] font-black leading-none">{b.label}</p>
                            <p className="text-white/40 text-[9px] font-bold">{b.sub}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Govt subsidy highlight */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                    <div className="text-2xl">🏛️</div>
                    <div className="flex-1">
                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Govt Subsidy Available</p>
                        <p className="text-white font-black text-base leading-tight">Up to <span className="text-emerald-400">₹78,000</span> subsidy on new installations</p>
                    </div>
                </div>

                {/* CTA Buttons */}
                <Link href="/solar">
                    <motion.div
                        whileTap={{ scale: 0.97 }}
                        className="group flex items-center justify-between w-full px-5 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 shadow-2xl shadow-sky-500/25 cursor-pointer mb-2"
                    >
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-sky-200/70 leading-none mb-0.5">SolarSquare Partner</p>
                            <p className="text-base font-black text-white leading-none">Get Free Solar Quote</p>
                        </div>
                        <motion.div
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"
                        >
                            <ArrowRight size={20} className="text-white" />
                        </motion.div>
                    </motion.div>
                </Link>

                {/* Toll free */}
                <a href="tel:18002030052" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Phone size={14} className="text-sky-400" />
                    <span className="text-white/70 text-xs font-bold">TOLLFREE</span>
                    <span className="text-white font-black text-sm tracking-wider">1800-203-0052</span>
                </a>

                {/* Trust line */}
                <div className="flex items-center justify-center gap-3 mt-3">
                    {['No spam calls', '24h callback', '100% free survey'].map((t, i) => (
                        <div key={i} className="flex items-center gap-1 text-white/25 text-[9px] font-bold">
                            <CheckCircle2 size={8} className="text-emerald-500/50" />
                            {t}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
