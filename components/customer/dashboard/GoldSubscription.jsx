import React from 'react';
import { motion } from 'framer-motion';
import { Star, Check, Shield, Sparkles, Lock, Zap } from 'lucide-react';

export default function GoldSubscription({ userData, timeLeft, setShowPackages, paymentLoading }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden bg-gradient-to-b from-[#111111] via-[#0a0a0a] to-black rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl border border-amber-500/20"
        >
            {/* Premium Texture & Grain Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

            {/* Glowing Orbs & Beams */}
            <div className="absolute -top-[30%] -right-[20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_50%)] pointer-events-none" />
            <div className="absolute -bottom-[20%] -left-[10%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_bottom_left,rgba(252,211,77,0.05),transparent_40%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
                {/* Header Icon */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
                    className="relative mb-6"
                >
                    <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-20 rounded-full animate-pulse" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-[#FFDF00] via-[#D4AF37] to-[#B8860B] rounded-[2rem] p-[2px] shadow-2xl shadow-amber-900/40 rotate-12 group-hover:rotate-6 transition-transform duration-500 ease-out">
                        <div className="w-full h-full bg-[#111] rounded-[1.85rem] flex items-center justify-center p-4">
                            <Star className="w-full h-full text-amber-400 fill-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                        </div>
                    </div>
                    {/* Floating Sparkles */}
                    <Sparkles className="absolute -top-4 -right-4 text-amber-200 w-6 h-6 animate-bounce" />
                    <Sparkles className="absolute -bottom-2 -left-6 text-yellow-500 w-4 h-4 animate-pulse delay-150" />
                </motion.div>

                {/* Title & Badge */}
                <div className="mb-2 flex items-center gap-3">
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-full text-[10px] font-black tracking-[0.2em] text-amber-500/80 uppercase">Elite Tier</span>
                </div>
                <h3 className="text-4xl sm:text-5xl font-black mb-4 tracking-[-0.02em] leading-tight">
                    <span className="bg-gradient-to-r from-[#FFF] via-[#FDE68A] to-[#D97706] bg-clip-text text-transparent">
                        InTrust GOLD
                    </span>
                    <span className="text-amber-500 ml-1">✧</span>
                </h3>

                <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-sm leading-relaxed font-medium">
                    Upgrade to get the <span className="text-amber-300 font-semibold">Elite Shield Verification</span>, instant ₹199 cashback, and VIP platform perks.
                </p>

                {/* Features List (Glassmorphic Cards) */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 text-left">
                    {[
                        { icon: Shield, text: 'Elite Verification Shield' },
                        { icon: Zap, text: '₹199 Instant Cashback' },
                        { icon: Star, text: 'Priority VIP Support' },
                        { icon: Sparkles, text: 'Exclusive Merchant Deals' }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + (i * 0.1) }}
                            className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-amber-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all duration-300"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-transparent flex items-center justify-center flex-shrink-0 shadow-inner">
                                <feature.icon size={18} className="text-amber-400" />
                            </div>
                            <span className="text-sm font-semibold text-gray-200 tracking-tight">{feature.text}</span>
                        </motion.div>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="w-full space-y-4">
                    {userData.kycStatus === 'verified' ? (
                        <>
                            {userData.isGoldVerified ? (
                                <div className="space-y-4 w-full">
                                    <div className="relative overflow-hidden w-full py-5 bg-gradient-to-r from-amber-900/40 via-amber-800/20 to-amber-900/40 border border-amber-500/30 rounded-[1.5rem] flex flex-col items-center justify-center gap-2">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                                        <div className="relative flex items-center gap-2 text-amber-400 font-black text-lg tracking-tight">
                                            <Shield size={20} className="fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse" />
                                            <span>ACTIVE MEMBERSHIP</span>
                                        </div>
                                        <p className="relative text-xs text-amber-200/60 font-black tracking-[0.2em] uppercase">
                                            {timeLeft ? `EXPIRES IN ${timeLeft}` : 'UPDATING...'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowPackages(true)}
                                        className="w-full py-4 bg-transparent hover:bg-amber-500/5 text-amber-500 text-sm font-bold rounded-[1.25rem] border-2 border-amber-500/20 transition-all uppercase tracking-widest"
                                    >
                                        Manage Subscription
                                    </button>
                                </div>
                            ) : (
                                <button
                                    disabled={paymentLoading}
                                    onClick={() => setShowPackages(true)}
                                    className="relative w-full group/btn overflow-hidden"
                                >
                                    {/* Animated Border Gradient */}
                                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-[#FFF] to-[#D97706] rounded-[2rem] blur opacity-30 group-hover/btn:opacity-60 transition duration-500"></div>

                                    <div className="relative w-full py-5 bg-gradient-to-br from-[#1A1100] to-[#0A0700] rounded-[1.75rem] border border-amber-500/50 flex items-center justify-center gap-3 transition-transform group-active/btn:scale-[0.98]">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-in-out" />

                                        {paymentLoading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                                                <span className="text-amber-500 font-black tracking-widest text-sm">PROCESSING...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-amber-400 font-black tracking-widest text-sm group-hover/btn:text-amber-300 transition-colors">UNLEASH GOLD NOW</span>
                                                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                    <Sparkles size={14} className="text-amber-400 group-hover/btn:rotate-12 transition-transform" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="w-full space-y-4">
                            <button
                                disabled
                                className="w-full py-5 bg-[#111] text-gray-500 font-bold text-sm tracking-widest uppercase rounded-[1.75rem] border-2 border-white/5 cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                <Lock size={18} />
                                Unlock via KYC
                            </button>
                            <p className="text-xs text-center text-gray-500 font-medium">
                                Elite Gold features require verified identity confirmation.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
