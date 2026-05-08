'use client';

import { useState } from 'react';
import { Gift, CheckCircle } from 'lucide-react';
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
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-sm">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400">
                    <CheckCircle size={28} />
                </div>
                <h3 className="font-bold text-emerald-100 text-lg">You've joined the network!</h3>
                <p className="text-sm text-emerald-400/80 font-medium mt-1">
                    Your referral link has been successfully established.
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
                router.refresh(); // Refresh to update the chain depth and referral data if any
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
        <div className="bg-white dark:bg-[#020617] rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                    <Gift size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Have a referral code?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Join a network by entering a referrer code</p>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-center text-xl font-mono font-bold tracking-[0.2em] text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all uppercase"
                    maxLength={10}
                />

                <button
                    onClick={handleApply}
                    disabled={applying || !code.trim()}
                    className="w-full bg-[#D4AF37] hover:bg-[#C5A028] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold shadow-md shadow-[#D4AF37]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    {applying ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Apply Code'
                    )}
                </button>
            </div>
        </div>
    );
}
