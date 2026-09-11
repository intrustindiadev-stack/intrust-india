'use client';

import { motion } from 'framer-motion';
import { X, Wallet, Briefcase, IndianRupee, ArrowRight, AlertTriangle } from 'lucide-react';

export default function SettleConfirmModal({ item, type, action, onClose, onConfirm, loading }) {
    // type: 'aigrow' | 'lockin'
    // action: 'wallet' (Release to Wallet) | 'cash' (Settle in Cash)

    const principal = item.amount_paise || 0;
    let profit = 0;
    let isPremature = false;

    if (type === 'aigrow') {
        profit = item.total_profit_paid_paise || 0;
    } else if (type === 'lockin') {
        const rate = (item.interest_rate || item.interest_rate_percent || 15) / 100;
        if (item.end_date && new Date() < new Date(item.end_date)) {
            isPremature = true;
            profit = 0; // Premature withdrawal forfeits interest in this logic
        } else if (item.start_date) {
            const startDate = new Date(item.start_date);
            const endDate = item.end_date ? new Date(item.end_date) : new Date();
            const boundedEnd = Math.min(new Date().getTime(), endDate.getTime());
            const daysElapsed = Math.max(0, boundedEnd - startDate.getTime()) / (1000 * 60 * 60 * 24);
            profit = Math.round(principal * (rate / 365) * daysElapsed);
        }
    }

    const total = principal + profit;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="absolute inset-0" onClick={() => !loading && onClose()} />

            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-10 border border-slate-100 overflow-hidden">
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Confirm Settlement</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {action === 'wallet' ? 'Releasing funds to merchant wallet' : 'Marking as settled in cash'}
                        </p>
                    </div>
                    <button onClick={() => !loading && onClose()} className="w-10 h-10 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {isPremature && type === 'lockin' && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
                        <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-rose-700 leading-relaxed">
                            Warning: This Lockin has not matured yet. Releasing it early will forfeit the accumulated interest.
                        </p>
                    </div>
                )}

                <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Principal Amount</span>
                        <span className="text-sm font-black text-slate-900">₹{(principal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{type === 'aigrow' ? 'Trade Profit' : 'Accrued Interest'}</span>
                        <span className="text-sm font-black text-emerald-600">+ ₹{(profit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-px bg-slate-200 w-full my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Total Payout</span>
                        <span className="text-xl font-black text-indigo-600">₹{(total / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="mb-8">
                    {action === 'wallet' ? (
                        <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                <Wallet size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800 leading-tight mb-1">Release to Wallet</p>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                                    The total amount of ₹{(total / 100).toLocaleString('en-IN')} will be credited directly to the merchant's Vault balance.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800 leading-tight mb-1">Settle in Cash</p>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                                    This plan will be marked as completed, but NO funds will be credited to the merchant's digital wallet. Use this if paid out offline.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 relative z-10">
                    <button type="button" onClick={() => onClose()} disabled={loading}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest transition-all">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={loading}
                        className={`flex-[2] text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${action === 'wallet' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-black shadow-slate-200'}`}>
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>Confirm {action === 'wallet' ? 'Release' : 'Settlement'} <ArrowRight size={14} /></>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
