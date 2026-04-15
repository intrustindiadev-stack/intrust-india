"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, ChevronRight, CheckCircle2 } from "lucide-react";
import { useMerchant } from "@/hooks/useMerchant";

export default function AutoModePromo() {
    const { merchant } = useMerchant();

    // Do not show promo heavily if they already have it
    if (merchant?.auto_mode) {
        return (
            <div className="mb-8 w-full rounded-3xl bg-gradient-to-r from-[#0a1f16] to-[#123126] border border-emerald-500/20 p-4 flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="text-emerald-400 w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-emerald-400 font-black text-sm uppercase tracking-widest">Auto Mode Active</h3>
                        <p className="text-emerald-200/50 text-xs font-semibold">Your store is running on autopilot.</p>
                    </div>
                </div>
                <Link href="/merchant/shopping/auto-mode" className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                    Manage
                </Link>
            </div>
        );
    }

    return (
        <div className="mb-10 w-full rounded-[2rem] bg-gradient-to-br from-[#1a1c23] to-[#0f111a] border border-emerald-500/20 p-6 sm:p-8 relative overflow-hidden shadow-2xl group">
            {/* Glowing Effects */}
            <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-1000" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[200px] h-[200px] bg-[#D4AF37]/5 blur-[60px] rounded-full pointer-events-none" />

            {/* Emerald Matrix Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-400">Intrust Auto Mart</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
                        Put Your Store on <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Autopilot</span>.
                    </h2>

                    <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed max-w-xl">
                        Say goodbye to order ping fatigue. Intrust Auto Mart uses smart algorithms to automatically manage your orders, handle delivery partners, and serve your customers.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-[#D4AF37]" />
                            </div>
                            <span className="text-xs font-bold text-slate-300">0 Manual Effort</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-[#D4AF37]" />
                            </div>
                            <span className="text-xs font-bold text-slate-300">Auto Pricing</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-[#D4AF37]" />
                            </div>
                            <span className="text-xs font-bold text-slate-300">Boosted Priority</span>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-auto shrink-0 flex flex-col items-center gap-3">
                    <Link href="/merchant/shopping/auto-mode" className="w-full sm:w-auto">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#0f111a] px-8 py-4 rounded-2xl font-black tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-300/50 flex items-center justify-center gap-2 uppercase text-sm"
                        >
                            <Zap className="w-4 h-4 fill-current" />
                            Ignite Auto Mode
                            <ChevronRight className="w-4 h-4" />
                        </motion.button>
                    </Link>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Starts at ₹999/mo</span>
                </div>
            </div>
        </div>
    );
}
