import React from 'react';
import { Shield, UserCheck, AlertTriangle } from 'lucide-react';
import { RewardSettingCard } from './RewardSettingCard';

const ELIGIBILITY_EVENTS = [
    { key: 'signup', label: 'Signup' },
    { key: 'purchase', label: 'Purchase' },
    { key: 'kyc_complete', label: 'KYC Complete' },
    { key: 'merchant_onboard', label: 'Merchant Onboard' },
    { key: 'subscription_renewal', label: 'Subscription Renewal' },
    { key: 'daily_login', label: 'Daily Login' },
    { key: 'wallet_topup', label: 'Wallet Top-up' }
];

export function RewardEligibilityEditor({ config }) {
    const { draftConfig, updateDraft } = config;

    if (!draftConfig) return null;

    const data = draftConfig.eligibility || {};

    return (
        <div className="space-y-6">
            <RewardSettingCard
                icon={Shield}
                title="Global Eligibility"
                description="Minimum requirements for users to earn any rewards"
                iconBgClass="bg-red-50 dark:bg-red-900/20"
                iconTextClass="text-red-600"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Minimum Account Age (Days)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={data.min_account_age_days === undefined ? '' : data.min_account_age_days}
                            onChange={(e) => updateDraft('eligibility', 'min_account_age_days', e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Minimum Direct Referrals Required
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={data.min_direct_referrals_for_earnings === undefined ? '' : data.min_direct_referrals_for_earnings}
                            onChange={(e) => updateDraft('eligibility', 'min_direct_referrals_for_earnings', e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <UserCheck size={18} className="text-emerald-500" />
                            Global KYC Requirement
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                            When enabled, users must be KYC verified to receive rewards, unless overridden by an event rule below.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateDraft('eligibility', 'require_kyc', !data.require_kyc)}
                        role="switch"
                        aria-checked={data.require_kyc}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${data.require_kyc ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.require_kyc ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </RewardSettingCard>

            <RewardSettingCard
                icon={AlertTriangle}
                title="Event KYC Overrides"
                description="Override the global KYC rule for specific events"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ELIGIBILITY_EVENTS.map(event => {
                        const rule = data.events?.[event.key] || {};
                        return (
                            <div key={event.key} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:border-violet-300 transition-colors">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-4">{event.label}</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Direct Recipient</span>
                                        <button
                                            type="button"
                                            onClick={() => updateDraft('eligibility', ['events', event.key, 'direct_require_kyc'], !rule.direct_require_kyc)}
                                            role="switch"
                                            aria-checked={rule.direct_require_kyc}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${rule.direct_require_kyc ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rule.direct_require_kyc ? 'translate-x-4' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Upline Receivers</span>
                                        <button
                                            type="button"
                                            onClick={() => updateDraft('eligibility', ['events', event.key, 'upline_require_kyc'], !rule.upline_require_kyc)}
                                            role="switch"
                                            aria-checked={rule.upline_require_kyc}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${rule.upline_require_kyc ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rule.upline_require_kyc ? 'translate-x-4' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </RewardSettingCard>
        </div>
    );
}
