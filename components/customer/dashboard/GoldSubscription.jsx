import React from 'react';
import { motion } from 'framer-motion';
import { Star, Check, Shield, Sparkles, Lock } from 'lucide-react';

export default function GoldSubscription({ userData, timeLeft, setShowPackages, paymentLoading }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative overflow-hidden bg-gradient-to-br from-[#1a1600] via-[#2a2200] to-[#000000] rounded-[2.5rem] p-8 text-white shadow-2xl border border-amber-500/30"
        >
            {/* Premium Texture Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

            {/* Holographic Glowing Orbs */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full group-hover:bg-amber-500/20 transition-all duration-700" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-500/5 blur-[80px] rounded-full" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-lg shadow-amber-900/40">
                            <Star className="text-white fill-white" size={28} />
                        </div>
                        <div>
                            <span className="block font-black text-2xl tracking-tight text-amber-100 italic">InTrust GOLD</span>
                            <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-[0.2em]">Elite Membership</span>
                        </div>
                    </div>
                    <div className="w-12 h-8 bg-gradient-to-br from-amber-200 to-amber-500 rounded-md opacity-40" /> {/* Chip sim */}
                </div>

                <h3 className="text-3xl font-black mb-3 leading-tight bg-gradient-to-r from-amber-100 via-white to-amber-200 bg-clip-text text-transparent">
                    Buy Gold Verified ✨
                </h3>
                <p className="text-amber-100/70 text-sm mb-6 font-medium max-w-[280px] leading-relaxed">
                    Get the <span className="text-amber-400 font-bold">Elite Shield</span> tick + ₹199 Instant Cashback &
                    <span className="text-white font-bold ml-1 text-base block mt-1">Unlock Many Premium Offers! 🎁</span>
                </p>

                <div className="flex flex-col gap-3 mb-8">
                    {[
                        'Elite Blue Tick Identity',
                        '₹199 Instant Wallet Cashback',
                        'Priority Support Access',
                        'Exclusive Merchant Offers'
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <Check size={12} className="text-amber-400" />
                            </div>
                            <span className="text-[13px] font-semibold text-amber-50/80">{feature}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    {userData.kycStatus === 'verified' ? (
                        <>
                            {userData.isGoldVerified ? (
                                <div className="space-y-3">
                                    <div className="w-full py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center gap-1">
                                        <div className="flex items-center gap-2 text-amber-500 font-bold">
                                            <Shield size={18} />
                                            <span>ELITE GOLD ACTIVE</span>
                                        </div>
                                        <p className="text-[10px] text-amber-500/60 font-black tracking-widest uppercase">
                                            {timeLeft ? timeLeft : 'UPDATING...'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowPackages(true)}
                                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        Extend Subscription
                                    </button>
                                </div>
                            ) : (
                                <button
                                    disabled={paymentLoading}
                                    onClick={() => setShowPackages(true)}
                                    className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-900/40 flex items-center justify-center gap-2 group/btn"
                                >
                                    {paymentLoading ? 'PROCCESSING...' : (
                                        <>
                                            UNLEASH ELITE GOLD
                                            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                                        </>
                                    )}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="space-y-3">
                            <button
                                disabled
                                className="w-full py-4 bg-white/10 text-white/40 font-bold text-lg rounded-2xl border border-white/10 cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Lock size={18} />
                                Complete KYC to Unlock
                            </button>
                            <p className="text-[11px] text-center text-amber-500/60 font-medium">
                                Elite Gold features require a verified identity.
                            </p>
                        </div>
                    )}
                    <p className="text-[10px] text-center font-bold text-amber-500/40 tracking-widest uppercase italic">✨ Premium Membership ✨</p>
                </div>
            </div>

            {/* High-End Shine effect */}
            <motion.div
                animate={{
                    left: ['-100%', '200%'],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 5,
                    ease: "easeInOut"
                }}
                className="absolute inset-0 w-3/4 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none"
            />
        </motion.div>
    );
}
