'use client';

import { motion } from 'framer-motion';
import { Sun, ArrowRight, Zap } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { SOLAR_CONFIG } from '@/lib/solar/config';

export default function SolarHero() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <section className="relative overflow-hidden px-4 pt-6 pb-10">
            {/* Gradient BG */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-[#08090b]" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-400/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Left: text */}
                    <div>
                        {/* Badge */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest mb-5">
                            <Sun size={12} className="animate-spin" style={{ animationDuration: '8s' }} />
                            InTrust × {SOLAR_CONFIG.COMPANY_NAME} Partner
                        </motion.div>

                        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight mb-4">
                            <span className="text-slate-900 dark:text-white">Go Solar.</span>
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                                Save Every Month.
                            </span>
                        </motion.h1>

                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="text-slate-500 dark:text-slate-400 text-base font-medium mb-6 leading-relaxed max-w-md">
                            Install solar at <span className="font-black text-amber-500">₹0 upfront cost</span>. Government subsidy covers your down payment. Your electricity savings cover your EMI.
                        </motion.p>

                        {/* Stat pills */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="flex flex-wrap gap-2 mb-6">
                            {[
                                { icon: '🏛️', label: `₹${SOLAR_CONFIG.MAX_GOVT_SUBSIDY.toLocaleString()} Govt Subsidy` },
                                { icon: '⚡', label: '₹0 Down Payment' },
                                { icon: '🌟', label: '25-Year Warranty' },
                            ].map((b, i) => (
                                <div key={i} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold ${isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-white border-slate-200 text-slate-700'
                                    } shadow-sm`}>
                                    <span>{b.icon}</span> {b.label}
                                </div>
                            ))}
                        </motion.div>

                        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            onClick={() => document.getElementById('solar-form')?.scrollIntoView({ behavior: 'smooth' })}
                            className="inline-flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all active:scale-95">
                            Get Free Consultation <ArrowRight size={16} />
                        </motion.button>
                    </div>

                    {/* Right: house image */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.6 }}
                        className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-amber-900/20"
                    >
                        <Image
                            src="/solar-home.png"
                            alt="Solar powered Indian home"
                            fill
                            className="object-cover object-center"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        {/* Overlay badge */}
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-sky-600/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-sky-400/30">
                            <Zap size={13} className="text-white" />
                            <span className="text-white text-[10px] font-black">On our way to power your home</span>
                        </div>
                        <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-center border border-emerald-400/30">
                            <p className="text-emerald-100 text-[8px] font-black uppercase tracking-widest">Avg Monthly Saving</p>
                            <p className="text-white font-black text-base leading-none">₹7,500+</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
