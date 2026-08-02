import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { RewardSettingCard } from './RewardSettingCard';

export function RewardLimitsEditor({ config }) {
    const { draftConfig, updateDraft } = config;

    if (!draftConfig) return null;

    const data = draftConfig.global?.daily_cap || {};

    // Validate non-negative
    const validatePositive = (e) => {
        const val = Number(e.target.value);
        if (val < 0) e.target.value = 0;
    };

    return (
        <RewardSettingCard
            icon={TrendingUp}
            title="Daily Caps"
            description="Prevent abuse by limiting the maximum points a user can earn per day"
            iconBgClass="bg-blue-50 dark:bg-blue-900/20"
            iconTextClass="text-blue-600"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Max Points per Day (per User)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            value={data.max_points === undefined ? '' : data.max_points}
                            onBlur={validatePositive}
                            onChange={(e) => updateDraft('global', ['daily_cap', 'max_points'], e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white font-black text-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                            pts
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Max Rewarded Transactions per Day
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            value={data.max_transactions === undefined ? '' : data.max_transactions}
                            onBlur={validatePositive}
                            onChange={(e) => updateDraft('global', ['daily_cap', 'max_transactions'], e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white font-black text-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                            txns
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Cap Summary</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        A user can earn up to <strong>{data.max_points || 0} points</strong> spread across a maximum of <strong>{data.max_transactions || 0} transactions</strong> each day. 
                        Note: 0 indicates a limit of zero (no earnings allowed), not "unlimited", per current system behavior.
                    </p>
                </div>
            </div>
        </RewardSettingCard>
    );
}
