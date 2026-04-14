'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Loader2, CheckCircle, AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import { MERCHANT_SUBSCRIPTION_PLANS } from '@/lib/constants';

export default function MerchantOpportunityBanner({ merchantStatus, subscriptionStatus, subscriptionExpiresAt }) {
    const isPending = merchantStatus === 'pending';
    const isRejected = merchantStatus === 'rejected';
    const isSuspended = merchantStatus === 'suspended';
    const isApprovedAndPaid = merchantStatus === 'approved' && subscriptionStatus === 'active';
    const isApprovedButUnpaid = merchantStatus === 'approved' && subscriptionStatus !== 'active';

    // Check expiry states for active subscriptions
    const expiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const isExpired = expiresAt && expiresAt < now;
    const isExpiringSoon = expiresAt && !isExpired && expiresAt < sevenDaysFromNow;
    
    const expiryFormatted = expiresAt
        ? expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    // Treat expired as same as unpaid for gating purposes
    const isEffectivelyBlocked = isApprovedButUnpaid || isExpired;

    const getBannerStyles = () => {
        if (isPending) return "from-amber-500 via-orange-500 to-yellow-500";
        if (isRejected || isSuspended) return "from-rose-500 via-red-500 to-orange-500";
        if (isEffectivelyBlocked) return "from-rose-500 via-red-500 to-orange-500";
        if (isExpiringSoon) return "from-amber-500 via-orange-500 to-yellow-500";
        return "from-green-500 via-emerald-500 to-teal-500";
    };

    const getBgStyles = () => {
        if (isPending || isExpiringSoon) return "from-amber-600 to-orange-600";
        if (isRejected || isSuspended || isEffectivelyBlocked) return "from-rose-600 to-red-600";
        return "from-green-600 to-emerald-600";
    };

    const getIcon = () => {
        if (isPending) return <Loader2 size={36} className="text-white animate-spin" />;
        if (isExpired || isEffectivelyBlocked) return <AlertCircle size={36} className="text-white" />;
        if (isExpiringSoon) return <RefreshCw size={36} className="text-white" />;
        if (isApprovedAndPaid) return <CheckCircle size={36} className="text-white" />;
        if (isRejected || isSuspended) return <ShieldAlert size={36} className="text-white" />;
        return <TrendingUp size={36} className="text-white" />;
    };

    const getLabel = () => {
        if (isPending) return "Application Status";
        if (isExpired) return "Subscription Expired";
        if (isEffectivelyBlocked) return "Action Required";
        if (isExpiringSoon) return "Renewal Due Soon";
        if (isApprovedAndPaid) return "Merchant Account";
        if (isRejected) return "Application Rejected";
        if (isSuspended) return "Account Suspended";
        return "Earning Opportunity";
    };

    const getHeading = () => {
        if (isPending) return "Application Under Review";
        if (isExpired) return "Subscription Expired";
        if (isEffectivelyBlocked) return "Payment Required";
        if (isExpiringSoon) return "Renew Before It Expires";
        if (isApprovedAndPaid) return "Merchant Dashboard Ready";
        if (isRejected) return "Application Not Approved";
        if (isSuspended) return "Account Temporarily Suspended";
        return "Become a Merchant & Start Earning";
    };

    const getBody = () => {
        const startingPrice = `₹${MERCHANT_SUBSCRIPTION_PLANS[0].price}`;
        if (isPending) return "We are currently reviewing your merchant application. This usually takes 24-48 hours. We'll notify you once processed!";
        if (isExpired) return `Your monthly subscription expired on ${expiryFormatted}. Renew with plans from ${startingPrice}/month to restore full access to your Merchant Dashboard.`;
        if (isEffectivelyBlocked) return `Your application has been approved! Choose a subscription plan (starting ${startingPrice}/month) to activate your merchant panel.`;
        if (isExpiringSoon) return `Your monthly subscription expires on ${expiryFormatted}. Renew with plans from ${startingPrice}/month to keep your store live without interruption.`;
        if (isApprovedAndPaid) return `Welcome aboard! Your merchant account is active. Next renewal due: ${expiryFormatted}.`;
        if (isRejected) return "Unfortunately, your application was not approved at this time. Please contact support to understand the requirements.";
        if (isSuspended) return "Your merchant account is temporarily suspended. Please check your email or contact support for more information.";
        return "Join 500+ merchants earning ₹50,000+ monthly by reselling gift cards. Get instant approval with verified KYC!";
    };

    const getCtaText = () => {
        if (isPending) return "Review in Progress";
        if (isExpired || isEffectivelyBlocked) return "Pay Now";
        if (isExpiringSoon) return "Renew Now";
        if (isApprovedAndPaid) return "Go to Dashboard";
        if (isRejected) return "Application Rejected";
        if (isSuspended) return "Contact Support";
        return "Apply Now";
    };

    const getCtaHref = () => {
        if (isApprovedAndPaid && !isExpired) return "/merchant/dashboard";
        if (isEffectivelyBlocked || isExpired || isExpiringSoon) return "/merchant-subscribe";
        if (isRejected || isSuspended || isPending) return "#";
        return "/merchant-apply";
    };

    const isCtaDisabled = isPending || isRejected || isSuspended;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getBannerStyles()} p-1 shadow-xl`}
        >
            <div className={`absolute inset-0 bg-gradient-to-r ${getBannerStyles()}/20 animate-pulse`} />

            <div className={`relative bg-gradient-to-br ${getBgStyles()} rounded-xl p-6 sm:p-8`}>
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0 mb-4 lg:mb-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center">
                            {getIcon()}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
                            <Sparkles size={20} className="text-yellow-300" />
                            <span className="text-yellow-300 font-bold text-sm uppercase tracking-wide">
                                {getLabel()}
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            {getHeading()}
                        </h3>
                        <p className="text-white/90 text-sm sm:text-base max-w-2xl mx-auto lg:mx-0">
                            {getBody()}
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0 mt-6 lg:mt-0 w-full lg:w-auto flex justify-center lg:justify-end">
                        <Link
                            href={getCtaHref()}
                            className={`group inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-gray-100 font-bold rounded-xl transition-all shadow-lg hover:shadow-2xl hover:scale-105 w-full sm:w-auto ${isCtaDisabled ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''} ${isPending ? 'text-amber-600' : (isRejected || isSuspended) ? 'text-rose-600' : 'text-green-600'}`}
                        >
                            {getCtaText()}
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-white">500+</div>
                        <div className="text-xs sm:text-sm text-green-100">Active Merchants</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-white">₹50K+</div>
                        <div className="text-xs sm:text-sm text-green-100">Avg. Monthly Earning</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-white">₹{MERCHANT_SUBSCRIPTION_PLANS[0].price}</div>
                        <div className="text-xs sm:text-sm text-green-100">Starting/Month</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
