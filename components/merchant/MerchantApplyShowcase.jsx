'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Sparkles, Zap, TrendingUp, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

const FEATURES = [
    { icon: Zap, label: 'Auto Mode', color: '#f59e0b', delay: 0 },
    { icon: TrendingUp, label: 'AI Grow', color: '#6366f1', delay: 0.3 },
    { icon: ShieldCheck, label: 'Instant Payouts', color: '#10b981', delay: 0.6 },
    { icon: Sparkles, label: 'Smart Inventory', color: '#f43f5e', delay: 0.9 },
];

// Floating orb component
function Orb({ x, y, size, color, duration }) {
    return (
        <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                filter: 'blur(1px)',
            }}
            animate={{
                x: [0, 30, -20, 15, 0],
                y: [0, -25, 15, -10, 0],
                scale: [1, 1.15, 0.9, 1.05, 1],
                opacity: [0.6, 1, 0.7, 0.9, 0.6],
            }}
            transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
        />
    );
}

// Floating feature pill
function FeaturePill({ icon: Icon, label, color, delay, index }) {
    const positions = [
        { top: '18%', left: '8%' },
        { top: '15%', right: '6%' },
        { bottom: '28%', left: '5%' },
        { bottom: '22%', right: '8%' },
    ];
    const pos = positions[index] || positions[0];

    return (
        <motion.div
            className="absolute flex items-center gap-2 px-3 py-2 rounded-2xl border backdrop-blur-xl shadow-xl"
            style={{
                ...pos,
                borderColor: `${color}30`,
                background: `linear-gradient(135deg, ${color}15, ${color}05)`,
            }}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{
                opacity: 1, scale: 1, y: 0,
            }}
            transition={{ delay: delay + 0.8, duration: 0.6, type: 'spring', stiffness: 200 }}
        >
            <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.5 + index * 0.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
                className="flex items-center gap-2"
            >
                <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}25` }}
                >
                    <Icon size={14} style={{ color }} />
                </div>
                <span className="text-[11px] font-black text-white/80 uppercase tracking-wider whitespace-nowrap">
                    {label}
                </span>
            </motion.div>
        </motion.div>
    );
}

// Animated grid lines
function GridLines() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
            {[...Array(12)].map((_, i) => (
                <div
                    key={`v-${i}`}
                    className="absolute top-0 bottom-0 w-px bg-white"
                    style={{ left: `${(i + 1) * (100 / 13)}%` }}
                />
            ))}
            {[...Array(8)].map((_, i) => (
                <div
                    key={`h-${i}`}
                    className="absolute left-0 right-0 h-px bg-white"
                    style={{ top: `${(i + 1) * (100 / 9)}%` }}
                />
            ))}
        </div>
    );
}

export default function MerchantApplyShowcase({ onStart }) {
    const [isLaunching, setIsLaunching] = useState(false);
    const [particles, setParticles] = useState([]);

    const handleLetsGo = () => {
        // Generate particles for burst
        const newParticles = [...Array(12)].map((_, i) => {
            const angle = (i * 30) * (Math.PI / 180);
            return { id: i, angle };
        });
        setParticles(newParticles);
        setIsLaunching(true);
        setTimeout(() => {
            onStart?.();
        }, 900);
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
            style={{ background: '#050508' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Deep background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)' }} />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
                <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
            </div>

            {/* Animated orbs */}
            <Orb x={15} y={20} size={180} color="#D4AF37" duration={7} />
            <Orb x={75} y={65} size={220} color="#6366f1" duration={9} />
            <Orb x={60} y={15} size={140} color="#10b981" duration={6} />
            <Orb x={10} y={70} size={160} color="#f43f5e" duration={8} />

            {/* Grid */}
            <GridLines />

            {/* Feature pills */}
            {FEATURES.map((f, i) => (
                <FeaturePill key={f.label} {...f} index={i} />
            ))}

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-lg w-full">

                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="mb-6"
                >
                    <div className="relative w-20 h-20 mx-auto">
                        <img
                            src="/logo.png"
                            alt="InTrust"
                            className="w-full h-full object-contain"
                            style={{ filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.6))' }}
                        />
                    </div>
                </motion.div>

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 mb-6"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">
                        Merchant Partner Program
                    </span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.7 }}
                    className="text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight mb-4"
                >
                    Grow Your Business{' '}
                    <span
                        className="block"
                        style={{
                            background: 'linear-gradient(90deg, #D4AF37, #f59e0b, #fcd34d)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        With InTrust
                    </span>
                </motion.h1>

                {/* Sub-headline */}
                <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.72 }}
                    className="text-sm sm:text-base text-white/50 font-medium leading-relaxed max-w-sm mb-10"
                >
                    AI-powered auto mode, instant payouts, smart inventory — everything you need to scale.
                </motion.p>

                {/* CTA Button */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9, type: 'spring', stiffness: 220 }}
                    className="relative"
                >
                    <motion.button
                        onClick={handleLetsGo}
                        disabled={isLaunching}
                        whileHover={!isLaunching ? { scale: 1.06, boxShadow: '0 0 40px rgba(212,175,55,0.5)' } : {}}
                        whileTap={!isLaunching ? { scale: 0.95 } : {}}
                        className="relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-slate-900 text-base overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #D4AF37, #f59e0b, #D4AF37)' }}
                    >
                        {/* Shimmer */}
                        <motion.div
                            className="absolute inset-0"
                            style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)' }}
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                        />
                        <span className="relative z-10">Let's Go</span>
                        <motion.div
                            className="relative z-10"
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                        >
                            <ArrowRight size={20} />
                        </motion.div>
                    </motion.button>

                    {/* Burst particles on click */}
                    <AnimatePresence>
                        {isLaunching && (
                            <>
                                {/* Center flash */}
                                <motion.div
                                    initial={{ scale: 0, opacity: 1 }}
                                    animate={{ scale: 8, opacity: 0 }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="absolute inset-0 rounded-2xl bg-[#D4AF37] z-20"
                                />
                                {/* Energy beams */}
                                <motion.div
                                    initial={{ scaleX: 0, opacity: 1 }}
                                    animate={{ scaleX: 30, opacity: 0 }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent z-30"
                                />
                                <motion.div
                                    initial={{ scaleY: 0, opacity: 1 }}
                                    animate={{ scaleY: 30, opacity: 0 }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-full bg-gradient-to-b from-transparent via-[#D4AF37] to-transparent z-30"
                                />
                                {/* Diagonal particles */}
                                {particles.map((p) => (
                                    <motion.div
                                        key={p.id}
                                        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                        animate={{
                                            x: Math.cos(p.angle) * 200,
                                            y: Math.sin(p.angle) * 200,
                                            scale: [0, 1.5, 0],
                                            opacity: 0,
                                        }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="absolute top-1/2 left-1/2 w-2 h-2 z-40"
                                        style={{
                                            background: '#D4AF37',
                                            borderRadius: p.id % 2 === 0 ? '50%' : '2px',
                                            boxShadow: '0 0 8px #D4AF37',
                                            transform: 'translate(-50%, -50%)',
                                        }}
                                    />
                                ))}
                                {/* Full-screen expand */}
                                <motion.div
                                    initial={{ scale: 1, opacity: 1 }}
                                    animate={{ scale: 60, opacity: 1 }}
                                    transition={{ duration: 0.85, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
                                    className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full z-50"
                                    style={{
                                        background: 'linear-gradient(135deg, #D4AF37, #f59e0b)',
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                />
                            </>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Loading overlay */}
                <AnimatePresence>
                    {isLaunching && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
                        >
                            <Loader2 className="w-8 h-8 text-slate-900 animate-spin mb-3" />
                            <span className="text-slate-900 text-xs font-black uppercase tracking-widest">
                                Setting up your portal…
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom hint */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                transition={{ delay: 1.4 }}
                className="absolute bottom-8 text-white text-[10px] font-bold uppercase tracking-[0.3em]"
            >
                InTrust India · Merchant Portal
            </motion.p>
        </motion.div>
    );
}
