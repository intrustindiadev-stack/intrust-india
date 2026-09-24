'use client';

import React from 'react';
import Image from 'next/image';
import { 
    Sparkles, 
    Gift, 
    Truck, 
    ShieldCheck 
} from 'lucide-react';
import { motion } from 'framer-motion';

import TreasureChestVector from '@/components/marketing/graphics/TreasureChestVector';

export default function ExclusivePrizesShowcase({ isMerchant = false, targets = [], className = '' }) {
    const verifiedDefaultPrizes = [
        { id: 'prize-1', gift_name: 'Wireless ANC Earbuds', gift_image_url: '/marketing/prizes/anc_earbuds.jpg', reward_type: 'physical_gift' },
        { id: 'prize-2', gift_name: 'Smart Fitness Watch', gift_image_url: '/marketing/prizes/smartwatch.jpg', reward_type: 'physical_gift' },
        { id: 'prize-3', gift_name: '24K Gold Coin (1g)', gift_image_url: '/marketing/prizes/gold_coin.jpg', reward_type: 'physical_gift' }
    ];

    const prizes = (Array.isArray(targets) && targets.length > 0 ? targets : verifiedDefaultPrizes)
        .filter(t => t.is_active !== false)
        .slice(0, 3);
    const fmtCash = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    return (
        <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white border border-blue-100/90 p-5 sm:p-7 lg:p-8 shadow-xs ${className}`}>
            {/* Subtle light ambient glow */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -mb-16" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                {/* Left: Text & Features */}
                <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-wider mb-3 shadow-2xs">
                        <Sparkles size={13} className="text-emerald-600" />
                        <span>Milestone Target Rewards</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950 leading-tight">
                        Achieve Targets & Win Exclusive Gifts
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed font-medium">
                        Promote verified products, drive customer visits, and achieve milestone targets to unlock premium electronics, luxury accessories, and wallet cashbacks with 100% free doorstep delivery.
                    </p>

                    {/* Value Proposition Pills */}
                    <div className="flex items-center gap-2.5 sm:gap-3 mt-4 flex-wrap text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                            <Truck size={13} className="text-emerald-600 shrink-0" />
                            <span>100% Free Doorstep Courier</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                            <ShieldCheck size={13} className="text-blue-600 shrink-0" />
                            <span>Sealed & Verified Genuine</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                            <Gift size={13} className="text-amber-600 shrink-0" />
                            <span>Zero Claim Fees</span>
                        </span>
                    </div>
                </div>

                {/* Right: real prizes or mystery box illustration */}
                <div className="relative shrink-0 flex items-center justify-center">
                    {prizes.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-64 sm:w-80">
                            {prizes.map((p) => (
                                <div key={p.id} className="rounded-2xl bg-white/95 border border-slate-200/90 p-2.5 flex flex-col items-center text-center shadow-sm">
                                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                        {p.gift_image_url ? (
                                            <Image src={p.gift_image_url} alt={p.gift_name || p.title} fill sizes="64px" loading="lazy" className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <TreasureChestVector animated={false} className="w-10 h-10" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-900 mt-1.5 leading-tight line-clamp-2">{p.gift_name || p.title}</p>
                                    <span className="text-[10px] font-extrabold text-emerald-600 mt-0.5">
                                        {p.reward_type === 'cashback' ? fmtCash(p.reward_value_paise) : 'Mystery gift'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                    <motion.div 
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-52 sm:w-60 rounded-2xl sm:rounded-3xl bg-white/95 border border-slate-200/90 p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-md shadow-blue-900/5 group"
                    >
                        {/* 3D Isometric Chest Illustration */}
                        <div className="relative flex items-center justify-center -my-2">
                            <TreasureChestVector animated={true} className="w-36 h-36 sm:w-44 sm:h-44" />
                        </div>

                        <h4 className="font-black text-xs sm:text-sm text-slate-950 mt-1 tracking-tight">
                            Milestone Surprise Box
                        </h4>
                        <span className="text-[10px] font-extrabold text-emerald-600 mt-0.5">
                            Revealed Directly to Winners
                        </span>
                        <span className="mt-2 text-[9px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                            Dynamic Certified Gifts
                        </span>
                    </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
