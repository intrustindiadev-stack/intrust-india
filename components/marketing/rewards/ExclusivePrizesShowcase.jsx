'use client';

import React from 'react';
import Image from 'next/image';
import { 
    Sparkles, 
    Gift, 
    Truck, 
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

import TreasureChestVector from '@/components/marketing/graphics/TreasureChestVector';

export default function ExclusivePrizesShowcase({ isMerchant = false, targets = [], className = '' }) {
    const verifiedDefaultPrizes = [
        { id: 'prize-1', gift_name: 'Wireless ANC Earbuds', gift_image_url: '/marketing/prizes/anc_earbuds.jpg', reward_type: 'physical_gift', reward_value_paise: 299900 },
        { id: 'prize-2', gift_name: 'Smart Fitness Watch', gift_image_url: '/marketing/prizes/smartwatch.jpg', reward_type: 'physical_gift', reward_value_paise: 349900 },
        { id: 'prize-3', gift_name: '24K Gold Coin (1g)', gift_image_url: '/marketing/prizes/gold_coin.jpg', reward_type: 'physical_gift', reward_value_paise: 899900 }
    ];

    const prizes = (Array.isArray(targets) && targets.length > 0 ? targets : verifiedDefaultPrizes)
        .filter(t => t.is_active !== false)
        .slice(0, 3);
    const fmtCash = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return (
        <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border border-blue-100/90 dark:border-slate-800 p-5 sm:p-7 lg:p-8 shadow-xs ${className}`}>
            {/* Subtle light ambient glow */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-100/40 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -mb-16" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
                {/* Left: Text & Features */}
                <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
                        <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Milestone Physical Gifts</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950 dark:text-white leading-tight">
                        Reach Targets &amp; Win Doorstep Gifts
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-semibold">
                        Promote verified deals, drive real customer orders, and unlock luxury electronics, accessories, and gold coins with 100% free doorstep courier.
                    </p>

                    {/* Value Proposition Pills */}
                    <div className="flex items-center gap-2.5 sm:gap-3 mt-4 flex-wrap text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                            <Truck size={14} className="text-emerald-600 shrink-0" />
                            <span>100% Free Doorstep Delivery</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                            <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                            <span>Original Brand Warranty</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                            <Gift size={14} className="text-amber-600 shrink-0" />
                            <span>Zero Claim Fees</span>
                        </span>
                    </div>
                </div>

                {/* Right: real prizes or mystery box illustration */}
                <div className="relative shrink-0 flex items-center justify-center">
                    {prizes.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 w-full sm:w-auto max-w-sm">
                            {prizes.map((p) => (
                                <div key={p.id} className="rounded-2xl bg-white/95 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 p-3 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 border border-slate-200/60 dark:border-slate-600">
                                        {p.gift_image_url ? (
                                            <Image src={p.gift_image_url} alt={p.gift_name || p.title} fill sizes="80px" loading="lazy" className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <TreasureChestVector animated={false} className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs font-black text-slate-900 dark:text-white mt-2 leading-tight line-clamp-2">{p.gift_name || p.title}</p>
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                        {p.reward_type === 'cashback' ? fmtCash(p.reward_value_paise) : (p.reward_value_paise ? `${fmtCash(p.reward_value_paise)} Value` : 'Free Gift')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                    <motion.div 
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-56 sm:w-64 rounded-3xl bg-white/95 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 p-5 flex flex-col items-center justify-center text-center shadow-md group"
                    >
                        {/* 3D Isometric Chest Illustration */}
                        <div className="relative flex items-center justify-center -my-2">
                            <TreasureChestVector animated={true} className="w-36 h-36 sm:w-44 sm:h-44" />
                        </div>

                        <h4 className="font-black text-sm sm:text-base text-slate-950 dark:text-white mt-1 tracking-tight">
                            Milestone Surprise Box
                        </h4>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            Delivered Directly to Achievers
                        </span>
                        <span className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-600">
                            Certified Premium Gifts
                        </span>
                    </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

