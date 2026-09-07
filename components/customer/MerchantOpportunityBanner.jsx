'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Store,
    ArrowRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShieldCheck,
    ShieldAlert,
    Zap,
    MapPin,
    ExternalLink,
    Building2
} from 'lucide-react';
import Link from 'next/link';
import { MERCHANT_SUBSCRIPTION_PLANS } from '@/lib/constants';

function MerchantOpportunityBanner({
    merchantStatus,
    subscriptionStatus,
    subscriptionExpiresAt,
    startingPriceRupees
}) {
    const startingPrice = `₹${startingPriceRupees ?? MERCHANT_SUBSCRIPTION_PLANS[0]?.price ?? 499}`;
    const isPending = merchantStatus === 'pending';
    const isRejected = merchantStatus === 'rejected';
    const isSuspended = merchantStatus === 'suspended';
    const isApprovedAndPaid = merchantStatus === 'approved' && subscriptionStatus === 'active';
    const isApprovedButUnpaid = merchantStatus === 'approved' && subscriptionStatus !== 'active';

    // Expiry verification
    const expiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const isExpired = expiresAt && expiresAt < now;
    const isExpiringSoon = expiresAt && !isExpired && expiresAt < sevenDaysFromNow;

    const expiryFormatted = expiresAt
        ? expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    const isEffectivelyBlocked = isApprovedButUnpaid || isExpired;

    // Badges and status configs
    const getStatusConfig = () => {
        if (isPending) {
            return {
                badgeIcon: <Clock size={14} className="text-amber-500 animate-spin" />,
                badgeText: 'Application In Review',
                badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                title: 'Merchant Application Under Verification',
                description: "We are verifying your store details and business KYC. Verification is typically completed within 24 to 48 hours.",
                ctaText: 'Verification In Progress',
                ctaHref: '#',
                disabled: true
            };
        }
        if (isApprovedAndPaid && !isExpired) {
            return {
                badgeIcon: <ShieldCheck size={14} className="text-emerald-500" />,
                badgeText: 'Verified InTrust Partner',
                badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                title: 'Your Merchant Store is Live',
                description: `Manage your retail catalog, fulfill store pickup orders, and review store earnings. Next cycle: ${expiryFormatted || 'Active'}.`,
                ctaText: 'Merchant Dashboard',
                ctaHref: '/merchant/dashboard',
                disabled: false
            };
        }
        if (isEffectivelyBlocked) {
            return {
                badgeIcon: <AlertCircle size={14} className="text-rose-500" />,
                badgeText: isExpired ? 'Subscription Expired' : 'Action Required',
                badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                title: isExpired ? 'Merchant Subscription Expired' : 'Activate Your Merchant Store',
                description: `Choose a subscription plan starting at ${startingPrice}/month to unlock your live storefront and merchant tools.`,
                ctaText: isExpired ? 'Renew Storefront' : 'Choose Plan & Activate',
                ctaHref: '/merchant-subscribe',
                disabled: false
            };
        }
        if (isExpiringSoon) {
            return {
                badgeIcon: <Clock size={14} className="text-amber-500" />,
                badgeText: 'Renewal Due Soon',
                badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                title: 'Store Subscription Renews Soon',
                description: `Your storefront subscription expires on ${expiryFormatted}. Renew early starting at ${startingPrice}/month to avoid interruption.`,
                ctaText: 'Renew Subscription',
                ctaHref: '/merchant-subscribe',
                disabled: false
            };
        }
        if (isRejected || isSuspended) {
            return {
                badgeIcon: <ShieldAlert size={14} className="text-rose-500" />,
                badgeText: isRejected ? 'Application Not Approved' : 'Store Suspended',
                badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                title: isRejected ? 'Merchant Application Update' : 'Account Temporarily On Hold',
                description: 'Please reach out to InTrust partner operations support to review the required documentation.',
                ctaText: 'Contact Support',
                ctaHref: 'mailto:support@intrustindia.com',
                disabled: false
            };
        }

        // Default: Clean Opportunity Banner for Customer Dashboard
        return {
            badgeIcon: <Store size={14} className="text-primary" />,
            badgeText: 'Merchant Partner Program',
            badgeClass: 'bg-blue-500/10 text-primary border-blue-500/20',
            title: 'Own a Local Business? Partner With InTrust',
            description: 'List your retail products, accept direct digital payments, and connect with verified local customers with fast store pickups.',
            ctaText: 'Register Your Shop',
            ctaHref: '/merchant-apply',
            disabled: false
        };
    };

    const config = getStatusConfig();
    const isDefaultOpportunity = !merchantStatus && !subscriptionStatus;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative w-full rounded-2xl sm:rounded-3xl border border-outline-variant/30 bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low dark:from-surface-container-lowest dark:via-surface-container-low/40 dark:to-surface-container-lowest p-6 sm:p-7 shadow-xs overflow-hidden"
        >
            {/* Ambient background blur elements */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left Side: Status Info */}
                <div className="space-y-3 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.badgeClass}`}>
                            {config.badgeIcon}
                            <span>{config.badgeText}</span>
                        </span>
                        {isDefaultOpportunity && (
                            <span className="text-[11px] font-bold text-on-surface-variant/80 uppercase tracking-wider">
                                Pan-India Merchant Network
                            </span>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg sm:text-xl font-black text-on-surface tracking-tight">
                            {config.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-1 leading-relaxed">
                            {config.description}
                        </p>
                    </div>

                    {isDefaultOpportunity && (
                        <div className="pt-1 flex items-center gap-4 sm:gap-6 flex-wrap text-xs font-bold text-on-surface">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                <span>Zero Onboarding Fees</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Zap size={14} className="text-blue-500 shrink-0" />
                                <span>Fast Local Pickup Network</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-amber-500 shrink-0" />
                                <span>Digital & Local Storefront</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: CTA Button */}
                <div className="shrink-0 flex items-center lg:justify-end">
                    {config.disabled ? (
                        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-xs border border-outline-variant/30 select-none">
                            <Clock size={15} className="animate-spin text-amber-500" />
                            <span>{config.ctaText}</span>
                        </div>
                    ) : (
                        <Link
                            href={config.ctaHref}
                            className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <span>{config.ctaText}</span>
                            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default React.memo(MerchantOpportunityBanner);
