'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Loader2 } from 'lucide-react';

/**
 * RewardAdjustSection — Client component for manual reward point adjustments.
 * Only rendered for super admins.
 *
 * @param {object} props
 * @param {string} props.userId
 * @param {number} props.initialBalance - Current reward points balance
 */
export default function RewardAdjustSection({ userId, initialBalance }) {
    const router = useRouter();
    const [points, setPoints] = useState('');
    const [operation, setOperation] = useState('credit');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }
    const [displayBalance, setDisplayBalance] = useState(initialBalance);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const parsedPoints = Number(points);
        if (!parsedPoints || parsedPoints <= 0) {
            showToast('error', 'Please enter a valid positive number of points.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/rewards/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, points: parsedPoints, operation, reason }),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast('error', data.error || 'Failed to adjust points.');
            } else {
                showToast('success', `Successfully ${operation === 'credit' ? 'credited' : 'debited'} ${parsedPoints} pts.`);
                setDisplayBalance(data.new_balance);
                setPoints('');
                setReason('');
                router.refresh();
            }
        } catch (err) {
            showToast('error', 'Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Manual Adjustment
            </p>

            {/* Toast */}
            {toast && (
                <div className={`mb-3 px-4 py-2.5 rounded-xl text-xs font-bold ${toast.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                    {toast.message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Points Input */}
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    placeholder="Points"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all"
                />

                {/* Operation Toggle */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setOperation('credit')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${operation === 'credit'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        Credit
                    </button>
                    <button
                        type="button"
                        onClick={() => setOperation('debit')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${operation === 'debit'
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        Debit
                    </button>
                </div>

                {/* Reason */}
                <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all"
                />

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {isSubmitting ? (
                        <><Loader2 size={14} className="animate-spin" /> Processing…</>
                    ) : (
                        <><Trophy size={14} /> Adjust Points</>
                    )}
                </button>
            </form>
        </div>
    );
}
