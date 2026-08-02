import React from 'react';
import { Trophy, ChevronDown } from 'lucide-react';
import { RewardSettingCard } from './RewardSettingCard';

const TIERS = [
    { key: 'tier_bronze', name: 'Bronze', emoji: '🥉', color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-900/30' },
    { key: 'tier_silver', name: 'Silver', emoji: '🥈', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700' },
    { key: 'tier_gold', name: 'Gold', emoji: '🥇', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-900/30' },
    { key: 'tier_platinum', name: 'Platinum', emoji: '💎', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-900/30' }
];

export function RewardTierEditor({ config }) {
    const { draftConfig, updateDraft, fieldErrors } = config;

    if (!draftConfig) return null;

    const validatePositive = (e, min = 0) => {
        const val = Number(e.target.value);
        if (val < min) {
            e.target.value = min;
        }
    };

    return (
        <RewardSettingCard
            icon={Trophy}
            title="Referral & Tiers"
            description="Set requirements and multipliers for user tiers"
            iconBgClass="bg-amber-50 dark:bg-amber-900/20"
            iconTextClass="text-amber-600"
        >
            <div className="space-y-4">
                {TIERS.map((tier, index) => {
                    const data = draftConfig.tiers[tier.key] || {};
                    const isFirst = index === 0;

                    return (
                        <div key={tier.key} className={`relative rounded-2xl p-4 sm:p-6 border ${tier.border} ${tier.bg} transition-colors`}>
                            {/* Progression Connector */}
                            {!isFirst && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center z-10 shadow-sm hidden sm:flex">
                                    <ChevronDown size={14} className="text-gray-400" />
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* Tier Info */}
                                <div className="w-full md:w-1/4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{tier.emoji}</span>
                                        <h3 className={`font-black text-lg ${tier.color}`}>{tier.name}</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {data.bonus_multiplier}x Reward Multiplier
                                    </p>
                                </div>

                                {/* Inputs */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Min Tree Size
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.min_tree_size === undefined ? '' : data.min_tree_size}
                                            onBlur={(e) => validatePositive(e, 0)}
                                            onChange={(e) => updateDraft('tiers', [tier.key, 'min_tree_size'], e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl border border-white/50 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Min Referrals
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.min_active_referrals === undefined ? '' : data.min_active_referrals}
                                            onBlur={(e) => validatePositive(e, 0)}
                                            onChange={(e) => updateDraft('tiers', [tier.key, 'min_active_referrals'], e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl border border-white/50 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Multiplier
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.1"
                                                value={data.bonus_multiplier === undefined ? '' : data.bonus_multiplier}
                                                onBlur={(e) => validatePositive(e, 0.1)}
                                                onChange={(e) => updateDraft('tiers', [tier.key, 'bonus_multiplier'], e.target.value === '' ? 1 : Number(e.target.value))}
                                                className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm pr-8 ${data.bonus_multiplier <= 0 ? 'border-red-500' : 'border-white/50 dark:border-gray-700'}`}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                                                x
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Practical Example */}
                            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Example:</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    100 base points becomes <strong className={tier.color}>{Math.round(100 * (data.bonus_multiplier || 1))} pts</strong>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </RewardSettingCard>
    );
}
