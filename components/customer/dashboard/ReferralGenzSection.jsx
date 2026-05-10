'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Share2, Copy, CheckCircle, Sparkles, Zap, Award, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ReferralGenzSection({ referralCode }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (referralCode) {
            navigator.clipboard.writeText(referralCode);
            setCopied(true);
            toast.success('Code copied');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!referralCode) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3 }}
            className="relative overflow-hidden group rounded-[2.5rem] p-[1px] bg-gradient-to-br from-gold/30 via-gold/5 to-transparent shadow-xl transition-all duration-500"
        >
            {/* Premium Background Elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gold/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative bg-[#0F172A] dark:bg-[#020617] backdrop-blur-3xl rounded-[2.4rem] p-5 sm:p-7 h-full border border-white/5 overflow-hidden">
                {/* Subtle Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gold/20 flex items-center justify-center shadow-lg relative shrink-0">
                            <Gift size={20} className="text-gold" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg sm:text-xl font-display font-medium text-white tracking-tight">
                                Elevate <span className="text-gold">Rewards</span>
                            </h2>
                            <div className="flex items-center gap-1.5 opacity-60">
                                <ShieldCheck size={10} className="text-gold" />
                                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">Premium Program</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                        <div className="bg-gold/5 backdrop-blur-md px-3 py-1 rounded-full border border-gold/10 flex items-center gap-1.5">
                            <Award size={10} className="text-gold" />
                            <span className="text-[9px] font-bold text-gold uppercase tracking-wider">Verified</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                    <div className="flex-1">
                        <p className="text-slate-400 font-normal text-sm sm:text-base leading-relaxed mb-5 max-w-lg">
                            Earn <span className="text-white font-semibold">1,000 Reward Points (₹10)</span> for every successful verified invitation to your network.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 flex items-center gap-3 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 group/code transition-all hover:border-gold/30">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Invitation Code</span>
                                    <code className="text-base font-mono font-bold text-white tracking-widest">
                                        {referralCode}
                                    </code>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="ml-auto p-2 bg-gold/10 hover:bg-gold/20 text-gold rounded-lg transition-all active:scale-90 border border-gold/10"
                                >
                                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                </button>
                            </div>

                            <button
                                onClick={() => window.location.href = '/refer'}
                                className="px-6 py-3 bg-gold text-[#020617] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-[#c5a028] shadow-md shadow-gold/5 shrink-0"
                            >
                                <Share2 size={16} />
                                <span>Network Portfolio</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Compact Footer */}
                <div className="mt-8 pt-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="inline-block h-7 w-7 rounded-full ring-2 ring-[#020617] bg-slate-800 overflow-hidden grayscale">
                                    <img src={`https://i.pravatar.cc/100?u=${i + referralCode}`} alt="" className="w-full h-full object-cover opacity-70" />
                                </div>
                            ))}
                            <div className="flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-[#020617] bg-gold/10 text-gold text-[8px] font-bold border border-gold/10">
                                +12k
                            </div>
                        </div>
                        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-tight">
                            <span className="text-slate-400">2.4k+ Ambassadors</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-gold/40">
                        <Zap size={12} className="shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Instant Settlement</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
