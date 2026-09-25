'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
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
    ExternalLink,
    Loader2,
    MapPin,
    Phone,
    User as UserIcon,
    X,
    Share2,
    ShoppingBag,
    Award,
    Copy,
    Check,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import GuideInfoButton from '@/components/common/GuideInfoButton';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';

const GiftBoxAnimationModal = dynamic(() => import('@/components/marketing/animations/GiftBoxAnimationModal'), { ssr: false });
const ExclusivePrizesShowcase = dynamic(() => import('@/components/marketing/rewards/ExclusivePrizesShowcase'), {
    ssr: false,
    loading: () => <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 bg-white dark:bg-slate-900 animate-pulse h-44" />,
});

const DEFAULT_FALLBACK_TARGETS = [
    {
        id: 'target-fallback-1',
        title: 'Share 25 Verified Deals',
        description: 'Promote 25 store products to friends and local community groups across WhatsApp or social channels.',
        metric_type: 'share_links',
        target_value: 25,
        target_audience: 'all',
        reward_type: 'physical_gift',
        gift_name: 'Wireless ANC Earbuds',
        gift_image_url: '/marketing/prizes/anc_earbuds.jpg',
        reward_value_paise: 299900,
        is_active: true,
        sort_order: 1
    },
    {
        id: 'target-fallback-2',
        title: 'Drive 50 Store Product Visits',
        description: 'Achieve 50 verified product page clicks from your shared referral links.',
        metric_type: 'link_clicks',
        target_value: 50,
        target_audience: 'all',
        reward_type: 'physical_gift',
        gift_name: 'Smart Fitness Watch',
        gift_image_url: '/marketing/prizes/smartwatch.jpg',
        reward_value_paise: 349900,
        is_active: true,
        sort_order: 2
    },
    {
        id: 'target-fallback-3',
        title: 'Drive 5 Verified Customer Orders',
        description: 'Facilitate 5 completed purchases through your shared merchant catalog links.',
        metric_type: 'store_sales',
        target_value: 5,
        target_audience: 'all',
        reward_type: 'physical_gift',
        gift_name: 'Executive Travel Organizer Kit',
        gift_image_url: '/marketing/prizes/executive_kit.jpg',
        reward_value_paise: 199900,
        is_active: true,
        sort_order: 3
    },
    {
        id: 'target-fallback-4',
        title: 'Master Advocate (100 Shares)',
        description: 'Demonstrate top-tier advocacy with 100 verified shares to unlock our elite collector edition award.',
        metric_type: 'share_links',
        target_value: 100,
        target_audience: 'all',
        reward_type: 'physical_gift',
        gift_name: '24K Gold Coin (1g Certified)',
        gift_image_url: '/marketing/prizes/gold_coin.jpg',
        reward_value_paise: 899900,
        is_active: true,
        sort_order: 4
    }
];

