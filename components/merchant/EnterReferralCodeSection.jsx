'use client';

import { useState } from 'react';
import { Gift, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function EnterReferralCodeSection({ hasReferrer }) {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);

    if (hasReferrer) return null;

    if (applied) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-6 text-center shadow-sm backdrop-blur-md">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-500 dark:text-emerald-400">
                    <CheckCircle size={28} />
                </div>
                <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-lg">You've joined the partner network!</h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mt-1">
                    Your referral link has been successfully established and verified.
                </p>
            </div>
        );
    }

    const handleApply = async () => {
        if (!code.trim()) {
            toast.error('Please enter a referral code');
            return;
        }

        setApplying(true);
        try {
            const res = await fetch('/api/merchant/referral/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referral_code_entered: code.toUpperCase().trim() })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Referral code applied successfully!');
                setApplied(true);
                router.refresh();
            } else {
                toast.error(data.error || 'Failed to apply referral code');
            }
        } catch (err) {
            console.error('Error applying merchant referral code:', err);
            toast.error('An unexpected error occurred');
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-[#D4AF37] shrink-0">
                        <Gift size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                            Have a referral code?
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Enter the code shared by your inviter to link your merchant account.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full md:w-auto">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-center sm:text-left text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 uppercase min-w-[180px]"
                        maxLength={10}
                    />

                    <button
                        onClick={handleApply}
                        disabled={applying || !code.trim()}
                        className="bg-[#D4AF37] hover:bg-[#c49f2e] disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {applying ? (
                            <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Apply Code</span>
                                <ArrowRight size={15} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

