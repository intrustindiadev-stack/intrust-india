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

/**
 * MarketingAccessGate
 * Renders a gate when regular users are not KYC-verified
 * or merchants do not have an active subscription.
 *
 * @param {Object} props
 * @param {'kyc' | 'subscription'} props.type
 * @param {string} props.status - e.g. 'not_started', 'pending', 'rejected', 'inactive', 'expired'
 * @param {Object} props.user
 * @param {Object} props.profile
 * @param {Object} props.merchant
 */
export default function MarketingAccessGate({ type = 'kyc', status = 'not_started', user, profile, merchant }) {
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
        <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 my-auto overflow-hidden">
            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden my-auto flex flex-col justify-center"
            >
                {/* Background decorative ambient circles */}
                <div className="absolute -top-20 -right-20 w-44 h-44 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Top Icon Badge */}
                    <div className="relative mb-2 sm:mb-3">
                        <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/25">
                            {isKyc ? (
                                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            ) : (
                                <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs border border-slate-100 dark:border-slate-800">
                            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" />
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider mb-2 ${statusConfig.color}`}>
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{statusConfig.label}</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug mb-1.5">
                        {isKyc ? 'Unlock Your Marketing Workspace' : 'Activate Merchant Marketing Suite'}
                    </h1>

                    {/* Description */}
                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed max-w-md mx-auto mb-3.5 sm:mb-4">
                        {statusConfig.desc}
                    </p>

                    {/* Feature Highlights Grid — Always 3-column micro cards */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full mb-4 text-left">
                        {isKyc ? (
                            <>
                                <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-start">
                                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 shrink-0">
                                        <Trophy className="w-3.5 h-3.5" />
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight mb-0.5 truncate">Daily Cash Quiz</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">Win wallet cashbacks daily.</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-start">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 shrink-0">
                                        <Share2 className="w-3.5 h-3.5" />
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight mb-0.5 truncate">Catalog Links</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">Earn cash on product orders.</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-start">
                                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1 shrink-0">
                                        <Gift className="w-3.5 h-3.5" />
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight mb-0.5 truncate">Mystery Gifts</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">Unlock milestone rewards.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-start">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1 shrink-0">
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight mb-0.5 truncate">Catalog Reach</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">Shortlinks for store stock.</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-start">
                                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 shrink-0">
                                        <Crown className="w-3.5 h-3.5" />
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight mb-0.5 truncate">Sponsorship</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">Feature brand to players.</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-start">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 shrink-0">
                                        <BarChart3 className="w-3.5 h-3.5" />
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight mb-0.5 truncate">Attribution</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">Live clicks & conversions.</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action CTAs */}
                    <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 w-full">
                        {isKyc ? (
                            <>
                                <Link
                                    href="/profile/kyc"
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all transform active:scale-95 cursor-pointer whitespace-nowrap"
                                >
                                    <span>{status === 'rejected' ? 'Re-Submit Verification' : 'Complete Verification'}</span>
                                    <ArrowRight size={14} />
                                </Link>
                                <Link
                                    href="/shop"
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap"
                                >
                                    <span>Continue to Store</span>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/merchant/subscription"
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer whitespace-nowrap"
                                >
                                    <span>{status === 'expired' ? 'Renew Plan' : 'Activate Plan'}</span>
                                    <ArrowRight size={14} />
                                </Link>
                                <Link
                                    href="/merchant/dashboard"
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap"
                                >
                                    <span>Merchant Panel</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
