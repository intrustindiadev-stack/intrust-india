'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

export default function MerchantSuspendedPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [suspensionReason, setSuspensionReason] = useState('');

    useEffect(() => {
        fetchSuspensionDetails();
    }, []);

    const fetchSuspensionDetails = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: merchant } = await supabase
                .from('merchants')
                .select('suspension_reason')
                .eq('user_id', user.id)
                .single();

            if (merchant) {
                setSuspensionReason(merchant.suspension_reason || 'No specific reason provided');
            }
        } catch (error) {
            console.error('Error fetching suspension details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="relative min-h-[100vh] flex items-center justify-center bg-white dark:bg-[#020617] transition-colors">
                <span className="material-icons-round animate-spin text-[#D4AF37] text-4xl">autorenew</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden transition-colors">
            {/* Background embellishments */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-500/5 dark:bg-red-500/10 rounded-full blur-[120px] pointer-events-none -z-10 dark:opacity-40"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/10 dark:bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-xl w-full"
            >
                <div className="merchant-glass rounded-3xl border border-red-500/10 dark:border-red-500/20 overflow-hidden shadow-2xl relative">
                    <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>

                    {/* Header */}
                    <div className="px-8 pt-12 pb-8 text-center relative z-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="w-24 h-24 mx-auto mb-6 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center relative"
                        >
                            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-20"></div>
                            <span className="material-icons-round text-red-500 text-5xl">gpp_bad</span>
                        </motion.div>
                        <h1 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">Account Suspended</h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Your merchant privileges have been temporarily revoked.</p>
                    </div>

                    {/* Content */}
                    <div className="px-8 pb-10 space-y-6">
                        <div className="p-6 bg-red-500/5 rounded-2xl border border-red-500/10 dark:border-red-500/20 shadow-sm shadow-red-500/5">
                            <h3 className="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center uppercase tracking-widest text-[10px]">
                                <span className="material-icons-round text-sm mr-2">info</span>
                                Reason for Suspension
                            </h3>
                            <p className="text-slate-700 dark:text-red-300/80 text-sm leading-relaxed font-medium">{suspensionReason}</p>
                        </div>

                        <div className="p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 relative overflow-hidden group shadow-sm">
                            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/5 rounded-full blur-2xl group-hover:bg-[#D4AF37]/20 transition-colors"></div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-[10px] uppercase tracking-widest relative z-10">What This Means</h3>
                            <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm relative z-10 font-medium">
                                <li className="flex items-start">
                                    <span className="material-icons-round text-red-500 dark:text-red-400 text-sm mr-3 mt-0.5">remove_circle_outline</span>
                                    <span>You cannot access the merchant dashboard or manage inventory.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="material-icons-round text-orange-500 dark:text-orange-400 text-sm mr-3 mt-0.5">visibility_off</span>
                                    <span>Your listings are hidden from the marketplace.</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="material-icons-round text-emerald-600 dark:text-emerald-400 text-sm mr-3 mt-0.5">verified_user</span>
                                    <span>Your wallet balance is secure and intact.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 dark:border-blue-500/20 shadow-sm shadow-blue-500/5">
                            <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2 text-[10px] uppercase tracking-widest">Need Help?</h3>
                            <p className="text-slate-700 dark:text-blue-300/80 text-sm mb-4 font-medium">
                                Our support team is here to assist you in resolving this issue. Please reach out with your account details.
                            </p>
                            <a href="mailto:support@intrust.com" className="inline-flex items-center text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline transition-all">
                                <span className="material-icons-round text-sm mr-2">email</span>
                                support@intrust.com
                            </a>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 pb-8 pt-4 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => window.location.href = 'mailto:support@intrust.com?subject=Merchant Account Suspended'}
                                className="flex-1 py-4 bg-[#D4AF37] text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow"
                            >
                                <span className="material-icons-round text-sm">support_agent</span>
                                Contact Support
                            </button>
                            <button
                                onClick={() => router.push('/')}
                                className="flex-1 py-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-black/5 dark:border-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-round text-sm">home</span>
                                Return Home
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
