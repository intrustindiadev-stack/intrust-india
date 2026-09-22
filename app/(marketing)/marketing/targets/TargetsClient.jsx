'use client';

import { useState, useEffect } from 'react';
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
    Flame,
    Share2,
    ShoppingBag,
    Award,
    Trophy,
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
import TreasureChestVector from '@/components/marketing/graphics/TreasureChestVector';
import TrophyChampionVector from '@/components/marketing/graphics/TrophyChampionVector';
import RocketGrowthVector from '@/components/marketing/graphics/RocketGrowthVector';

export default function TargetsClient({
    user,
    profile,
    isMerchant,
    initialTargets = [],
    initialClaims = [],
    userProgress = {}
}) {
    const [targets, setTargets] = useState(initialTargets);
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

    // Mystery Box Animation States
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [selectedGiftReward, setSelectedGiftReward] = useState({
        title: '₹500 Cashback',
        desc: "Congrats! You've unlocked a milestone reward.",
        value: 500
    });

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

    // Helper to extract current progress metric for a target
    const getTargetMetricValue = (target) => {
        if (!target) return 0;
        switch (target.metric_type) {
            case 'quiz_streak':
                return Math.max(Number(userProgress.current_streak || 0), Number(userProgress.highest_streak || 0));
            case 'share_links':
                return Number(userProgress.total_shares || 0);
            case 'link_clicks':
                return Number(userProgress.link_clicks || 0);
            case 'store_sales':
                return Number(userProgress.orders || 0);
            case 'user_registration':
                return 1; // User is registered and logged in
            case 'daily_login':
                return Math.max(Number(userProgress.current_streak || 0), 1);
            case 'first_order':
                return Number(userProgress.orders || 0) >= 1 ? 1 : 0;
            default:
                return Number(userProgress.total_shares || 0);
        }
    };

    const getMetricUnit = (target) => {
        switch (target.metric_type) {
            case 'quiz_streak': return 'Days';
            case 'share_links': return 'Shares';
            case 'link_clicks': return 'Clicks';
            case 'store_sales': return 'Orders';
            case 'user_registration': return 'Account';
            case 'daily_login': return 'Days';
            case 'first_order': return 'Order';
            default: return 'Actions';
        }
    };

    const getTargetIcon = (target) => {
        switch (target.metric_type) {
            case 'quiz_streak':
                return <Flame size={16} className="text-amber-500" />;
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
            case 'quiz_streak':
                return '/marketing/daily-challenge';
            case 'share_links':
            case 'link_clicks':
            case 'store_sales':
                return '/marketing';
            default:
                return '/marketing';
        }
    };

    const getTargetActionLabel = (target) => {
        switch (target.metric_type) {
            case 'quiz_streak':
                return 'Play Daily Quiz →';
            case 'share_links':
                return 'Share Store Links →';
            case 'link_clicks':
                return 'Promote Links →';
            case 'store_sales':
                return 'Promote Products →';
            default:
                return 'Take Action →';
        }
    };

    // Filter relevant targets for this user type
    const relevantTargets = targets.filter(t => {
        if (!t.is_active) return false;
        if (t.target_audience === 'all') return true;
        if (isMerchant && t.target_audience === 'merchant') return true;
        if (!isMerchant && t.target_audience === 'customer') return true;
        return false;
    });

    // Determine primary target: nearest-to-complete unclaimed target first
    // (production rule: target complete → gift). Falls back to first row.
    const claimedTargetIds = new Set(claims.map(c => c.target_id));
    const progressOf = (t) => {
        const cur = getTargetMetricValue(t);
        const goal = Number(t.target_value || 1);
        return { cur, goal, pct: Math.min(100, Math.round((cur / goal) * 100)), left: Math.max(0, goal - cur) };
    };
    const unclaimed = relevantTargets.filter(t => !claimedTargetIds.has(t.id));
    const ranked = [...unclaimed].sort((a, b) => {
        const pa = progressOf(a); const pb = progressOf(b);
        // Eligible (100%) first, then highest %, then smallest "left"
        if ((pb.pct >= 100) !== (pa.pct >= 100)) return (pb.pct >= 100 ? 1 : 0) - (pa.pct >= 100 ? 1 : 0);
        if (pb.pct !== pa.pct) return pb.pct - pa.pct;
        return pa.left - pb.left;
    });
    const activePrimaryTarget = ranked[0] || relevantTargets.find(t => !claimedTargetIds.has(t.id)) || relevantTargets[0];
    const secondaryTargets = relevantTargets.filter(t => t.id !== activePrimaryTarget?.id);

    // Primary target calculations
    const primaryCurrent = activePrimaryTarget ? getTargetMetricValue(activePrimaryTarget) : 0;
    const primaryGoal = activePrimaryTarget?.target_value || 1;
    const primaryPercent = Math.min(100, Math.round((primaryCurrent / primaryGoal) * 100));
    const primaryIsClaimed = activePrimaryTarget ? claimedTargetIds.has(activePrimaryTarget.id) : false;
    const primaryIsEligible = primaryCurrent >= primaryGoal && !primaryIsClaimed;

    // Summary counts for quick stats
    const totalClaimedCount = claims.length;
    const eligibleUnclaimedCount = relevantTargets.filter(t => {
        const val = getTargetMetricValue(t);
        const goal = t.target_value || 1;
        return val >= goal && !claimedTargetIds.has(t.id);
    }).length;

    // Current Month Formatting
    const currentMonthStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - new Date().getDate());

    const handleCopyAwb = (awb) => {
        if (!awb) return;
        navigator.clipboard.writeText(awb);
        setCopiedAwb(awb);
        setTimeout(() => setCopiedAwb(null), 2000);
    };

    // Execute claim API request (optimistic, idempotent per target)
    const executeClaim = async (target, shippingDetails = null) => {
        if (!target || claimingTargetId) return;
        // Physical gifts require valid recipient details (PIN + 10-digit phone)
        if (target.reward_type === 'physical_gift' || target.reward_type === 'mystery_box') {
            const phone = String(shippingDetails?.recipientPhone || '').replace(/\D/g, '').slice(-10);
            const pin = String(shippingDetails?.shippingAddress || '').match(/\b\d{6}\b/);
            if (!shippingDetails?.recipientName?.trim() || phone.length !== 10 || !shippingDetails?.shippingAddress?.trim() || !pin) {
                setClaimError('Add full name, 10-digit phone and address with 6-digit PIN to dispatch your gift.');
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

            // Successfully claimed — optimistic prepend (dedupe by id)
            setClaims(prev => (prev.some(c => c.id === data.claim.id) ? prev : [data.claim, ...prev]));
            setShippingModalTarget(null);

            // Trigger celebratory animation (real gift value, merchant vs user copy)
            const isCash = target.reward_type === 'cashback';
            const cashVal = Math.round(Number(target.reward_value_paise || 0) / 100);
            setSelectedGiftReward({
                title: isCash
                    ? `₹${cashVal.toLocaleString('en-IN')} Wallet Credit`
                    : (target.gift_name || data.claim?.gift_title || 'Milestone Mystery Surprise Box'),
                desc: data.message || (isMerchant
                    ? 'Reward milestone conquered! Credit applied to your merchant wallet.'
                    : 'Reward milestone conquered! Credit applied to your InTrust wallet.'),
                value: isCash ? cashVal : cashVal || 0
            });
            setShowGiftModal(true);
        } catch (err) {
            console.error('Claim failed:', err);
            setClaimError('Network error while processing claim.');
        } finally {
            setClaimingTargetId(null);
        }
    };

    // Handler when user clicks "Claim" on a target
    const handleClaimClick = (target) => {
        if (target.reward_type === 'physical_gift' || target.reward_type === 'mystery_box') {
            setShippingModalTarget(target);
        } else {
            executeClaim(target);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn w-full max-w-full overflow-hidden">
            {/* Header with Breadcrumbs, guide & Live Stats Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                    <MarketingBreadcrumbs
                        customTitle="Targets & Mystery Rewards"
                        customSubtitle="Achieve real activity milestones to unlock guaranteed wallet cashbacks and certified mystery goodie crates."
                        className="flex-1 min-w-0"
                    />
                    <GuideInfoButton pageKey="/marketing/targets" scope="marketing" className="mt-1 shrink-0" />
                </div>

                {/* Status Chips */}
                <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
                        <Calendar size={13} className="text-blue-600" />
                        <span>{currentMonthStr}</span>
                    </div>
                    {eligibleUnclaimedCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-[11px] sm:text-xs font-black shadow-2xs animate-pulse">
                            <Sparkles size={13} />
                            <span>{eligibleUnclaimedCount} Ready to Claim</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Notification Banner */}
            {claimError && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <X size={15} className="shrink-0" />
                        <span>{claimError}</span>
                    </div>
                    <button onClick={() => setClaimError(null)} className="p-1 hover:bg-rose-100 rounded-lg cursor-pointer">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* 1. EXCLUSIVE PHYSICAL PRIZES & WHAT YOU CAN WIN SHOWCASE */}
            <ExclusivePrizesShowcase isMerchant={isMerchant} targets={targets} />

            {/* 2. TOP ACTIVE TARGET HERO (ILLUSTRATION-BASED) */}
            {activePrimaryTarget ? (
                <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    {/* Ambient Radial Accent */}
                    <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                        {/* Left: Info & Progress Bar */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-2xs">
                                    <Target size={12} className="text-blue-600" />
                                    <span>Active Milestone Target</span>
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold">
                                    Ends {currentMonthStr} ({daysRemaining}d left)
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-950 dark:text-white tracking-tight leading-snug">
                                {activePrimaryTarget.title}
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-xl font-medium leading-relaxed">
                                {activePrimaryTarget.description || 'Achieve this milestone to unlock guaranteed rewards and wallet credit.'}
                            </p>

                            {/* Live Progress Bar Section */}
                            <div className="mt-5 space-y-2">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                        Progress: <strong className="text-blue-600 dark:text-blue-400 font-black">{primaryCurrent} / {primaryGoal} {getMetricUnit(activePrimaryTarget)}</strong>
                                    </span>
                                    <span className="text-[11px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                        {primaryPercent}% Completed
                                    </span>
                                </div>

                                <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden relative shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${primaryPercent}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 relative"
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                    </motion.div>
                                </div>
                            </div>

                            {/* Reward & Action Row */}
                            <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 font-semibold">Reward:</span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black">
                                        <Gift size={13} className="text-emerald-600" />
                                        {activePrimaryTarget.reward_type === 'cashback' 
                                            ? `₹${(Number(activePrimaryTarget.reward_value_paise || 0) / 100).toFixed(2)} Wallet Credit` 
                                            : 'Milestone Mystery Gift Box'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {primaryIsClaimed ? (
                                        <span className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                                            <CheckCircle2 size={14} />
                                            <span>Milestone Earned & Claimed</span>
                                        </span>
                                    ) : primaryIsEligible ? (
                                        <button
                                            onClick={() => handleClaimClick(activePrimaryTarget)}
                                            disabled={claimingTargetId === activePrimaryTarget.id}
                                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            {claimingTargetId === activePrimaryTarget.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Sparkles size={14} />
                                            )}
                                            <span>Claim Reward Now</span>
                                        </button>
                                    ) : (
                                        <Link
                                            href={getTargetActionUrl(activePrimaryTarget)}
                                            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                        >
                                            <span>{getTargetActionLabel(activePrimaryTarget)}</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: 3D Illustration Showcase (Mystery Box / Milestone Vector) */}
                        <div className="shrink-0 flex items-center justify-center">
                            {activePrimaryTarget.reward_type === 'physical_gift' || activePrimaryTarget.reward_type === 'mystery_box' ? (
                                <div className="relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-3xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-md">
                                    <TreasureChestVector animated={true} className="w-36 h-36 sm:w-44 sm:h-44" />
                                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-1">
                                        Surprise Goodie Box
                                    </span>
                                </div>
                            ) : (
                                <div className="relative flex items-center justify-center">
                                    <TrophyChampionVector animated={true} className="w-40 h-40 sm:w-52 sm:h-52" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-8 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                    <TrophyChampionVector animated={true} className="w-36 h-36 mx-auto mb-3" />
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        All Milestone Targets Conquered!
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Outstanding work! Check back next month for a fresh set of campaigns, mystery crates, and verified wallet rewards.
                    </p>
                </div>
            )}

            {/* 3. SECONDARY MILESTONE TARGETS (ILLUSTRATION-BASED 2-COL GRID) */}
            {secondaryTargets.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Award size={16} className="text-blue-600" />
                            <span>Additional Campaign Milestones</span>
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400">
                            {secondaryTargets.length} Campaigns Available
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                        {secondaryTargets.map((target, idx) => {
                            const currentVal = getTargetMetricValue(target);
                            const goalVal = target.target_value || 1;
                            const pct = Math.min(100, Math.round((currentVal / goalVal) * 100));
                            const isClaimed = claimedTargetIds.has(target.id);
                            const isEligible = currentVal >= goalVal && !isClaimed;

                            return (
                                <div 
                                    key={target.id} 
                                    className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                                                    {target.reward_type === 'physical_gift' || target.reward_type === 'mystery_box' ? (
                                                        <Gift size={20} className="text-amber-600 dark:text-amber-400" />
                                                    ) : (
                                                        getTargetIcon(target)
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                                        Milestone 0{idx + 2}
                                                    </span>
                                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                                        {target.title}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                                                        {target.reward_type === 'cashback' 
                                                            ? `Reward: ₹${(Number(target.reward_value_paise || 0) / 100).toFixed(2)} Wallet Credit` 
                                                            : 'Reward: Sealed Milestone Mystery Box'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
                                                    {currentVal} / {goalVal}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 block">
                                                    {getMetricUnit(target)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    isClaimed ? 'bg-emerald-500' : isEligible ? 'bg-gradient-to-r from-amber-500 to-emerald-500' : 'bg-blue-600'
                                                }`}
                                                style={{ width: `${pct}%` }} 
                                            />
                                        </div>
                                    </div>

                                    {/* Action footer */}
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                        <span className="text-[11px] font-bold text-slate-500">
                                            {isClaimed ? '✅ Earned & Claimed' : `${pct}% Completed`}
                                        </span>

                                        {isClaimed ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 text-[11px]">
                                                <CheckCircle2 size={13} />
                                                <span>Claimed</span>
                                            </span>
                                        ) : isEligible ? (
                                            <button
                                                onClick={() => handleClaimClick(target)}
                                                disabled={claimingTargetId === target.id}
                                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                {claimingTargetId === target.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                <span>Claim Now</span>
                                            </button>
                                        ) : (
                                            <Link
                                                href={getTargetActionUrl(target)}
                                                className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 text-[11px]"
                                            >
                                                <span>{Math.max(0, goalVal - currentVal)} more needed</span>
                                                <ArrowRight size={11} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 4. YOUR REWARD JOURNEY TIMELINE (ILLUSTRATED PROGRESSION ROADMAP) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <div className="mb-5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider mb-1.5">
                        <RocketGrowthVector animated={false} className="w-3.5 h-3.5" />
                        <span>Milestone Roadmap</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        Your Reward Journey Ladder
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Progress through campaign levels to unlock instant wallet cashbacks and certified mystery boxes.
                    </p>
                </div>

                <div className="space-y-3 sm:space-y-3.5">
                    {relevantTargets.map((target, idx) => {
                        const currentVal = getTargetMetricValue(target);
                        const goalVal = target.target_value || 1;
                        const isClaimed = claimedTargetIds.has(target.id);
                        const isEligible = currentVal >= goalVal && !isClaimed;
                        const isUnlocked = isClaimed || isEligible;

                        return (
                            <div
                                key={target.id}
                                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                                    isClaimed
                                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                        : isEligible
                                        ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 shadow-sm'
                                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                        isClaimed
                                            ? 'bg-emerald-500 text-white shadow-2xs shadow-emerald-500/25'
                                            : isEligible
                                            ? 'bg-amber-500 text-slate-950 shadow-2xs shadow-amber-500/30 animate-pulse'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    }`}>
                                        {isClaimed ? <CheckCircle2 size={16} /> : isEligible ? <Sparkles size={15} /> : <Lock size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                                                Level {idx + 1}
                                            </span>
                                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                                {target.title}
                                            </h4>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                            Goal: {goalVal} {getMetricUnit(target).toLowerCase()} • Your Progress: <strong className="text-slate-800 dark:text-slate-200 font-bold">{currentVal}/{goalVal}</strong>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                    {isClaimed ? (
                                        <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black shadow-2xs flex items-center gap-1">
                                            <CheckCircle2 size={12} />
                                            <span>Earned & Claimed</span>
                                        </span>
                                    ) : isEligible ? (
                                        <button
                                            onClick={() => handleClaimClick(target)}
                                            disabled={claimingTargetId === target.id}
                                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-black shadow-md shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            {claimingTargetId === target.id ? (
                                                <Loader2 size={13} className="animate-spin" />
                                            ) : (
                                                <Sparkles size={13} />
                                            )}
                                            <span>Claim Reward</span>
                                        </button>
                                    ) : (
                                        <span className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 text-[11px] font-bold flex items-center gap-1">
                                            <Lock size={11} />
                                            <span>Locked ({Math.max(0, goalVal - currentVal)} left)</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 5. PHYSICAL GIFT FULFILLMENT & DOORSTEP DISPATCH TRACKER */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Truck size={18} className="text-blue-600" />
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            Physical Gift Dispatch & Courier Hub
                        </h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                        InTrust Logistics Central
                    </span>
                </div>

                {claims?.length > 0 ? (
                    <div className="space-y-3.5">
                        {claims.map((claim) => {
                            const isDelivered = claim.status === 'delivered';
                            const isShipped = claim.status === 'shipped' || isDelivered;
                            const isProcessing = claim.status === 'processing' || isShipped;

                            return (
                                <div key={claim.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                                                <Package size={22} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                                    isDelivered 
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        : isShipped 
                                                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                }`}>
                                                    {claim.status.toUpperCase()}
                                                </span>
                                                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1 truncate">
                                                    {claim.gift_title || claim.marketing_targets?.gift_name || 'InTrust Milestone Mystery Box'}
                                                </h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                                                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                                                    title="Copy AWB Tracking Number"
                                                >
                                                    {copiedAwb === claim.tracking_number ? (
                                                        <>
                                                            <Check size={12} className="text-emerald-600" />
                                                            <span>Copied</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={12} />
                                                            <span>Copy AWB</span>
                                                        </>
                                                    )}
                                                </button>
                                                <a
                                                    href={claim.tracking_url || `https://www.google.com/search?q=${encodeURIComponent(claim.courier_name + ' tracking ' + claim.tracking_number)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-2xs"
                                                >
                                                    <span>Track Courier</span>
                                                    <ExternalLink size={11} />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4-Step Visual Logistics Stepper */}
                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center text-[9px] sm:text-[10px] font-extrabold pt-1">
                                        <div className="text-emerald-600">
                                            <div className="w-full h-1.5 rounded-full bg-emerald-500 mb-1.5" />
                                            Target Earned
                                        </div>
                                        <div className={isProcessing ? "text-emerald-600" : "text-slate-400"}>
                                            <div className={`w-full h-1.5 rounded-full mb-1.5 ${isProcessing ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Sealed & Packed
                                        </div>
                                        <div className={isShipped ? "text-blue-600" : "text-slate-400"}>
                                            <div className={`w-full h-1.5 rounded-full mb-1.5 ${isShipped ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Shipped
                                        </div>
                                        <div className={isDelivered ? "text-emerald-600" : "text-slate-400"}>
                                            <div className={`w-full h-1.5 rounded-full mb-1.5 ${isDelivered ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            Delivered
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center flex flex-col items-center justify-center">
                        <TreasureChestVector animated={false} className="w-24 h-24 mb-2 opacity-80" />
                        <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                            No active physical gift shipments yet.
                        </h4>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                            Achieve target milestones or conquer daily challenges. Once earned, sealed mystery boxes and physical rewards are dispatched directly to your doorstep with 100% free courier tracking!
                        </p>
                    </div>
                )}
            </div>

            {/* Modal: Shipping Address for Physical Gifts */}
            <AnimatePresence>
                {shippingModalTarget && (
                    <div 
                        onClick={() => setShippingModalTarget(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
                    >
                        <motion.div
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 cursor-default"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                                        <Package size={22} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                                            Claim Milestone Mystery Gift
                                        </h3>
                                        <p className="text-xs text-slate-400 truncate">
                                            {shippingModalTarget.title} • Free Doorstep Delivery
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShippingModalTarget(null)}
                                    className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3.5">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                        Recipient Full Name
                                    </label>
                                    <div className="relative">
                                        <UserIcon size={14} className="absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="text"
                                            value={shippingForm.recipientName}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, recipientName: e.target.value }))}
                                            placeholder="Full Name"
                                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                        Contact Phone (for Courier SMS & OTP)
                                    </label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={shippingForm.recipientPhone}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                                            placeholder="+91 98765 43210"
                                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                        Delivery Address (with PIN Code)
                                    </label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-3 top-3 text-slate-400" />
                                        <textarea
                                            rows={3}
                                            value={shippingForm.shippingAddress}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, shippingAddress: e.target.value }))}
                                            placeholder="House / Shop No, Street, City, State, PIN Code"
                                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setShippingModalTarget(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => executeClaim(shippingModalTarget, shippingForm)}
                                    disabled={claimingTargetId === shippingModalTarget.id || !shippingForm.shippingAddress.trim()}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                    {claimingTargetId === shippingModalTarget.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                    <span>Confirm & Dispatch</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
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
