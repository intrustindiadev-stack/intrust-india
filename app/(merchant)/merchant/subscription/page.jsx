'use client';

import { useSubscription } from '@/components/merchant/SubscriptionContext';
import { useMerchant } from '@/hooks/useMerchant';

export default function MerchantSubscriptionPage() {
    const {
        isSubscribed,
        expiresAt,
        subscriptionStatus,
        daysUntilExpiry,
        setShowModal,
        merchantData,
    } = useSubscription();

    const { merchant } = useMerchant();
    const subscriptionMerchant = merchantData || merchant;

    const expiryFormatted = expiresAt
        ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                    Subscription
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Manage your storefront plan and billing cycle
                </p>
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-[#12141d] rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-200/60 dark:border-white/5">
                
                {/* Status Banner */}
                {isSubscribed ? (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="material-icons-round text-emerald-600 dark:text-emerald-400">verified</span>
                            </div>
                            <div>
                                <h3 className="text-emerald-800 dark:text-emerald-400 font-bold text-lg">Active Subscription</h3>
                                <p className="text-emerald-600 dark:text-emerald-500/80 text-sm font-medium">
                                    Your store is live and visible to customers
                                </p>
                            </div>
                        </div>
                        {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                            <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                <span className="material-icons-round text-[18px]">warning</span>
                                Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="material-icons-round text-amber-600 dark:text-amber-400">lock</span>
                            </div>
                            <div>
                                <h3 className="text-amber-800 dark:text-amber-400 font-bold text-lg">Inactive Subscription</h3>
                                <p className="text-amber-600 dark:text-amber-500/80 text-sm font-medium">
                                    Activate your plan to unlock your storefront
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Plan Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-icons-round text-slate-400">info</span>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">Plan Details</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Current Status</span>
                                <span className={`px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg ${
                                    isSubscribed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                                }`}>
                                    {subscriptionStatus || 'Inactive'}
                                </span>
                            </div>

                            {expiresAt && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Valid Until</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{expiryFormatted}</span>
                                </div>
                            )}

                            {subscriptionMerchant?.subscription_payment_ref && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Last Invoice</span>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-white/10 px-2 py-1 rounded-md">
                                        {subscriptionMerchant.subscription_payment_ref}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Features Card */}
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-icons-round text-[#D4AF37]">star</span>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">Pro Features</h3>
                        </div>
                        <ul className="space-y-3">
                            {['Custom storefront URL', 'Manage unlimited products', 'Receive direct customer orders', 'Priority merchant support'].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                                    <span className="material-icons-round text-emerald-500 text-lg">check_circle</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Need more time?</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Renew now to avoid storefront downtime.</p>
                    </div>
                    
                    {subscriptionMerchant ? (
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                            <span className="material-icons-round text-[18px]">
                                {isSubscribed ? 'autorenew' : 'bolt'}
                            </span>
                            {isSubscribed ? 'Extend Plan' : 'Activate Plan'}
                        </button>
                    ) : (
                        <div className="h-12 w-40 bg-slate-100 dark:bg-white/5 animate-pulse rounded-xl" />
                    )}
                </div>
            </div>
        </div>
    );
}
