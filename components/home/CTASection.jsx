'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap, Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function CTASection() {
    return (
        <section className="relative py-28 md:py-36 overflow-hidden bg-[#0F1115]">
            {/* Ambient Lighting / Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] bg-gradient-to-tr from-[#92BCEA]/20 via-[#5E7CE2]/10 to-[#AFB3F7]/20 blur-[100px] rounded-full pointer-events-none" />

            {/* Grid Texture */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />

            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center">

                {/* Floating Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
                >
                    <Sparkles size={14} className="text-[#92BCEA]" />
                    <span className="text-xs md:text-sm font-bold text-slate-300 tracking-wider uppercase">
                        The Future of Payments
                    </span>
                </motion.div>

                {/* Main Heading */}
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight leading-[1.1] font-[family-name:var(--font-outfit)]"
                >
                    One Platform. <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#92BCEA] via-[#AFB3F7] to-[#5E7CE2]">
                        Infinite Possibilities.
                    </span>
                </motion.h2>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
                >
                    Join over 50,000+ users who have switched to InTrust for secure, instant, and rewarding financial transactions.
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                >
                    <Link href="/signup" className="w-full sm:w-auto">
                        <button className="group w-full sm:w-auto px-10 py-4 bg-white text-[#0F1115] rounded-2xl font-bold text-lg hover:bg-blue-50 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                            Get Started Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform text-blue-600" />
                        </button>
                    </Link>
                    <Link href="/services" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto px-10 py-4 bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-lg transition-all backdrop-blur-sm">
                            Explore Services
                        </button>
                    </Link>
                </motion.div>

                {/* Trust Indicators - Glassmorphic Row */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-4 px-8 py-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-3 text-slate-400 font-medium">
                        <ShieldCheck size={20} className="text-[#92BCEA]" />
                        <span>Bank-Grade Security</span>
                    </div>
                    <div className="w-px h-6 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-3 text-slate-400 font-medium">
                        <Zap size={20} className="text-[#AFB3F7]" />
                        <span>Instant Processing</span>
                    </div>
                    <div className="w-px h-6 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-3 text-slate-400 font-medium">
                        <Globe size={20} className="text-emerald-400" />
                        <span>Global Acceptance</span>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
