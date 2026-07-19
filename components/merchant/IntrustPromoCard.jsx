'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, CheckCircle2, Power, Loader2, Sparkles,
    TrendingUp, ShieldCheck, BarChart2, ArrowRight,
} from 'lucide-react';

// Pulsing aurora background orb
function AuroraOrb({ color, x, y, size, duration }) {
    return (
        <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
                left: x, top: y, width: size, height: size,
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                filter: 'blur(2px)',
            }}
            animate={{ scale: [1, 1.2, 0.9, 1.1, 1], opacity: [0.5, 0.8, 0.5, 0.7, 0.5] }}
            transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
        />
    );
}

// Mini animated stat chip
function StatChip({ value, label, color, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, type: 'spring', stiffness: 200 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border backdrop-blur-xl"
            style={{ borderColor: `${color}30`, background: `${color}15` }}
        >
            <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay }}
            >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            </motion.div>
            <span className="text-[10px] font-black text-white/70 uppercase tracking-wider whitespace-nowrap">
                {value} <span className="opacity-60">{label}</span>
            </span>
        </motion.div>
    );
}

export default function IntrustPromoCard({ autoMode, merchant }) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [particles, setParticles] = useState([]);
    const router = require('next/navigation').useRouter();

    const handleActivate = () => {
        const newParticles = [...Array(8)].map((_, i) => ({
            id: i,
            angle: (i * 45) * (Math.PI / 180),
        }));
        setParticles(newParticles);
        setIsAnimating(true);
        setTimeout(() => router.push('/merchant/shopping/auto-mode'), 800);
    };

    // ── ACTIVE STATE — Intelligence Hub ─────────────────────────────────────
    if (autoMode) {
        return (
            <div className="w-full h-full min-h-[320px] bg-[#020617] rounded-[2rem] border border-emerald-500/15 relative overflow-hidden flex flex-col justify-between p-6 shadow-2xl">
                {/* Aurora background */}
                <AuroraOrb color="rgba(16,185,129,0.2)" x="-10%" y="-10%" size="60%" duration={7} />
                <AuroraOrb color="rgba(99,102,241,0.12)" x="60%" y="50%" size="50%" duration={9} />

                {/* Animated grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${(i + 1) * 12.5}%` }} />
                    ))}
                </div>

                {/* Top badge */}
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <motion.div
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                        />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                            InTrust Intelligence — Online
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-white leading-tight mb-3">
                        Auto Mode <span className="text-emerald-400">Active</span>
                    </h2>

                    {/* Live stat chips */}
                    <div className="flex flex-wrap gap-2">
                        <StatChip value="AI" label="Powered" color="#10b981" delay={0.1} />
                        <StatChip value="24/7" label="Running" color="#6366f1" delay={0.2} />
                        <StatChip value="Auto" label="Orders" color="#f59e0b" delay={0.3} />
                    </div>
                </div>

                {/* Bottom — manage link */}
                <div className="relative z-10">
                    <Link
                        href="/merchant/shopping/auto-mode"
                        className="group flex items-center justify-between w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl px-4 py-3 transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-emerald-400" />
                            <span className="text-sm font-black text-emerald-400">Manage Settings</span>
                        </div>
                        <motion.div
                            animate={{ x: [0, 3, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <ArrowRight size={16} className="text-emerald-400" />
                        </motion.div>
                    </Link>
                </div>
            </div>
        );
    }

    // ── INACTIVE STATE — AutoMode Upsell ──────────────────────────────────────
    return (
        <div className="w-full h-full min-h-[380px] bg-[#050505] p-2 relative overflow-hidden flex flex-col group rounded-[2.5rem]">

            {/* Main golden area */}
            <motion.div
                className="flex-1 bg-gradient-to-br from-[#1a1208] via-[#120f09] to-[#0a0906] rounded-[2rem] p-6 sm:p-7 flex flex-col relative overflow-hidden z-10 border border-amber-900/30"
                animate={isAnimating ? { opacity: 0, scale: 0.92 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                {/* Aurora glows */}
                <AuroraOrb color="rgba(217,160,91,0.18)" x="60%" y="-20%" size="200px" duration={7} />
                <AuroraOrb color="rgba(251,146,60,0.1)" x="-20%" y="60%" size="160px" duration={9} />

                {/* Animated grid */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-400" style={{ left: `${(i + 1) * 12.5}%` }} />
                    ))}
                </div>

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-5 w-fit"
                >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">AI Powered</span>
                </motion.div>

                {/* Floating stat chips */}
                <div className="flex gap-2 flex-wrap mb-4">
                    <StatChip value="₹4.2L" label="avg earned" color="#f59e0b" delay={0.4} />
                    <StatChip value="147" label="orders/mo" color="#f97316" delay={0.55} />
                </div>

                {/* Headline */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative z-10 mt-auto mb-2"
                >
                    <h2 className="text-3xl sm:text-4xl font-black text-white/90 leading-[1.1] tracking-tight">
                        Activate{' '}
                        <span
                            style={{
                                background: 'linear-gradient(90deg, #fde68a, #f59e0b, #d97706)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Auto
                        </span>{' '}
                        Intelligence
                    </h2>
                    <p className="text-[11px] text-white/30 mt-1 font-medium">
                        Let AI handle orders while you earn
                    </p>
                </motion.div>

                {/* Decorative lines */}
                <div className="absolute right-8 bottom-8 w-20 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                <div className="absolute right-16 bottom-4 w-[1px] h-20 bg-gradient-to-b from-transparent via-amber-500/25 to-transparent" />
            </motion.div>

            {/* Bottom — Power button */}
            <div className="h-[100px] shrink-0 w-full flex items-center justify-center relative z-20">
                <motion.button
                    onClick={handleActivate}
                    whileHover={!isAnimating ? { scale: 1.08, boxShadow: '0 0 35px rgba(217,160,91,0.45)' } : {}}
                    whileTap={!isAnimating ? { scale: 0.92 } : {}}
                    className="w-16 h-16 rounded-full flex items-center justify-center relative z-30 shadow-[0_0_20px_rgba(217,160,91,0.2)]"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #f59e0b, #fcd34d)' }}
                >
                    <Power size={26} strokeWidth={2.5} className="text-slate-900" />
                </motion.button>

                {/* Burst animation */}
                <AnimatePresence>
                    {isAnimating && (
                        <>
                            <motion.div
                                initial={{ scale: 0, opacity: 1 }}
                                animate={{ scale: 3, opacity: 0 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                className="absolute w-16 h-16 rounded-full bg-white z-50 mix-blend-overlay"
                            />
                            <motion.div
                                initial={{ height: 0, opacity: 1 }}
                                animate={{ height: 600, opacity: 0 }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="absolute w-[2px] bg-gradient-to-t from-amber-300 via-amber-100 to-transparent z-30 shadow-[0_0_15px_#fcd34d]"
                            />
                            <motion.div
                                initial={{ width: 0, opacity: 1, right: '50%' }}
                                animate={{ width: 400, opacity: 0, right: '50%' }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="absolute h-[2px] bg-gradient-to-l from-amber-300 via-amber-100 to-transparent z-30 shadow-[0_0_15px_#fcd34d]"
                            />
                            <motion.div
                                initial={{ width: 0, opacity: 1, left: '50%' }}
                                animate={{ width: 400, opacity: 0, left: '50%' }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="absolute h-[2px] bg-gradient-to-r from-amber-300 via-amber-100 to-transparent z-30 shadow-[0_0_15px_#fcd34d]"
                            />
                            {particles.map((p) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                    animate={{
                                        x: Math.cos(p.angle) * 150,
                                        y: Math.sin(p.angle) * 150,
                                        scale: [0, 1.5, 0],
                                        opacity: 0,
                                    }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                    className="absolute w-2 h-2 bg-amber-200 z-40 shadow-[0_0_10px_#fcd34d]"
                                    style={{ borderRadius: p.id % 2 === 0 ? '50%' : '2px' }}
                                />
                            ))}
                            <motion.div
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: 50, opacity: 1 }}
                                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
                                className="absolute w-16 h-16 rounded-full z-20"
                                style={{ background: 'linear-gradient(135deg, #D4AF37, #f59e0b, #fcd34d)' }}
                            />
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Loading overlay */}
            <AnimatePresence>
                {isAnimating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center"
                    >
                        <Loader2 className="w-9 h-9 text-slate-900 animate-spin mb-3" />
                        <span className="text-slate-900 font-black uppercase tracking-widest text-[11px]">
                            Initializing AI…
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
