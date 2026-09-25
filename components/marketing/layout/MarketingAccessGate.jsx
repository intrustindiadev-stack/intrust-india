'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
    ShieldCheck, 
    ShieldAlert, 
    Clock, 
    Sparkles, 
    Trophy, 
    Gift, 
    Store, 
    ArrowRight, 
    ExternalLink, 
    CheckCircle2, 
    ShoppingBag,
    Crown,
    Share2,
    BarChart3
} from 'lucide-react';
import MarketingComingSoon from '@/components/marketing/coming-soon/MarketingComingSoon';

/**
 * MarketingAccessGate
 * Renders a gate when regular users are not KYC-verified,
 * merchants do not have an active subscription, or feature is coming soon.
 *
 * @param {Object} props
 * @param {'kyc' | 'subscription' | 'coming_soon'} props.type
 * @param {string} props.status - e.g. 'not_started', 'pending', 'rejected', 'inactive', 'expired'
 * @param {Object} props.user
 * @param {Object} props.profile
 * @param {Object} props.merchant
 */
export default function MarketingAccessGate({ type = 'kyc', status = 'not_started', user, profile, merchant }) {
    if (type === 'coming_soon') {
        return <MarketingComingSoon user={user} profile={profile} isMerchant={profile?.role === 'merchant'} />;
    }

    const isKyc = type === 'kyc';

    // Status visual mapping for KYC
    const getKycStatusConfig = () => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Verification Under Review',
                    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
                    icon: Clock,
                    desc: 'Your identity documents have been submitted and are currently being reviewed by our verification team. Access will automatically unlock as soon as your account is approved.'
                };
            case 'rejected':
                return {
                    label: 'Verification Incomplete / Rejected',
                    color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
                    icon: ShieldAlert,
                    desc: 'Your previous verification documents could not be approved. Please review the feedback and re-submit valid government-issued identity documents to unlock marketing rewards.'
                };
            default:
                return {
                    label: 'Identity Verification Required',
                    color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
                    icon: ShieldCheck,
                    desc: 'To participate in marketing campaigns, earn instant wallet cashbacks, play the daily challenge, and claim milestone rewards, please complete your InTrust identity verification.'
                };
        }
    };

    // Status visual mapping for Merchant Subscription
    const getSubscriptionStatusConfig = () => {
        switch (status) {
            case 'expired':
                return {
                    label: 'Subscription Expired',
                    color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
                    icon: Crown,
                    desc: 'Your merchant subscription has expired. Renew your plan to restore full access to marketing campaigns, product sharing tools, and daily challenge sponsorships.'
                };
            case 'pending':
                return {
                    label: 'Merchant Application Pending Review',
                    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
                    icon: Clock,
                    desc: 'Your merchant application is under review. Once approved and activated, you will have complete access to the marketing suite and sponsorship channels.'
                };
            default:
                return {
                    label: 'Active Subscription Required',
                    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    icon: Crown,
                    desc: 'The InTrust Marketing Workspace is an exclusive growth suite for active verified merchants. Activate a plan to unlock viral product links, sponsorship calendar, and multi-channel attribution.'
                };
        }
    };

    const statusConfig = isKyc ? getKycStatusConfig() : getSubscriptionStatusConfig();
    const StatusIcon = statusConfig.icon;

    return (
        <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden"
            >
                {/* Background decorative ambient circles */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Top Icon Badge */}
                    <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                            {isKyc ? (
                                <ShieldCheck className="w-10 h-10 text-white" />
                            ) : (
                                <Store className="w-10 h-10 text-white" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-md">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider mb-4 ${statusConfig.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.label}
                    </div>

                    {/* Headline */}
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                        {isKyc ? 'Unlock Your Marketing Workspace' : 'Activate Merchant Marketing Suite'}
                    </h1>

                    {/* Description */}
                    <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mb-8">
                        {statusConfig.desc}
                    </p>

                    {/* Feature Highlights Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8 text-left">
                        {isKyc ? (
                            <>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
                                        <Trophy className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Daily Cash Quiz</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Win cashbacks credited straight to your InTrust wallet.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                                        <Share2 className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Catalog Share Links</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Earn direct product cashbacks when friends buy from your shared catalog links.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5">
                                        <Gift className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Mystery Gifts</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Hit milestone targets to receive real gifts delivered to you.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                                        <ShoppingBag className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Catalog Promotion</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Generate tracked shortlinks for your store inventory.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
                                        <Crown className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Quiz Sponsorship</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Feature your brand and 4 products in front of daily quiz players.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                                        <BarChart3 className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Live Attribution</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Track traffic, orders, and customer acquisitions in real-time.</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action CTAs */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        {isKyc ? (
                            <>
                                <Link
                                    href="/profile/kyc"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
                                >
                                    <span>{status === 'rejected' ? 'Re-Submit Verification' : 'Complete Verification'}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/shop"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all"
                                >
                                    <span>Continue to Store</span>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/merchant/subscription"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
                                >
                                    <span>{status === 'expired' ? 'Renew Merchant Subscription' : 'Activate Merchant Subscription'}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/merchant/dashboard"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all"
                                >
                                    <span>Back to Merchant Panel</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
