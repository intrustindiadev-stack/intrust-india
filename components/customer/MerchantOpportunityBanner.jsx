'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Loader2, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';

export default function MerchantOpportunityBanner({ merchantStatus }) {
    const isPending = merchantStatus === 'pending';
    const isApproved = merchantStatus === 'approved';
    const isRejected = merchantStatus === 'rejected';
    const isSuspended = merchantStatus === 'suspended';

    // Different styles based on status
    const getBannerStyles = () => {
        if (isPending) return "from-amber-500 via-orange-500 to-yellow-500";
        if (isRejected || isSuspended) return "from-rose-500 via-red-500 to-orange-500";
        return "from-green-500 via-emerald-500 to-teal-500";
    };

    const getBgStyles = () => {
        if (isPending) return "from-amber-600 to-orange-600";
        if (isRejected || isSuspended) return "from-rose-600 to-red-600";
        return "from-green-600 to-emerald-600";
    };
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getBannerStyles()} p-1 shadow-xl`}
        >
            {/* Animated background effect */}
            <div className={`absolute inset-0 bg-gradient-to-r ${getBannerStyles()}/20 animate-pulse`} />

            <div className={`relative bg-gradient-to-br ${getBgStyles()} rounded-xl p-6 sm:p-8`}>
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0 mb-4 lg:mb-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center">
                            {isPending ? <Loader2 size={36} className="text-white animate-spin" /> :
                             isApproved ? <CheckCircle size={36} className="text-white" /> :
                             (isRejected || isSuspended) ? <ShieldAlert size={36} className="text-white" /> :
                             <TrendingUp size={36} className="text-white" />}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
                            <Sparkles size={20} className="text-yellow-300" />
                            <span className="text-yellow-300 font-bold text-sm uppercase tracking-wide">
                                {isPending ? "Application Status" :
                                 isApproved ? "Merchant Account" :
                                 isRejected ? "Application Rejected" :
                                 isSuspended ? "Account Suspended" :
                                 "Earning Opportunity"}
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            {isPending ? "Application Under Review" :
                             isApproved ? "Merchant Dashboard Ready" :
                             isRejected ? "Application Not Approved" :
                             isSuspended ? "Account Temporarily Suspended" :
                             "Become a Merchant & Start Earning"}
                        </h3>
                        <p className="text-white/90 text-sm sm:text-base max-w-2xl mx-auto lg:mx-0">
                            {isPending ? "We are currently reviewing your merchant application. This usually takes 24-48 hours. We'll notify you once processed!" :
                             isApproved ? "Welcome aboard! Your merchant account is fully active. You can now start listing gift cards and managing your business." :
                             isRejected ? "Unfortunately, your application was not approved at this time. Please contact support to understand the requirements." :
                             isSuspended ? "Your merchant account is temporarily suspended. Please check your email or contact support for more information." :
                             "Join 500+ merchants earning ₹50,000+ monthly by reselling gift cards. Get instant approval with verified KYC!"}
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0 mt-6 lg:mt-0 w-full lg:w-auto flex justify-center lg:justify-end">
                        <Link
                            href={isApproved ? "/merchant/dashboard" : (isRejected || isSuspended || isPending) ? "#" : "/merchant-apply"}
                            className={`group inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-gray-100 font-bold rounded-xl transition-all shadow-lg hover:shadow-2xl hover:scale-105 w-full sm:w-auto ${isPending || isRejected || isSuspended ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''} ${isPending ? 'text-amber-600' : (isRejected || isSuspended) ? 'text-rose-600' : 'text-green-600'}`}
                        >
                            {isPending ? "Review in Progress" :
                             isApproved ? "Go to Dashboard" :
                             isRejected ? "Application Rejected" :
                             isSuspended ? "Contact Support" :
                             "Apply Now"}
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
                        <div className="text-2xl sm:text-3xl font-bold text-white">Instant</div>
                        <div className="text-xs sm:text-sm text-green-100">Approval</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
