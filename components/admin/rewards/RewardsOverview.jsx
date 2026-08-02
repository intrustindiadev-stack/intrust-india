import React from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Activity, Settings } from 'lucide-react';
import { RewardSettingCard } from './RewardSettingCard';

export function RewardsOverview({ config, onNavigate }) {
    const { serverConfig } = config;
    if (!serverConfig) return null;

    // Calculate summary statistics
    const activeEventsCount = Object.values(serverConfig.events || {}).filter(e => e._is_active !== false).length;
    const maxReferralDepth = serverConfig.levelSettings?.max_levels || 5;
    
    // Points per rupee logic
    const pointValue = serverConfig.global?.point_value || {};
    const pointsPerRupee = pointValue.points_per_rupee || 1;
    
    // Redemption mode
    const redemptionMode = serverConfig.global?.redemption_mode || 'instant';
    
    // Daily cap
    const dailyCap = serverConfig.global?.daily_cap || {};
    
    // Global KYC
    const requireKyc = serverConfig.eligibility?.require_kyc;

    return (
        <div className="space-y-6">
            <RewardSettingCard 
                icon={Activity}
                title="System Summary"
                description="Current status of the reward engine"
                iconBgClass="bg-blue-50 dark:bg-blue-900/20"
                iconTextClass="text-blue-600 dark:text-blue-400"
            >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Events</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            {activeEventsCount}
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">LIVE</span>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Referral Depth</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">
                            {maxReferralDepth} <span className="text-sm text-gray-500">levels</span>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Point Value</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">
                            {pointsPerRupee} <span className="text-sm text-gray-500">pts = ₹1</span>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Redemption Mode</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                            {redemptionMode.replace('_', ' ')}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Daily Cap</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {dailyCap.max_points ? `${dailyCap.max_points} pts/user` : 'No Limit'}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Global KYC</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            {requireKyc ? (
                                <><CheckCircle2 size={16} className="text-green-500" /> Required</>
                            ) : (
                                <><div className="w-2 h-2 rounded-full bg-gray-300" /> Optional</>
                            )}
                        </div>
                    </div>
                </div>
            </RewardSettingCard>

            <RewardSettingCard 
                icon={Settings}
                title="How Rewards Flow"
                description="The lifecycle of a reward transaction"
            >
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 py-4 overflow-x-auto hide-scrollbar">
                    
                    <div className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-xl min-w-[150px] shadow-sm relative group cursor-pointer hover:border-violet-300 transition-colors" onClick={() => onNavigate('events')}>
                        <div className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2">1. Action</div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Customer completes a rewarded event (e.g. signup, purchase).</p>
                    </div>
                    
                    <div className="hidden md:block text-gray-300 dark:text-gray-600">
                        <ArrowRight size={24} />
                    </div>

                    <div className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-xl min-w-[150px] shadow-sm relative group cursor-pointer hover:border-red-300 transition-colors" onClick={() => onNavigate('eligibility')}>
                        <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">2. Eligibility</div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">System checks KYC, account age, and active referral minimums.</p>
                    </div>
                    
                    <div className="hidden md:block text-gray-300 dark:text-gray-600">
                        <ArrowRight size={24} />
                    </div>

                    <div className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-xl min-w-[150px] shadow-sm relative group cursor-pointer hover:border-amber-300 transition-colors" onClick={() => onNavigate('tiers')}>
                        <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">3. Multiplier</div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Base points are multiplied by the user's tier bonus (e.g. 1.5x).</p>
                    </div>

                    <div className="hidden md:block text-gray-300 dark:text-gray-600">
                        <ArrowRight size={24} />
                    </div>

                    <div className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-xl min-w-[150px] shadow-sm relative group cursor-pointer hover:border-blue-300 transition-colors" onClick={() => onNavigate('limits')}>
                        <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">4. Limits</div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Points are capped by daily system limits before saving to balance.</p>
                    </div>
                </div>
            </RewardSettingCard>
        </div>
    );
}
