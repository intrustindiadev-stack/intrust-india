'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Share2, Copy, CheckCircle, Sparkles, Zap, Coins } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ReferralGenzSection({ referralCode }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (referralCode) {
            navigator.clipboard.writeText(referralCode);
            setCopied(true);
            toast.success('Code copied! Go secure that bag! 🚀');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!referralCode) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            className="relative overflow-hidden group rounded-[2.5rem] p-1 bg-gradient-to-br from-[#FF3D77] via-[#A016FC] to-[#3D5CFF] shadow-2xl shadow-purple-500/20"
        >
            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/20 blur-[80px] rounded-full animate-pulse" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-cyan-400/20 blur-[60px] rounded-full animate-bounce duration-[5000ms]" />

            <div className="relative bg-[#0F172A] dark:bg-gray-900/90 backdrop-blur-3xl rounded-[2.4rem] p-6 sm:p-8 h-full">
                {/* Floating "Badge" */}
                <div className="absolute top-4 right-6 flex gap-2">
                    <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                        <Zap size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">Instant Credit</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center">
                    {/* Visual Side */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl rotate-12 flex items-center justify-center shadow-xl shadow-indigo-500/40 relative z-10">
                            <Gift size={40} className="text-white -rotate-12" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce z-20">
                            <Sparkles size={16} className="text-white" />
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
                            Manifest <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 underline decoration-cyan-400/30">₹100 Cash</span> 💸
                        </h3>
                        <p className="text-slate-400 font-medium text-sm sm:text-base mb-6 leading-tight">
                            Share your code. When a friend joins, you <span className="text-white font-bold">BOTH</span> get paid. No cap. 🧢
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 group/code transition-all hover:bg-white/10">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">CODE:</span>
                                <code className="text-lg font-mono font-black text-white tracking-[0.2em] flex-1">
                                    {referralCode}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all active:scale-90 shadow-lg shadow-indigo-500/30"
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => window.location.href = '/refer'}
                                className="px-6 py-4 bg-white text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:shadow-white/10 transition-all border-b-4 border-slate-200 active:border-b-0 active:translate-y-1"
                            >
                                <Share2 size={18} />
                                View Stats
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Bottom Decor */}
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex -space-x-3 overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-[#0F172A] bg-gray-700 overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?u=${i + referralCode}`} alt="" className="w-full h-full object-cover grayscale opacity-60" />
                            </div>
                        ))}
                        <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-[#0F172A] bg-indigo-500/20 text-indigo-400 text-[10px] font-black">
                            +10k
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Join 2,400+ Referrers 🚀
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
