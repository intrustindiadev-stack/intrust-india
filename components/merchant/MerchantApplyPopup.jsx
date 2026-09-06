'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Store, TrendingUp, ShieldCheck, Banknote, ChevronRight, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import BottomSheet from '@/components/ui/BottomSheet';

const SESSION_KEY = 'merchant_apply_popup_dismissed';

export default function MerchantApplyPopup({ isOpen, onClose }) {
    const router = useRouter();

    const handleDismiss = () => {
        try {
            sessionStorage.setItem(SESSION_KEY, '1');
            localStorage.setItem('intrust_merchant_popup_dismissed', '1');
        } catch (_) {}
        if (typeof onClose === 'function') onClose();
    };

    const handleApply = () => {
        handleDismiss();
        router.push('/merchant-apply');
    };

    const features = [
        { 
            icon: TrendingUp, 
            title: "Zero Gateway Fees & High Margins", 
            desc: "Keep 100% of your earnings with low onboarding charges." 
        },
        { 
            icon: ShieldCheck, 
            title: "Zero Fraud Liability", 
            desc: "100% covered chargeback and scam risk protection by InTrust." 
        },
        { 
            icon: Banknote, 
            title: "Instant UPI & Bank Settlements", 
            desc: "Daily automated payouts directly into your registered bank account." 
        }
    ];

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={handleDismiss}
            noPadding
            className="md:max-w-[480px] md:w-full bg-white dark:bg-[#0c101c] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-2xl"
        >
            <div className="flex flex-col">
                {/* 3D Hero Illustration Banner */}
                <div className="relative w-full h-52 bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                    <Image
                        src="/images/merchant_partner_hero.jpg"
                        alt="Become an InTrust Merchant Partner"
                        fill
                        priority
                        className="object-cover object-center"
                        sizes="(max-width: 640px) 100vw, 480px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Branded pill badge */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md text-blue-600 dark:text-sky-400 border border-white/20 shadow-sm text-[11px] font-black uppercase tracking-wider">
                        <Sparkles size={13} className="text-amber-500" />
                        <span>Merchant Partner</span>
                    </div>

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-90"
                        aria-label="Close modal"
                    >
                        <X size={17} strokeWidth={2.5} />
                    </button>

                    {/* Banner Headline overlay */}
                    <div className="absolute bottom-3.5 left-5 right-5 z-10 text-white">
                        <p className="text-[10px] font-bold text-sky-300 uppercase tracking-widest">InTrust Unified Commerce</p>
                        <h2 className="text-xl font-black tracking-tight leading-snug">
                            Grow Your Business Locally
                        </h2>
                    </div>
                </div>

                {/* Subtitle & Value Proposition */}
                <div className="px-6 pt-5 pb-2">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                        Join 500+ verified merchants in Bhopal & across India selling products and gift cards with zero payment gateway fees.
                    </p>
                </div>

                {/* Features List with Royal Blue Accents */}
                <div className="px-6 py-3 space-y-3.5">
                    {features.map((feat, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + (idx * 0.08) }}
                            className="flex items-start gap-3.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5"
                        >
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                                <feat.icon size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{feat.title}</h3>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{feat.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="px-6 pt-3 pb-6 space-y-2.5">
                    <button
                        type="button"
                        onClick={handleApply}
                        className="w-full relative group overflow-hidden bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        <span>Apply as Merchant Partner</span>
                        <ChevronRight size={18} className="translate-y-[0.5px] group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-center"
                    >
                        Maybe Later
                    </button>

                    <p className="text-center text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span>Instant Approval with Verified KYC • 100% Paperless</span>
                    </p>
                </div>
            </div>
        </BottomSheet>
    );
}
