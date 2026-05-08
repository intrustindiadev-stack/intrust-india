'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Save, Trophy, Layers, Gift,
    TrendingUp, Shield, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import toast from 'react-hot-toast';

// Canonical keys match what calculate_and_distribute_rewards() reads in SQL:
// tier: 'tier_bronze', 'tier_silver', 'tier_gold', 'tier_platinum'
// event: 'signup_reward', 'purchase_reward', 'kyc_complete_reward', etc.
const defaultTierState = {
    tier_bronze: { min_tree_size: 0, min_active_referrals: 0, bonus_multiplier: 1 },
    tier_silver: { min_tree_size: 0, min_active_referrals: 0, bonus_multiplier: 1.2 },
    tier_gold: { min_tree_size: 0, min_active_referrals: 0, bonus_multiplier: 1.5 },
    tier_platinum: { min_tree_size: 0, min_active_referrals: 0, bonus_multiplier: 2.0 }
};
const defaultEventState = {
    signup_reward: { direct: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
    purchase_reward: { rate_per_100rs: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
    kyc_complete_reward: { direct: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
    merchant_onboard_reward: { direct: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
    subscription_renewal_reward: { direct: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
    daily_login_reward: { direct: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 }
};
const defaultGlobalState = {
    daily_cap: { max_points: 0, max_transactions: 0 },
    point_value: { points_per_rupee: 0, min_withdrawal_points: 0 },
    redemption_mode: 'instant'
};
// level_settings is stored in DB for informational purposes but is NOT read by
// calculate_and_distribute_rewards() — level payouts are embedded per-event row.
const defaultLevelState = {
    level_settings: { max_levels: 5, levels: { L1: { percentage: 0 }, L2: { percentage: 0 }, L3: { percentage: 0 }, L4: { percentage: 0 }, L5: { percentage: 0 }, L6: { percentage: 0 }, L7: { percentage: 0 } } }
};
const defaultEligibilityState = {
    eligibility: {
        require_kyc: true,
        min_account_age_days: 0,
        min_direct_referrals_for_earnings: 0,
        events: {
            signup: { direct_require_kyc: false, upline_require_kyc: true },
            daily_login: { direct_require_kyc: false, upline_require_kyc: true },
            purchase: { direct_require_kyc: true, upline_require_kyc: true },
            kyc_complete: { direct_require_kyc: false, upline_require_kyc: true },
            merchant_onboard: { direct_require_kyc: true, upline_require_kyc: true },
            subscription_renewal: { direct_require_kyc: true, upline_require_kyc: true }
        }
    }
};

const eligibilityEvents = [
    { key: 'signup', label: 'Signup' },
    { key: 'daily_login', label: 'Daily login' },
    { key: 'purchase', label: 'Purchase' },
    { key: 'kyc_complete', label: 'KYC complete' },
    { key: 'merchant_onboard', label: 'Merchant onboard' },
    { key: 'subscription_renewal', label: 'Subscription renewal' }
];

export default function AdminRewardsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState([]);

    const [tierState, setTierState] = useState(defaultTierState);
    const [eventState, setEventState] = useState(defaultEventState);
    const [globalState, setGlobalState] = useState(defaultGlobalState);
    const [levelState, setLevelState] = useState(defaultLevelState);
    const [eligibilityState, setEligibilityState] = useState(defaultEligibilityState);

    const [sectionSaving, setSectionSaving] = useState({ tier: false, event: false, global: false, level: false, eligibility: false });

    const initStateFromConfigs = useCallback((fetchedConfigs) => {
        const nextTierState = JSON.parse(JSON.stringify(defaultTierState));
        const nextEventState = JSON.parse(JSON.stringify(defaultEventState));
        const nextGlobalState = JSON.parse(JSON.stringify(defaultGlobalState));
        const nextLevelState = JSON.parse(JSON.stringify(defaultLevelState));
        const nextEligibilityState = JSON.parse(JSON.stringify(defaultEligibilityState));

        fetchedConfigs.forEach(c => {
            const { config_type, config_key, config_value } = c;
            // config_key must match canonical SQL keys (tier_bronze, signup_reward, etc.)
            if (config_type === 'tier' && nextTierState[config_key]) {
                nextTierState[config_key] = { ...nextTierState[config_key], ...config_value };
            } else if (config_type === 'event' && nextEventState[config_key]) {
                nextEventState[config_key] = { ...nextEventState[config_key], ...config_value };
            } else if (config_type === 'global') {
                if (config_key === 'redemption_mode') {
                    nextGlobalState.redemption_mode = typeof config_value === 'string' ? config_value.replace(/^"|"$/g, '') : config_value;
                } else if (nextGlobalState[config_key]) {
                    nextGlobalState[config_key] = { ...nextGlobalState[config_key], ...config_value };
                }
            } else if (config_type === 'level' && nextLevelState[config_key]) {
                nextLevelState[config_key] = { ...nextLevelState[config_key], ...config_value };
            } else if (config_type === 'eligibility' && nextEligibilityState[config_key]) {
                nextEligibilityState[config_key] = {
                    ...nextEligibilityState[config_key],
                    ...config_value,
                    events: {
                        ...nextEligibilityState[config_key].events,
                        ...(config_value?.events || {})
                    }
                };
            }
        });

        setTierState(nextTierState);
        setEventState(nextEventState);
        setGlobalState(nextGlobalState);
        setLevelState(nextLevelState);
        setEligibilityState(nextEligibilityState);
    }, []);

    const fetchConfigs = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/rewards/config');
            const data = await response.json();
            if (data.configs) {
                setConfigs(data.configs);
                initStateFromConfigs(data.configs);
            }
        } catch (err) {
            console.error('Error fetching configs:', err);
            toast.error('Failed to load reward configuration');
        } finally {
            setLoading(false);
        }
    }, [initStateFromConfigs]);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    const saveSection = async (configType, keysAndValues) => {
        setSectionSaving(prev => ({ ...prev, [configType]: true }));
        try {
            const promises = keysAndValues.map(kv => {
                const originalConfig = configs.find(c => c.config_key === kv.config_key) || {};
                return fetch('/api/admin/rewards/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        config_key: kv.config_key,
                        config_value: kv.config_value,
                        config_type: configType,
                        description: originalConfig.description || '',
                        is_active: true,
                        admin_user_id: user?.id
                    })
                }).then(res => res.json());
            });

            const results = await Promise.all(promises);
            const allSuccess = results.every(r => r.success);

            if (allSuccess) {
                toast.success(`${configType.charAt(0).toUpperCase() + configType.slice(1)} settings saved`);
                await fetchConfigs();
            } else {
                const errors = results.filter(r => !r.success).map(r => r.error).join(', ');
                toast.error(`Failed to save: ${errors}`);
            }
        } catch (err) {
            console.error(`Error saving ${configType}:`, err);
            toast.error(`Failed to save settings`);
        } finally {
            setSectionSaving(prev => ({ ...prev, [configType]: false }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Settings size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                                Reward System Settings
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Configure Intrust Reward Points — levels, events, tiers, and limits
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Section 1 — 🏆 Tier Configuration */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                                <Trophy size={18} className="text-amber-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-white">Tier Configuration</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Set requirements and multipliers per tier</p>
                            </div>
                        </div>
                        <button
                            onClick={() => saveSection('tier', [
                                { config_key: 'tier_bronze', config_value: tierState.tier_bronze },
                                { config_key: 'tier_silver', config_value: tierState.tier_silver },
                                { config_key: 'tier_gold', config_value: tierState.tier_gold },
                                { config_key: 'tier_platinum', config_value: tierState.tier_platinum }
                            ])}
                            disabled={sectionSaving.tier}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {sectionSaving.tier ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-4 px-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Tier</div>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Min Tree Size</div>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Min Direct Referrals</div>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Bonus Multiplier</div>
                        </div>
                        {[
                            { key: 'tier_bronze', label: 'Bronze 🥉', bgClass: 'bg-amber-50 dark:bg-amber-900/20' },
                            { key: 'tier_silver', label: 'Silver 🥈', bgClass: 'bg-slate-100 dark:bg-slate-800' },
                            { key: 'tier_gold', label: 'Gold 🥇', bgClass: 'bg-yellow-50 dark:bg-yellow-900/20' },
                            { key: 'tier_platinum', label: 'Platinum 💎', bgClass: 'bg-violet-50 dark:bg-violet-900/20' }
                        ].map(tier => (
                            <div key={tier.key} className={`grid grid-cols-[100px_1fr_1fr_1fr] gap-4 p-4 rounded-xl items-center ${tier.bgClass}`}>
                                <div className="font-bold text-gray-900 dark:text-white capitalize">{tier.label}</div>
                                <input
                                    type="number"
                                    value={tierState[tier.key]?.min_tree_size ?? 0}
                                    onChange={e => setTierState(prev => ({ ...prev, [tier.key]: { ...prev[tier.key], min_tree_size: Number(e.target.value) } }))}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                                />
                                <input
                                    type="number"
                                    value={tierState[tier.key]?.min_active_referrals ?? 0}
                                    onChange={e => setTierState(prev => ({ ...prev, [tier.key]: { ...prev[tier.key], min_active_referrals: Number(e.target.value) } }))}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                                />
                                <input
                                    type="number" step="0.1"
                                    value={tierState[tier.key]?.bonus_multiplier ?? 1}
                                    onChange={e => setTierState(prev => ({ ...prev, [tier.key]: { ...prev[tier.key], bonus_multiplier: Number(e.target.value) } }))}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                                />
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Section 2 — 🎁 Event Rewards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <Gift size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-white">Event Rewards</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Set base points per event</p>
                            </div>
                        </div>
                        <button
                            onClick={() => saveSection('event', [
                                { config_key: 'signup_reward', config_value: eventState.signup_reward },
                                { config_key: 'purchase_reward', config_value: eventState.purchase_reward },
                                { config_key: 'kyc_complete_reward', config_value: eventState.kyc_complete_reward },
                                { config_key: 'merchant_onboard_reward', config_value: eventState.merchant_onboard_reward },
                                { config_key: 'subscription_renewal_reward', config_value: eventState.subscription_renewal_reward },
                                { config_key: 'daily_login_reward', config_value: eventState.daily_login_reward }
                            ])}
                            disabled={sectionSaving.event}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {sectionSaving.event ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {['signup_reward', 'purchase_reward', 'kyc_complete_reward', 'merchant_onboard_reward', 'subscription_renewal_reward', 'daily_login_reward'].map(eventName => {
                            const isPurchase = eventName === 'purchase_reward';
                            const firstKey = isPurchase ? 'rate_per_100rs' : 'direct';
                            const firstLabel = isPurchase ? 'Rate/₹100' : 'Direct';
                            return (
                                <div key={eventName} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white capitalize mb-4">
                                        {eventName.replace(/_reward$/, '').replace(/_/g, ' ')}
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { key: firstKey, label: firstLabel },
                                            { key: 'L1', label: 'L1' },
                                            { key: 'L2', label: 'L2' },
                                            { key: 'L3', label: 'L3' },
                                            { key: 'L4', label: 'L4' },
                                            { key: 'L5', label: 'L5' }
                                        ].map(field => (
                                            <div key={field.key} className="flex-1 min-w-[60px]">
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{field.label}</label>
                                                <input
                                                    type="number"
                                                    value={eventState[eventName]?.[field.key] ?? 0}
                                                    onChange={e => setEventState(prev => ({
                                                        ...prev,
                                                        [eventName]: { ...prev[eventName], [field.key]: Number(e.target.value) }
                                                    }))}
                                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Section 3 — 📊 Global Limits */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                                <TrendingUp size={18} className="text-violet-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-white">Global Limits</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">System-wide points value and caps</p>
                            </div>
                        </div>
                        <button
                            onClick={() => saveSection('global', [
                                { config_key: 'daily_cap', config_value: globalState.daily_cap },
                                { config_key: 'point_value', config_value: globalState.point_value },
                                { config_key: 'redemption_mode', config_value: globalState.redemption_mode }
                            ])}
                            disabled={sectionSaving.global}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {sectionSaving.global ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max points per day</label>
                            <input
                                type="number"
                                value={globalState.daily_cap?.max_points ?? 0}
                                onChange={e => setGlobalState(prev => ({
                                    ...prev,
                                    daily_cap: { ...prev.daily_cap, max_points: Number(e.target.value) }
                                }))}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max transactions per day</label>
                            <input
                                type="number"
                                value={globalState.daily_cap?.max_transactions ?? 0}
                                onChange={e => setGlobalState(prev => ({
                                    ...prev,
                                    daily_cap: { ...prev.daily_cap, max_transactions: Number(e.target.value) }
                                }))}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Points per ₹1</label>
                            <input
                                type="number"
                                value={globalState.point_value?.points_per_rupee ?? 0}
                                onChange={e => setGlobalState(prev => ({
                                    ...prev,
                                    point_value: { ...prev.point_value, points_per_rupee: Number(e.target.value) }
                                }))}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min withdrawal (pts)</label>
                            <input
                                type="number"
                                value={globalState.point_value?.min_withdrawal_points ?? 0}
                                onChange={e => setGlobalState(prev => ({
                                    ...prev,
                                    point_value: { ...prev.point_value, min_withdrawal_points: Number(e.target.value) }
                                }))}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                            />
                        </div>
                        <div className="col-span-full border-t border-gray-100 dark:border-gray-700 pt-6">
                            <div className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Redemption Approval</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        {globalState.redemption_mode === 'approval_required' 
                                            ? 'Manual: Admin must approve each point-to-wallet request.' 
                                            : 'Instant: Points are converted to wallet cash automatically.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setGlobalState(prev => ({
                                        ...prev,
                                        redemption_mode: prev.redemption_mode === 'approval_required' ? 'instant' : 'approval_required'
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalState.redemption_mode === 'approval_required' ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalState.redemption_mode === 'approval_required' ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Section 4 — 🔢 Level Settings */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                <Layers size={18} className="text-blue-600" />
                            </div>
                            <div>
                                        <h2 className="font-bold text-gray-900 dark:text-white">Level Settings</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Reference only — per-event L1–L5 payouts are configured in Event Rewards above</p>
                            </div>
                        </div>
                        <button
                            onClick={() => saveSection('level', [
                                { config_key: 'level_settings', config_value: levelState.level_settings }
                            ])}
                            disabled={sectionSaving.level}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {sectionSaving.level ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Levels (1-7)</label>
                            <input
                                type="number" min="1" max="7"
                                value={levelState.level_settings?.max_levels ?? 0}
                                onChange={e => setLevelState(prev => ({
                                    ...prev,
                                    level_settings: { ...prev.level_settings, max_levels: Number(e.target.value) }
                                }))}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full max-w-[200px]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level Default Percentages (%)</label>
                            <div className="flex flex-wrap gap-4">
                                {['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].map(level => (
                                    <div key={level} className="flex-1 min-w-[80px]">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{level} %</label>
                                        <input
                                            type="number" step="0.1"
                                            value={levelState.level_settings?.levels?.[level]?.percentage ?? 0}
                                            onChange={e => setLevelState(prev => ({
                                                ...prev,
                                                level_settings: {
                                                    ...prev.level_settings,
                                                    levels: {
                                                        ...prev.level_settings?.levels,
                                                        [level]: { percentage: Number(e.target.value) }
                                                    }
                                                }
                                            }))}
                                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Section 5 — 🛡️ Eligibility */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                                <Shield size={18} className="text-red-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-white">Eligibility Rules</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Rules for user participation in rewards</p>
                            </div>
                        </div>
                        <button
                            onClick={() => saveSection('eligibility', [
                                { config_key: 'eligibility', config_value: eligibilityState.eligibility }
                            ])}
                            disabled={sectionSaving.eligibility}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {sectionSaving.eligibility ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Require KYC to earn</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Default KYC rule used when an event has no explicit override</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEligibilityState(prev => ({
                                    ...prev,
                                    eligibility: { ...prev.eligibility, require_kyc: !prev.eligibility?.require_kyc }
                                }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${eligibilityState.eligibility?.require_kyc ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${eligibilityState.eligibility?.require_kyc ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-x-auto">
                            <div className="min-w-[520px]">
                            <div className="grid grid-cols-[1fr_140px_140px] gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                                <div className="text-sm font-bold text-gray-700 dark:text-gray-300">Event</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-gray-300 text-center">Direct KYC</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-gray-300 text-center">Upline KYC</div>
                            </div>
                            {eligibilityEvents.map(event => {
                                const eventRule = eligibilityState.eligibility?.events?.[event.key] || {};
                                return (
                                    <div key={event.key} className="grid grid-cols-[1fr_140px_140px] gap-4 px-4 py-3 items-center border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{event.label}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Level 0 direct payout and referral upline payout eligibility</p>
                                        </div>
                                        {['direct_require_kyc', 'upline_require_kyc'].map(ruleKey => (
                                            <div key={ruleKey} className="flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setEligibilityState(prev => ({
                                                        ...prev,
                                                        eligibility: {
                                                            ...prev.eligibility,
                                                            events: {
                                                                ...prev.eligibility?.events,
                                                                [event.key]: {
                                                                    ...prev.eligibility?.events?.[event.key],
                                                                    [ruleKey]: !prev.eligibility?.events?.[event.key]?.[ruleKey]
                                                                }
                                                            }
                                                        }
                                                    }))}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${eventRule[ruleKey] ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${eventRule[ruleKey] ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min account age (days)</label>
                                <input
                                    type="number"
                                    value={eligibilityState.eligibility?.min_account_age_days ?? 0}
                                    onChange={e => setEligibilityState(prev => ({
                                        ...prev,
                                        eligibility: { ...prev.eligibility, min_account_age_days: Number(e.target.value) }
                                    }))}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min direct referrals to earn</label>
                                <input
                                    type="number"
                                    value={eligibilityState.eligibility?.min_direct_referrals_for_earnings ?? 0}
                                    onChange={e => setEligibilityState(prev => ({
                                        ...prev,
                                        eligibility: { ...prev.eligibility, min_direct_referrals_for_earnings: Number(e.target.value) }
                                    }))}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all w-full"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-6"
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-blue-900 dark:text-blue-300 text-sm">Configuration Tips</p>
                            <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                                <li>• Level settings define how many levels deep rewards flow (max 7)</li>
                                <li>• Event rewards are triggered by user actions (signup, purchase, KYC)</li>
                                <li>• Tier multipliers apply bonus points based on user tier</li>
                                <li>• Daily caps prevent abuse by limiting points per user per day</li>
                                <li>• Changes take effect immediately for new transactions</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
