import React from 'react';
import { Settings2, Percent, Hash } from 'lucide-react';

export function RewardEventCard({ eventInfo, eventData, onConfigure, onToggleActive }) {
    if (!eventData) return null;

    const isActive = eventData._is_active !== false;
    const isRate = eventInfo.type === 'rate';
    const primaryValue = isRate ? (eventData.rate_per_100rs || 0) : (eventData.direct || 0);
    const l1Value = eventData.L1 || 0;

    return (
        <div className={`border rounded-2xl p-5 transition-all ${isActive ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isRate ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {isRate ? <Percent size={18} /> : <Hash size={18} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{eventInfo.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1">{eventInfo.description}</p>
                    </div>
                </div>
                
                {/* Active Toggle */}
                <button
                    type="button"
                    onClick={() => onToggleActive(!isActive)}
                    role="switch"
                    aria-checked={isActive}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Direct Reward</span>
                    <span className="font-black text-gray-900 dark:text-white">
                        {primaryValue} <span className="text-sm font-medium text-gray-500">{isRate ? 'pts / ₹100' : 'pts'}</span>
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">L1 Referral</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                        {l1Value} <span className="text-sm font-medium text-gray-500">{isRate ? 'pts / ₹100' : 'pts'}</span>
                    </span>
                </div>
            </div>

            <button
                onClick={onConfigure}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <Settings2 size={16} />
                Configure Payouts
            </button>
        </div>
    );
}
