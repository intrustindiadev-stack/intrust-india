'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
    Target, 
    Gift, 
    CheckCircle2, 
    Lock, 
    Truck, 
    Package, 
    Sparkles, 
    TrendingUp, 
    ArrowRight, 
    Calendar,
    ExternalLink
} from 'lucide-react';
import GiftBoxAnimationModal from '@/components/marketing/animations/GiftBoxAnimationModal';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';

export default function TargetsClient({
    user,
    isMerchant,
    initialTargets,
    initialClaims
}) {
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [selectedGiftReward, setSelectedGiftReward] = useState({
        title: '₹500 Gift Card',
        desc: "Congrats! You've unlocked a special milestone mystery reward.",
        value: 500
    });

    const rewardJourneyLevels = [
        {
            level: 1,
            title: '₹100 Cashback',
            desc: 'Generate 10 product share link sales',
            unlocked: true,
            isMystery: false,
            rewardType: 'cashback'
        },
        {
            level: 2,
            title: '🎁 Mystery Reward',
            desc: 'Acquire 25 buyers via campaigns (13 more to unlock)',
            unlocked: false,
            canReveal: true, // For demo / test reveal
            isMystery: true,
            rewardType: 'gift',
            giftTitle: 'InTrust Smart Merchant Toolkit',
            giftDesc: 'Includes branded NFC business tags, QR standee, and ₹500 store credits.',
            giftValue: 500
        },
        {
            level: 3,
            title: '₹500 Cashback',
            desc: 'Achieve 50 total campaign order conversions',
            unlocked: false,
            isMystery: false,
            rewardType: 'cashback'
        },
        {
            level: 4,
            title: '🎁 Exclusive Tech Mystery Reward',
            desc: 'Achieve 100 customer acquisitions',
            unlocked: false,
            isMystery: true,
            rewardType: 'gift',
            giftTitle: 'Executive Wireless Bluetooth Kit',
            giftDesc: 'Premium noise-cancelling wireless audio gear & smart organizer kit.',
            giftValue: 1500
        }
    ];

    const triggerReveal = (level) => {
        setSelectedGiftReward({
            title: level.giftTitle || 'Special Mystery Reward',
            desc: level.giftDesc || "Congratulations on hitting your target!",
            value: level.giftValue || 500
        });
        setShowGiftModal(true);
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header with Breadcrumbs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <MarketingBreadcrumbs
                    customTitle="Targets & Mystery Rewards"
                    customSubtitle="Achieve targets. Unlock tiered cashbacks and unwrap physical mystery gifts."
                />

                {/* Month Chip */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                    <Calendar size={14} className="text-blue-600" />
                    <span>September 2026</span>
                </div>
            </div>

            {/* 1. TOP ACTIVE TARGET HERO */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800">
                            Active Primary Target
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                            25 New Customers
                        </h2>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                            12 / 25
                        </span>
                        <span className="text-xs font-bold text-slate-400 block">
                            13 more to unlock Level 2
                        </span>
                    </div>
                </div>

                {/* Main Progress Bar */}
                <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-4">
                    <div 
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500"
                        style={{ width: '48%' }}
                    />
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Started: 01 Sep 2026</span>
                    <span>Deadline: 30 Sep 2026 (15 days remaining)</span>
                </div>
            </div>

            {/* 2. ADDITIONAL TARGETS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Additional Target 1 */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            100 Product Shares
                        </h4>
                        <span className="text-xs font-black text-blue-600">40 / 100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                        <div className="h-full rounded-full bg-blue-600 w-[40%]" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                        Reward: ₹250 Direct Wallet Cashback
                    </span>
                </div>

                {/* Additional Target 2 */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            50 Campaign Orders
                        </h4>
                        <span className="text-xs font-black text-blue-600">18 / 50</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                        <div className="h-full rounded-full bg-blue-600 w-[36%]" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                        Reward: Exclusive Mystery Tech Gift Box
                    </span>
                </div>
            </div>

            {/* 3. YOUR REWARD JOURNEY TIMELINE */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="mb-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        Your Reward Journey
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Complete milestones to unlock guaranteed cashbacks and unwrap mystery rewards.
                    </p>
                </div>

                <div className="space-y-4">
                    {rewardJourneyLevels.map((lvl) => (
                        <div
                            key={lvl.level}
                            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                lvl.unlocked
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                                    lvl.unlocked
                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                }`}>
                                    {lvl.unlocked ? <CheckCircle2 size={20} /> : <Lock size={18} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-extrabold text-slate-400 uppercase">
                                            Level {lvl.level}
                                        </span>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                            {lvl.title}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {lvl.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                                {lvl.unlocked ? (
                                    <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xs">
                                        Earned & Credited
                                    </span>
                                ) : lvl.canReveal ? (
                                    <button
                                        onClick={() => triggerReveal(lvl)}
                                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-black shadow-md shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-1.5"
                                    >
                                        <Sparkles size={14} />
                                        <span>Reveal Reward Demo</span>
                                    </button>
                                ) : (
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs font-bold flex items-center gap-1">
                                        <Lock size={12} />
                                        <span>Locked</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. PHYSICAL GIFT FULFILLMENT TRACKER */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Truck size={20} className="text-blue-600" />
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            Physical Gift Dispatch & Delivery
                        </h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                        Managed by InTrust Admin
                    </span>
                </div>

                {initialClaims?.length > 0 ? (
                    <div className="space-y-4">
                        {initialClaims.map((claim) => {
                            const isDelivered = claim.status === 'delivered';
                            const isShipped = claim.status === 'shipped' || isDelivered;
                            const isProcessing = claim.status === 'processing' || isShipped;

                            return (
                                <div key={claim.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                                isDelivered 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                    : isShipped 
                                                    ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                                                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                                            }`}>
                                                {claim.status.toUpperCase()}
                                            </span>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                                                {claim.gift_title || claim.marketing_targets?.gift_name || 'InTrust Mystery Milestone Gift'}
                                            </h4>
                                            <p className="text-xs text-slate-400">
                                                {claim.courier_name ? `Dispatched via ${claim.courier_name} • AWB: ${claim.tracking_number}` : 'Processing packaging at InTrust central dispatch'}
                                            </p>
                                        </div>

                                        {claim.tracking_number && (
                                            <a
                                                href={claim.tracking_url || `https://www.google.com/search?q=${encodeURIComponent(claim.courier_name + ' tracking ' + claim.tracking_number)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-blue-600 dark:text-blue-300 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
                                            >
                                                <span>Track Package</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>

                                    {/* Progress timeline */}
                                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-extrabold">
                                        <div className="text-emerald-600">
                                            <div className="w-full h-1.5 rounded-full bg-emerald-500 mb-1" />
                                            Earned
                                        </div>
                                        <div className={isProcessing ? "text-emerald-600" : "text-slate-400"}>
                                            <div className={`w-full h-1.5 rounded-full mb-1 ${isProcessing ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Processing
                                        </div>
                                        <div className={isShipped ? "text-blue-600" : "text-slate-400"}>
                                            <div className={`w-full h-1.5 rounded-full mb-1 ${isShipped ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Shipped
                                        </div>
                                        <div className={isDelivered ? "text-emerald-600" : "text-slate-400"}>
                                            <div className={`w-full h-1.5 rounded-full mb-1 ${isDelivered ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Delivered
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center py-8">
                        <Gift size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            No active physical gift shipments yet.
                        </h4>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                            Complete your target milestones or win a challenge. When Admin ships your physical mystery gift, live courier tracking will appear here automatically!
                        </p>
                    </div>
                )}
            </div>

            {/* Mystery Gift Unboxing Modal */}
            <GiftBoxAnimationModal
                isOpen={showGiftModal}
                onClose={() => setShowGiftModal(false)}
                rewardTitle={selectedGiftReward.title}
                rewardDesc={selectedGiftReward.desc}
                rewardValue={selectedGiftReward.value}
            />
        </div>
    );
}
