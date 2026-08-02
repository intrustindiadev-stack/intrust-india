import React, { useState } from 'react';
import { Wallet, AlertTriangle, ArrowRight } from 'lucide-react';
import { RewardSettingCard } from './RewardSettingCard';
import { motion, AnimatePresence } from 'framer-motion';

export function RewardRedemptionEditor({ config }) {
    const { draftConfig, serverConfig, updateDraft } = config;
    const [showConfirmation, setShowConfirmation] = useState(false);

    if (!draftConfig || !serverConfig) return null;

    const data = draftConfig.global?.point_value || {};
    const serverData = serverConfig.global?.point_value || {};
    const mode = draftConfig.global?.redemption_mode || 'instant';
    const serverMode = serverConfig.global?.redemption_mode || 'instant';

    const isRateChanged = data.points_per_rupee !== serverData.points_per_rupee;
    const isModeChanged = mode !== serverMode;
    const isMinSubstantiallyLowered = data.min_withdrawal_points < (serverData.min_withdrawal_points * 0.5); // Arbitrary substantial change threshold

    const hasHighImpactChanges = isRateChanged || isModeChanged || isMinSubstantiallyLowered;

    // We use a custom save handler here to wrap the config.saveSection
    const handleSaveRequest = async () => {
        if (hasHighImpactChanges && !showConfirmation) {
            setShowConfirmation(true);
            return;
        }
        
        // If confirmed or no high impact changes, proceed to save global and levelSettings
        await config.saveSection('global');
        await config.saveSection('levelSettings');
        setShowConfirmation(false);
    };

    return (
        <>
            <RewardSettingCard
                icon={Wallet}
                title="Redemption & Value"
                description="Configure the financial value of points and how users redeem them"
                iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
                iconTextClass="text-emerald-600"
            >
                {/* Conversion Rate Highlight */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg mb-8">
                    <div className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-2">Conversion Rule</div>
                    <div className="flex items-center gap-6">
                        <div className="relative w-32">
                            <input
                                type="number"
                                min="1"
                                value={data.points_per_rupee === undefined ? '' : data.points_per_rupee}
                                onChange={(e) => updateDraft('global', ['point_value', 'points_per_rupee'], e.target.value === '' ? 1 : Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-black text-2xl focus:ring-2 focus:ring-white/50 focus:border-white outline-none transition-all text-center"
                            />
                            <div className="absolute -bottom-6 left-0 right-0 text-center text-xs font-medium text-emerald-100">Points</div>
                        </div>
                        <ArrowRight size={24} className="text-emerald-200" />
                        <div className="w-32 px-4 py-3 rounded-xl bg-white/10 border border-white/20 font-black text-2xl text-center">
                            ₹1
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Min. Withdrawal (Points)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={data.min_withdrawal_points === undefined ? '' : data.min_withdrawal_points}
                            onChange={(e) => updateDraft('global', ['point_value', 'min_withdrawal_points'], e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Equivalent to minimum withdrawal value of <strong>₹{Math.floor((data.min_withdrawal_points || 0) / (data.points_per_rupee || 1))}</strong>
                        </p>
                    </div>
                </div>

                {/* Redemption Mode */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4">Redemption Mode</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`relative border rounded-2xl p-5 cursor-pointer transition-all ${mode === 'instant' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300'}`}>
                            <input 
                                type="radio" 
                                name="redemption_mode" 
                                value="instant" 
                                checked={mode === 'instant'}
                                onChange={() => updateDraft('global', 'redemption_mode', 'instant')}
                                className="absolute opacity-0"
                            />
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-gray-900 dark:text-white">Instant</div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'instant' ? 'border-emerald-500' : 'border-gray-300'}`}>
                                    {mode === 'instant' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                Points are converted to wallet cash automatically and immediately upon user request.
                            </p>
                        </label>

                        <label className={`relative border rounded-2xl p-5 cursor-pointer transition-all ${mode === 'approval_required' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-300'}`}>
                            <input 
                                type="radio" 
                                name="redemption_mode" 
                                value="approval_required" 
                                checked={mode === 'approval_required'}
                                onChange={() => updateDraft('global', 'redemption_mode', 'approval_required')}
                                className="absolute opacity-0"
                            />
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-gray-900 dark:text-white">Admin Approval Required</div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === 'approval_required' ? 'border-amber-500' : 'border-gray-300'}`}>
                                    {mode === 'approval_required' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                Creates a pending redemption request that must be manually approved by an admin.
                            </p>
                        </label>
                    </div>

                    {mode === 'approval_required' && (
                        <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex gap-3">
                            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-sm font-bold text-amber-900 dark:text-amber-500">Missing Admin Interface Warning</h5>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                    Currently, there is no admin UI panel built to view and process pending redemption requests. If you enable this mode, user redemptions will be stuck in a "pending" state until a backend panel is developed.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hijack the parent save for this section to force confirmation */}
                {config.dirtySections.includes('global') && !showConfirmation && (
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-right">
                        <button
                            onClick={handleSaveRequest}
                            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm"
                        >
                            Review & Save Financial Settings
                        </button>
                    </div>
                )}
            </RewardSettingCard>

            {/* High Impact Confirmation Dialog */}
            <AnimatePresence>
                {showConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full border border-gray-100 dark:border-gray-700">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                                <AlertTriangle size={24} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">High Impact Change</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                You are about to modify core financial logic. These changes apply immediately to all <strong>future</strong> conversions. Past conversions are not affected.
                            </p>

                            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 space-y-4 mb-8">
                                {isRateChanged && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Points per ₹1:</span>
                                        <div className="font-bold">
                                            <span className="text-gray-400 line-through mr-2">{serverData.points_per_rupee}</span>
                                            <span className="text-emerald-500">{data.points_per_rupee}</span>
                                        </div>
                                    </div>
                                )}
                                {isModeChanged && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Mode:</span>
                                        <div className="font-bold">
                                            <span className="text-gray-400 line-through mr-2 capitalize">{serverMode.replace('_', ' ')}</span>
                                            <span className="text-emerald-500 capitalize">{mode.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                )}
                                {isMinSubstantiallyLowered && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Min Withdrawal:</span>
                                        <div className="font-bold">
                                            <span className="text-gray-400 line-through mr-2">{serverData.min_withdrawal_points}</span>
                                            <span className="text-emerald-500">{data.min_withdrawal_points}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveRequest}
                                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors"
                                >
                                    Confirm Save
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