export default function TargetsClient({
    user,
    profile,
    isMerchant,
    initialTargets = [],
    initialClaims = [],
    userProgress = {}
}) {
    const [targets, setTargets] = useState(() => (initialTargets && initialTargets.length > 0 ? initialTargets : DEFAULT_FALLBACK_TARGETS));
    const [claims, setClaims] = useState(initialClaims);
    const [claimingTargetId, setClaimingTargetId] = useState(null);
    const [shippingModalTarget, setShippingModalTarget] = useState(null);
    const [copiedAwb, setCopiedAwb] = useState(null);
    const [shippingForm, setShippingForm] = useState({
        recipientName: user?.user_metadata?.full_name || '',
        recipientPhone: user?.phone || '',
        shippingAddress: ''
    });
    const [claimError, setClaimError] = useState(null);
    const [mounted, setMounted] = useState(false);

    // Mystery Box Animation States
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [selectedGiftReward, setSelectedGiftReward] = useState({
        title: 'Milestone Reward',
        desc: "Congrats! You've unlocked a milestone reward.",
        value: 500
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close open modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShippingModalTarget(null);
                setShowGiftModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Helper to calculate live progress for any admin-configured target
    const getTargetMetricValue = (target) => {
        if (!target) return 0;
        switch (target.metric_type) {
            case 'share_links':
                return Number(userProgress.total_shares || 0);
            case 'link_clicks':
                return Number(userProgress.link_clicks || 0);
            case 'store_sales':
                return Number(userProgress.orders || 0);
            case 'user_registration':
                return 1;
            case 'first_order':
                return Number(userProgress.orders || 0) >= 1 ? 1 : 0;
            default:
                return Number(userProgress.total_shares || 0);
        }
    };

    const getMetricUnit = (target) => {
        switch (target.metric_type) {
            case 'share_links': return 'Shares';
            case 'link_clicks': return 'Visits';
            case 'store_sales': return 'Orders';
            case 'user_registration': return 'Account';
            case 'first_order': return 'Order';
            default: return 'Actions';
        }
    };

    const getTargetIcon = (target) => {
        switch (target.metric_type) {
            case 'share_links':
                return <Share2 size={16} className="text-blue-500" />;
            case 'link_clicks':
                return <TrendingUp size={16} className="text-indigo-500" />;
            case 'store_sales':
                return <ShoppingBag size={16} className="text-emerald-500" />;
            default:
                return <Target size={16} className="text-blue-500" />;
        }
    };

    const getTargetActionUrl = (target) => {
        switch (target.metric_type) {
            case 'share_links':
                return '/marketing/products';
            case 'link_clicks':
            case 'store_sales':
                return '/marketing/products';
            default:
                return '/marketing';
        }
    };

    const getTargetActionLabel = (target) => {
        switch (target.metric_type) {
            case 'share_links':
                return 'Share Products →';
            case 'link_clicks':
                return 'Promote Links →';
            case 'store_sales':
                return 'Promote Products →';
            default:
                return 'Take Action →';
        }
    };

    // Filter relevant targets for this user type (all, customer, merchant)
    const relevantTargets = targets.filter(t => {
        if (!t.is_active) return false;
        if (t.target_audience === 'all') return true;
        if (isMerchant && t.target_audience === 'merchant') return true;
        if (!isMerchant && t.target_audience === 'customer') return true;
        return false;
    });

    const claimedTargetIds = new Set(claims.map(c => c.target_id));

    const progressOf = (t) => {
        const cur = getTargetMetricValue(t);
        const goal = Number(t.target_value || 1);
        return { 
            cur, 
            goal, 
            pct: Math.min(100, Math.round((cur / goal) * 100)), 
            left: Math.max(0, goal - cur),
            isCompleted: cur >= goal,
            isClaimed: claimedTargetIds.has(t.id)
        };
    };

    // Sort: Completed & Unclaimed first, then nearest to completion, then already claimed
    const rankedTargets = [...relevantTargets].sort((a, b) => {
        const pa = progressOf(a);
        const pb = progressOf(b);
        if (pa.isClaimed !== pb.isClaimed) return pa.isClaimed ? 1 : -1;
        if (pa.isCompleted !== pb.isCompleted) return pa.isCompleted ? -1 : 1;
        if (pb.pct !== pa.pct) return pb.pct - pa.pct;
        return (a.sort_order || 0) - (b.sort_order || 0);
    });

    const activePrimaryTarget = rankedTargets[0];
    const secondaryTargets = rankedTargets.slice(1);

    // Summary counts for quick stats
    const totalClaimedCount = claims.length;
    const eligibleUnclaimedCount = relevantTargets.filter(t => {
        const p = progressOf(t);
        return p.isCompleted && !p.isClaimed;
    }).length;

    const currentMonthStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - new Date().getDate());

    const handleCopyAwb = (awb) => {
        if (!awb) return;
        navigator.clipboard.writeText(awb);
        setCopiedAwb(awb);
        setTimeout(() => setCopiedAwb(null), 2000);
    };

    // Execute claim API request
    const executeClaim = async (target, shippingDetails = null) => {
        if (!target || claimingTargetId) return;

        // Physical gifts require valid recipient details
        if (target.reward_type === 'physical_gift') {
            const phone = String(shippingDetails?.recipientPhone || '').replace(/\D/g, '').slice(-10);
            const pin = String(shippingDetails?.shippingAddress || '').match(/\b\d{6}\b/);
            if (!shippingDetails?.recipientName?.trim() || phone.length !== 10 || !shippingDetails?.shippingAddress?.trim() || !pin) {
                setClaimError('Please provide full name, 10-digit mobile number, and delivery address with 6-digit PIN code.');
                return;
            }
        }
        setClaimingTargetId(target.id);
        setClaimError(null);

        try {
            const res = await fetch('/api/marketing/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetId: target.id,
                    recipientName: shippingDetails?.recipientName,
                    recipientPhone: shippingDetails?.recipientPhone,
                    shippingAddress: shippingDetails?.shippingAddress
                })
            });

            const data = await res.json();
            if (!data.success) {
                setClaimError(data.error || 'Failed to claim target milestone');
                return;
            }

            // Successfully claimed — prepend to claims
            setClaims(prev => (prev.some(c => c.id === data.claim.id) ? prev : [data.claim, ...prev]));
            setShippingModalTarget(null);

            const isCash = target.reward_type === 'cashback';
            const cashVal = Math.round(Number(target.reward_value_paise || 0) / 100);
            setSelectedGiftReward({
                title: isCash
                    ? `₹${cashVal.toLocaleString('en-IN')} Wallet Cashback`
                    : (target.gift_name || data.claim?.gift_title || 'Milestone Gift Box'),
                desc: data.message || 'Milestone conquered! Your reward has been confirmed.',
                value: isCash ? cashVal : 0
            });
            setShowGiftModal(true);
        } catch (err) {
            console.error('Claim failed:', err);
            setClaimError('Network error while processing claim.');
        } finally {
            setClaimingTargetId(null);
        }
    };

    const handleClaimClick = (target) => {
        if (target.reward_type === 'physical_gift') {
            setShippingModalTarget(target);
        } else {
            executeClaim(target);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn w-full max-w-full overflow-hidden">
            {/* Header with Breadcrumbs, guide & Live Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                    <MarketingBreadcrumbs
                        customTitle="Performance Targets & Gifts"
                        customSubtitle="Achieve real action milestones to unlock guaranteed wallet cashbacks and doorstep physical gifts decided by InTrust."
                        className="flex-1 min-w-0"
                    />
                    <GuideInfoButton pageKey="/marketing/targets" scope="marketing" className="mt-1 shrink-0" />
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
                        <Calendar size={14} className="text-blue-600" />
                        <span>{currentMonthStr}</span>
                    </div>
                    {eligibleUnclaimedCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-2xs animate-pulse">
                            <Sparkles size={14} />
                            <span>{eligibleUnclaimedCount} Ready to Claim!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Notification Banner */}
            {claimError && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm font-bold text-rose-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <X size={16} className="shrink-0" />
                        <span>{claimError}</span>
                    </div>
                    <button onClick={() => setClaimError(null)} className="p-1 hover:bg-rose-100 rounded-lg cursor-pointer">
                        <X size={15} />
                    </button>
                </div>
            )}

            {/* 1. EXCLUSIVE PHYSICAL PRIZES & WHAT YOU CAN WIN SHOWCASE */}
            <ExclusivePrizesShowcase isMerchant={isMerchant} targets={targets} />

            {/* 2. FEATURED / HIGHEST-PRIORITY TARGET HERO */}
            {activePrimaryTarget && (() => {
                const p = progressOf(activePrimaryTarget);
                const isPhysical = activePrimaryTarget.reward_type === 'physical_gift';
                const giftImg = activePrimaryTarget.gift_image_url;
                const giftTitle = activePrimaryTarget.gift_name || (activePrimaryTarget.reward_type === 'cashback' ? `₹${(Number(activePrimaryTarget.reward_value_paise || 0) / 100).toFixed(0)} Wallet Cashback` : 'Milestone Gift');

                return (
                    <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2.5">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider shadow-2xs">
                                        <Target size={13} className="text-blue-600" />
                                        <span>Featured Milestone Target</span>
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-extrabold">
                                        Ends {currentMonthStr} ({daysRemaining}d left)
                                    </span>
                                    {p.isCompleted && !p.isClaimed && (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black animate-pulse">
                                            Milestone Completed!
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-950 dark:text-white tracking-tight leading-snug">
                                    {activePrimaryTarget.title}
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-xl font-medium leading-relaxed">
                                    {activePrimaryTarget.description || 'Achieve this milestone to unlock guaranteed rewards from InTrust.'}
                                </p>

                                {/* Live Progress Bar Section */}
                                <div className="mt-5 space-y-2">
                                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                            Progress: <strong className="text-blue-600 dark:text-blue-400 font-black">{p.cur} / {p.goal} {getMetricUnit(activePrimaryTarget)}</strong>
                                        </span>
                                        <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                            {p.pct}% Completed
                                        </span>
                                    </div>

                                    <div className="w-full h-3.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden relative shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${p.pct}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className={`h-full rounded-full relative ${
                                                p.isClaimed ? 'bg-emerald-500' : p.isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                            }`}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Reward & Action Row */}
                                <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                                        <span className="text-slate-500 font-semibold">Award:</span>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-xs sm:text-sm">
                                            <Gift size={15} className="text-emerald-600" />
                                            <span>{giftTitle}</span>
                                        </span>
                                        {isPhysical && (
                                            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 font-semibold">
                                                <Truck size={14} className="text-slate-400" />
                                                <span>Free Doorstep Delivery</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {p.isClaimed ? (
                                            <span className="px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-2xs">
                                                <CheckCircle2 size={16} />
                                                <span>Milestone Earned & Claimed</span>
                                            </span>
                                        ) : p.isCompleted ? (
                                            <button
                                                onClick={() => handleClaimClick(activePrimaryTarget)}
                                                disabled={claimingTargetId === activePrimaryTarget.id}
                                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                {claimingTargetId === activePrimaryTarget.id ? (
                                                    <Loader2 size={15} className="animate-spin" />
                                                ) : (
                                                    <Sparkles size={15} />
                                                )}
                                                <span>Claim Gift Now</span>
                                            </button>
                                        ) : (
                                            <Link
                                                href={getTargetActionUrl(activePrimaryTarget)}
                                                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-black transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                            >
                                                <span>{getTargetActionLabel(activePrimaryTarget)}</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actual Gift Photo or Reward Display */}
                            <div className="shrink-0 flex items-center justify-center">
                                {giftImg ? (
                                    <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-3xl overflow-hidden border-2 border-slate-200/90 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800 flex items-center justify-center group">
                                        <Image
                                            src={giftImg}
                                            alt={giftTitle}
                                            fill
                                            sizes="192px"
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/75 via-black/30 to-transparent text-white text-center">
                                            <span className="text-xs font-bold uppercase tracking-wider block truncate">
                                                {activePrimaryTarget.gift_name || 'Gift Prize'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-md w-40 h-40 sm:w-48 sm:h-48 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                                            <Gift size={32} />
                                        </div>
                                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[140px]">
                                            {giftTitle}
                                        </span>
                                        <span className="text-xs font-bold text-emerald-600 mt-0.5">
                                            Guaranteed Reward
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 3. ALL CONFIGURED MILESTONE TARGETS & LIVE PROGRESS */}
            {secondaryTargets.length > 0 && (
                <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Award size={16} className="text-blue-600" />
                            <span>All Campaign Milestones & Rewards</span>
                        </h3>
                        <span className="text-xs font-semibold text-slate-400">
                            {secondaryTargets.length} Additional Targets
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                        {secondaryTargets.map((target) => {
                            const p = progressOf(target);
                            const isPhysical = target.reward_type === 'physical_gift';
                            const giftImg = target.gift_image_url;
                            const giftTitle = target.gift_name || (target.reward_type === 'cashback' ? `₹${(Number(target.reward_value_paise || 0) / 100).toFixed(0)} Cashback` : 'Gift Reward');

                            return (
                                <div 
                                    key={target.id} 
                                    className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border shadow-2xs flex flex-col justify-between transition-all ${
                                        p.isCompleted && !p.isClaimed 
                                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/20 shadow-md'
                                            : p.isClaimed
                                            ? 'border-slate-200/80 dark:border-slate-800 opacity-90'
                                            : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-300'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Gift image thumbnail or action icon */}
                                                <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                    {giftImg ? (
                                                        <Image
                                                            src={giftImg}
                                                            alt={giftTitle}
                                                            fill
                                                            sizes="48px"
                                                            className="object-cover"
                                                        />
                                                    ) : isPhysical ? (
                                                        <Gift size={20} className="text-amber-600 dark:text-amber-400" />
                                                    ) : (
                                                        getTargetIcon(target)
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                                            Target Milestone
                                                        </span>
                                                        {target.target_audience === 'merchant' && (
                                                            <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                Merchant
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                                                        {target.title}
                                                    </h4>
                                                    <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-extrabold truncate mt-0.5">
                                                        {isPhysical ? `🎁 ${giftTitle}` : `₹${(Number(target.reward_value_paise || 0) / 100).toFixed(0)} Wallet Cashback`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">
                                                    {p.cur} / {p.goal}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-400 block">
                                                    {getMetricUnit(target)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    p.isClaimed 
                                                        ? 'bg-emerald-500' 
                                                        : p.isCompleted 
                                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                                        : 'bg-blue-600'
                                                }`}
                                                style={{ width: `${p.pct}%` }} 
                                            />
                                        </div>
                                    </div>

                                    {/* Action footer */}
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
                                        <span className="text-xs font-bold text-slate-500">
                                            {p.isClaimed ? '✅ Earned & Claimed' : `${p.pct}% Completed`}
                                        </span>

                                        {p.isClaimed ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 text-xs sm:text-sm">
                                                <CheckCircle2 size={14} />
                                                <span>Claimed</span>
                                            </span>
                                        ) : p.isCompleted ? (
                                            <button
                                                onClick={() => handleClaimClick(target)}
                                                disabled={claimingTargetId === target.id}
                                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                {claimingTargetId === target.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                                <span>Claim Gift</span>
                                            </button>
                                        ) : (
                                            <Link
                                                href={getTargetActionUrl(target)}
                                                className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 text-xs sm:text-sm"
                                            >
                                                <span>{p.left} more needed</span>
                                                <ArrowRight size={13} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 4. PHYSICAL GIFT FULFILLMENT & DOORSTEP DISPATCH TRACKER */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Truck size={18} className="text-blue-600" />
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            Physical Gift Dispatch & Courier Hub
                        </h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                        InTrust Logistics Central
                    </span>
                </div>

                {claims?.length > 0 ? (
                    <div className="space-y-3.5">
                        {claims.map((claim) => {
                            const isDelivered = claim.status === 'delivered';
                            const isShipped = claim.status === 'shipped' || isDelivered;
                            const isProcessing = claim.status === 'processing' || isShipped;
                            const giftImage = claim.marketing_targets?.gift_image_url;

                            return (
                                <div key={claim.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-amber-500/10 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                                                {giftImage ? (
                                                    <Image
                                                        src={giftImage}
                                                        alt={claim.gift_title || 'Gift'}
                                                        fill
                                                        sizes="48px"
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <Package size={22} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                                                    isDelivered 
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        : isShipped 
                                                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                }`}>
                                                    {claim.status?.toUpperCase() || 'EARNED'}
                                                </span>
                                                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1 truncate">
                                                    {claim.gift_title || claim.marketing_targets?.gift_name || 'Milestone Gift'}
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                                                    {claim.courier_name 
                                                        ? `Dispatched via ${claim.courier_name} • AWB: ${claim.tracking_number}` 
                                                        : 'Fulfillment verified at InTrust Central Dispatch'}
                                                </p>
                                            </div>
                                        </div>

                                        {claim.tracking_number && (
                                            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                                <button
                                                    onClick={() => handleCopyAwb(claim.tracking_number)}
                                                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                                                    title="Copy AWB Tracking Number"
                                                >
                                                    {copiedAwb === claim.tracking_number ? (
                                                        <>
                                                            <Check size={13} className="text-emerald-600" />
                                                            <span>Copied</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={13} />
                                                            <span>Copy AWB</span>
                                                        </>
                                                    )}
                                                </button>
                                                <a
                                                    href={claim.tracking_url || `https://www.google.com/search?q=${encodeURIComponent(claim.courier_name + ' tracking ' + claim.tracking_number)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-2xs"
                                                >
                                                    <span>Track Courier</span>
                                                    <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4-Step Visual Logistics Stepper */}
                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center text-xs font-extrabold pt-1">
                                        <div className="text-emerald-600">
                                            <div className="w-full h-2 rounded-full bg-emerald-500 mb-1.5" />
                                            Milestone Earned
                                        </div>
                                        <div className={isProcessing ? "text-emerald-600" : "text-slate-400"}>
                                            <div className={`w-full h-2 rounded-full mb-1.5 ${isProcessing ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Packed & Verified
                                        </div>
                                        <div className={isShipped ? "text-blue-600" : "text-slate-400"}>
                                            <div className={`w-full h-2 rounded-full mb-1.5 ${isShipped ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Dispatched
                                        </div>
                                        <div className={isDelivered ? "text-emerald-600" : "text-slate-400"}>
                                            <div className={`w-full h-2 rounded-full mb-1.5 ${isDelivered ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Delivered
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                            <Gift size={28} />
                        </div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                            No active physical gift shipments yet.
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                            Complete target milestones above to earn verified physical gifts and gadgets. Once earned, prizes are dispatched directly to your doorstep with 100% free courier tracking!
                        </p>
                    </div>
                )}
            </div>

            {/* Modal: Shipping Address for Physical Gifts (Portaled to document.body for 100vh viewport centering) */}
            <AnimatePresence>
                {shippingModalTarget && mounted && typeof document !== 'undefined' && createPortal(
                    <div 
                        onClick={() => setShippingModalTarget(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm cursor-pointer animate-fadeIn"
                    >
                        <motion.div
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 cursor-default max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                                        <Package size={22} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                                            Claim Milestone Gift
                                        </h3>
                                        <p className="text-xs text-slate-400 truncate">
                                            {shippingModalTarget.gift_name || shippingModalTarget.title} • Free Doorstep Delivery
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShippingModalTarget(null)}
                                    className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Recipient Full Name
                                    </label>
                                    <div className="relative">
                                        <UserIcon size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={shippingForm.recipientName}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, recipientName: e.target.value }))}
                                            placeholder="Full Name"
                                            className="w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Contact Phone (for Courier SMS &amp; OTP)
                                    </label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={shippingForm.recipientPhone}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                                            placeholder="+91 98765 43210"
                                            className="w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Delivery Address (with 6-Digit PIN Code)
                                    </label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                                        <textarea
                                            rows={3}
                                            value={shippingForm.shippingAddress}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, shippingAddress: e.target.value }))}
                                            placeholder="House / Flat No, Street, Landmark, City, State, PIN Code"
                                            className="w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    onClick={() => setShippingModalTarget(null)}
                                    className="min-h-[44px] px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => executeClaim(shippingModalTarget, shippingForm)}
                                    disabled={claimingTargetId === shippingModalTarget.id || !shippingForm.shippingAddress.trim()}
                                    className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                                >
                                    {claimingTargetId === shippingModalTarget.id ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                    <span>Confirm &amp; Dispatch Gift</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </AnimatePresence>

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
