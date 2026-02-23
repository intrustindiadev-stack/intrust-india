'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { XCircle, Mail, Home, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MerchantRejectedPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectedAt, setRejectedAt] = useState(null);

    useEffect(() => {
        fetchRejectionDetails();
    }, []);

    const fetchRejectionDetails = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: merchant } = await supabase
                .from('merchants')
                .select('rejection_reason, rejected_at')
                .eq('user_id', user.id)
                .single();

            if (merchant) {
                setRejectionReason(merchant.rejection_reason || 'No specific reason provided');
                setRejectedAt(merchant.rejected_at);
            }
        } catch (error) {
            console.error('Error fetching rejection details:', error);
        } finally {
            setLoading(false);
        }
    };

    const canReapply = () => {
        if (!rejectedAt) return false;
        const rejectionDate = new Date(rejectedAt);
        const daysSinceRejection = (Date.now() - rejectionDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceRejection >= 30;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#020617] transition-colors">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden transition-colors">
            {/* Background embellishments */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-500/5 dark:bg-red-500/10 rounded-full blur-[120px] pointer-events-none -z-10 dark:opacity-40"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full"
            >
                <div className="merchant-glass rounded-3xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 relative">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-red-600 to-rose-600 dark:from-red-500/20 dark:to-rose-500/20 p-8 sm:p-12 text-center relative border-b border-black/5 dark:border-white/10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-white dark:bg-white/10 shadow-xl rounded-full flex items-center justify-center"
                        >
                            <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600 dark:text-red-500" />
                        </motion.div>
                        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3 text-white dark:text-white">Application Not Approved</h1>
                        <p className="text-white/90 dark:text-slate-300 text-lg font-medium">Your merchant application update status</p>
                    </div>

                    {/* Content */}
                    <div className="p-8 sm:p-12 space-y-8">
                        <div>
                            <div className="p-6 bg-red-500/5 rounded-2xl border border-red-500/10 dark:border-red-500/20 shadow-sm shadow-red-500/5">
                                <div className="flex items-start gap-3 mb-3 text-red-600 dark:text-red-400">
                                    <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h3 className="font-bold uppercase tracking-widest text-[10px] mb-1">Reason for Rejection</h3>
                                        <p className="text-slate-700 dark:text-red-300/80 text-sm leading-relaxed font-medium">{rejectionReason}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6 border border-black/5 dark:border-white/10 relative overflow-hidden group shadow-sm">
                            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/5 rounded-full blur-2xl group-hover:bg-[#D4AF37]/20 transition-colors"></div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-widest text-[10px] relative z-10">What can you do?</h3>
                            <ul className="space-y-4 relative z-10">
                                {[
                                    "Review the rejection reason carefully",
                                    "Prepare the correct documents and information",
                                    "Contact support if you need clarification",
                                    "Reapply after 30 days from rejection date"
                                ].map((step, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#D4AF37] font-bold text-xs shrink-0">{i + 1}</span>
                                        <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {!canReapply() && (
                            <div className="p-4 bg-orange-500/5 rounded-xl border border-orange-500/10 dark:border-orange-500/20 text-center">
                                <p className="text-sm text-orange-600 dark:text-orange-400 font-bold">
                                    You can reapply after 30 days from the rejection date
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            {canReapply() ? (
                                <button
                                    onClick={() => router.push('/merchant-apply')}
                                    className="flex-1 py-4 bg-[#D4AF37] text-white dark:text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow"
                                >
                                    Reapply Now
                                    <ArrowRight size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => window.location.href = 'mailto:support@intrust.com'}
                                    className="flex-1 py-4 bg-[#D4AF37] text-white dark:text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow"
                                >
                                    <Mail size={20} />
                                    Contact Support
                                </button>
                            )}
                            <button
                                onClick={() => router.push('/')}
                                className="flex-1 py-4 bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Home size={20} />
                                Return to Home
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
