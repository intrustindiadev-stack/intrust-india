'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
    ArrowRight, 
    Copy, 
    CheckCheck, 
    Store, 
    Wallet, 
    Gift, 
    ChevronRight,
    Sparkles,
    ShieldCheck,
    Lock,
    X,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackSponsorEvent } from '@/lib/sponsorshipTracking';

export default function QuizSponsorShowcase({
    todaySponsor = null,
    copiedProductId = null,
    handleShareProductDeal,
    onClaimCashback,
    rewardAmountRupees = null,
    claimRewardPaise = null,
    pointsEarned = null,
    isMerchant = false,
    score = 0,
    totalQuestions = 10
}) {
    const [showMerchantNotice, setShowMerchantNotice] = useState(false);

    const computedRewardRupees = rewardAmountRupees !== null 
        ? Number(rewardAmountRupees).toFixed(2)
        : claimRewardPaise !== null
        ? (Number(claimRewardPaise) / 100).toFixed(2)
        : '25.00';
    const computedPoints = pointsEarned !== null ? pointsEarned : (score * 10);

    const defaultShowcaseProducts = [
        {
            id: 'default-prod-1',
            product_name: 'Wireless Bluetooth ANC Earbuds',
            price: 1499,
            image_url: '/marketing/prizes/anc_earbuds.jpg',
            slug: 'official'
        },
        {
            id: 'default-prod-2',
            product_name: 'Smart AMOLED Fitness Tracker',
            price: 1899,
            image_url: '/marketing/prizes/smartwatch.jpg',
            slug: 'official'
        },
        {
            id: 'default-prod-3',
            product_name: 'Executive Travel Organizer Diary',
            price: 649,
            image_url: '/marketing/prizes/executive_kit.jpg',
            slug: 'official'
        },
        {
            id: 'default-prod-4',
            product_name: 'Fast-Charging 20000mAh Power Bank',
            price: 999,
            image_url: 'https://images.unsplash.com/photo-1609081219090-a6d8173087ec?w=400&auto=format&fit=crop&q=80',
            slug: 'official'
        }
    ];

    const displayProducts = (todaySponsor?.products && todaySponsor.products.length > 0)
        ? todaySponsor.products
        : defaultShowcaseProducts;

    const handleSponsorStoreClick = (e, url) => {
        if (isMerchant) {
            e.preventDefault();
            setShowMerchantNotice(true);
            return false;
        }
        return true;
    };

    return (
        <div className="space-y-4 max-w-xl mx-auto w-full animate-fadeIn">
            {/* Victory Header Card with Robot Mascot */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border-2 border-emerald-300 dark:border-emerald-700/60 rounded-3xl p-4 sm:p-5 text-center relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-white/90 border border-emerald-200 shadow-2xs shrink-0 flex items-center justify-center">
                        <Image
                            src="/robot-mascot-nobg.png"
                            alt="Robo Mascot"
                            width={42}
                            height={42}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                                Daily Challenge Completed!
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
                                +{computedPoints} PTS
                            </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug mt-0.5">
                            {score} of {totalQuestions} Correct • Bonus Cashback Unlocked
                        </h2>
                    </div>
                </div>
                <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
                    Today&apos;s featured partner has unlocked exclusive store deals and guaranteed cashback for you. Explore products below and claim your wallet reward!
                </p>
            </div>

            {/* Prominent Sponsor Showcase (Responsive & Clean) */}
            <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 border-2 border-amber-300 text-left space-y-4 shadow-md bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                        {/* Sponsor Store Avatar */}
                        <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 overflow-hidden">
                            {todaySponsor?.avatar_url ? (
                                <div className="relative w-11 h-11">
                                    <Image
                                        src={todaySponsor.avatar_url}
                                        alt={todaySponsor?.merchants?.business_name || "Sponsor"}
                                        fill
                                        sizes="44px"
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <span>{todaySponsor?.merchants?.business_name ? todaySponsor.merchants.business_name[0] : 'S'}</span>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                                    Official Challenge Sponsor
                                </span>
                                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                                    ✓ Verified Partner
                                </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900">
                                {todaySponsor?.merchants?.business_name || "InTrust Partner Merchant"}
                            </h3>
                        </div>
                    </div>

                    <a
                        href="/shop"
                        onClick={(e) => handleSponsorStoreClick(e, '/shop')}
                        className="text-xs font-black text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 self-start sm:self-center shrink-0 cursor-pointer"
                    >
                        <span>Visit Partner Store</span>
                        <ArrowRight size={13} />
                    </a>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs font-medium text-slate-800 italic">
                    &ldquo;{todaySponsor?.campaign_message || "Special bonus unlocked! Redeem your daily challenge cashback on these authentic verified products."}&rdquo;
                </div>

                {/* Sponsored Products Grid (Guaranteed always populated) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {displayProducts.slice(0, 4).map((p) => {
                        const isCopied = copiedProductId === (p.id || p.product_id);
                        const targetUrl = p.slug ? `/shop/product/${p.slug}` : '/shop';

                        return (
                            <div 
                                key={p.id || p.product_id}
                                className="group bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between"
                            >
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2">
                                    <Image
                                        src={p.image_url || '/icons/intrustLogo.png'}
                                        alt={p.product_name}
                                        fill
                                        sizes="(max-width: 640px) 50vw, 25vw"
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[11px] font-bold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                                        {p.product_name}
                                    </h4>
                                    <div className="flex items-baseline justify-between gap-1">
                                        <span className="text-xs font-black text-slate-900">
                                            ₹{p.price}
                                        </span>
                                        <span className="text-[9px] font-extrabold text-emerald-600">
                                            Verified Deal
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-1.5 mt-2.5">
                                    <a
                                        href={targetUrl}
                                        onClick={(e) => {
                                            if (isMerchant) {
                                                e.preventDefault();
                                                setShowMerchantNotice(true);
                                                return;
                                            }
                                            if (todaySponsor?.id) {
                                                trackSponsorEvent(todaySponsor.id, 'PRODUCT_CLICK', { productId: p.id || p.product_id });
                                            }
                                        }}
                                        className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black text-center transition-all block active:scale-95 shadow-xs cursor-pointer"
                                    >
                                        Shop Deal
                                    </a>
                                    {handleShareProductDeal && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleShareProductDeal(p, e)}
                                            className="w-full py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            {isCopied ? <CheckCheck size={10} className="text-emerald-600" /> : <Copy size={10} />}
                                            <span>{isCopied ? 'Link Copied!' : 'Share & Earn'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Primary Call-to-Action: Claim Cashback & Streak Modal */}
                {onClaimCashback && (
                    <div className="pt-2">
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClaimCashback}
                            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                            <Sparkles size={16} className="animate-spin-slow" />
                            <span>Claim Daily Challenge Cashback (+₹{computedRewardRupees}) & Save Streak →</span>
                            <ArrowRight size={15} />
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Fellow Merchant Confidentiality Modal */}
            <AnimatePresence>
                {showMerchantNotice && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative text-center space-y-4"
                        >
                            <button
                                type="button"
                                onClick={() => setShowMerchantNotice(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X size={16} />
                            </button>

                            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                                <ShieldCheck size={28} />
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                    Merchant Partner Notice
                                </span>
                                <h3 className="text-base sm:text-lg font-black text-slate-950 mt-2">
                                    Fellow Merchant Storefront Protected
                                </h3>
                                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                                    To maintain fair marketplace integrity and business confidentiality, verified merchant partners cannot browse fellow merchants&apos; live store catalogs or pricing.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <Link
                                    href="/merchant"
                                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Store size={13} />
                                    <span>My Storefront</span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setShowMerchantNotice(false)}
                                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                                >
                                    Continue Challenge
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

