'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Store, TrendingUp, ShieldCheck, Banknote, ChevronRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomSheet from '@/components/ui/BottomSheet';

export default function MerchantApplyPopup({ isOpen, onClose }) {
    const router = useRouter();
    const handleApply = () => {
        onClose();
        router.push('/merchant-apply');
    };

    const features = [
        { icon: TrendingUp, title: "High Earnings", desc: "Earn up to ₹50,000+ per month reselling cards." },
        { icon: ShieldCheck, title: "Zero Fraud Liability", desc: "We cover 100% of chargebacks and fraud risks." },
        { icon: Banknote, title: "Instant Settlements", desc: "Get your earnings directly in your bank account." }
    ];

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            noPadding
            className="md:max-w-[440px] md:w-full bg-white dark:bg-[#0f111a]"
        >
            <div className="flex flex-col">

                        {/* Banner Image / Graphic Area */}
                        <div className="relative w-full h-40 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
                            
                            {/* Decorative glowing circles */}
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-300 rounded-full mix-blend-screen filter blur-[40px] opacity-60"></div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-400 rounded-full mix-blend-screen filter blur-[40px] opacity-60"></div>

                            {/* Centered Graphic */}
                            <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, type: 'spring' }}
                                className="relative z-10 w-20 h-20 bg-white/10 backdrop-blur-md rounded-[1.5rem] p-0.5 border border-white/30 shadow-2xl"
                            >
                                <div className="w-full h-full bg-gradient-to-br from-white to-orange-50 rounded-[1.4rem] flex items-center justify-center text-orange-600 shadow-inner">
                                    <Store size={40} className="drop-shadow-sm" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full border-4 border-orange-500 flex items-center justify-center text-white shadow-lg">
                                    <Sparkles size={14} className="fill-white text-white" />
                                </div>
                            </motion.div>

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors z-20"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="px-6 pt-6 pb-2 text-center">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                Become a Merchant
                            </h2>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                                Join 500+ partners who are transforming their business by reselling gift cards with Intrust.
                            </p>
                        </div>

                        {/* Features List */}
                        <div className="px-6 py-4 space-y-4">
                            {features.map((feat, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (idx * 0.1) }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="shrink-0 w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm border border-orange-100 dark:border-orange-500/20">
                                        <feat.icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{feat.title}</h3>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{feat.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer Action */}
                        <div className="px-6 pt-4 pb-8 md:pb-6">
                            <button
                                onClick={handleApply}
                                className="w-full relative group overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2"
                            >
                                <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                <span>Apply Now</span>
                                <ChevronRight size={18} className="translate-y-[1px]" />
                            </button>
                            <p className="text-center text-[11px] font-bold text-gray-400 mt-4 uppercase tracking-wider">
                                Instant Approval with KYC 🚀
                            </p>
                        </div>
                    </div>
        </BottomSheet>
    );
}
