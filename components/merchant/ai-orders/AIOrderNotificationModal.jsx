'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useMerchant } from '@/hooks/useMerchant';

export default function AIOrderNotificationModal() {
    const [newOrder, setNewOrder] = useState(null);
    const router = useRouter();
    const { merchant } = useMerchant();

    useEffect(() => {
        if (!merchant) return;

        // Subscribe to real-time AI orders insertions
        const channel = supabase
            .channel('ai_orders_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ai_orders',
                },
                (payload) => {
                    // Show notification modal if it's a new PENDING order
                    if (payload.new.status === 'PENDING') {
                        setNewOrder(payload.new);
                        // Auto-hide after 15 seconds if ignored
                        setTimeout(() => setNewOrder(null), 15000);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [merchant]);

    const handleAccept = () => {
        router.push('/merchant/ai-orders');
        setNewOrder(null);
    };

    return (
        <AnimatePresence>
            {newOrder && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                        onClick={() => setNewOrder(null)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="pointer-events-auto relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden"
                    >
                        {/* Glowing orb effect */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4AF37]/20 rounded-full blur-3xl pointer-events-none" />

                        <button 
                            onClick={() => setNewOrder(null)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 transition-colors z-10"
                        >
                            <X size={16} />
                        </button>

                        <div className="p-6 text-center mt-4">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#D4AF37] to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 mb-4 animate-pulse">
                                <Zap className="text-white w-8 h-8" />
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                New AI Order Available!
                            </h3>
                            <p className="text-sm text-slate-500 mt-2 font-medium">
                                A high-profit order just dropped. Accept it before someone else does.
                            </p>

                            <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {newOrder.product_name}
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <div className="text-left">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Invest</div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white">
                                            ₹{(newOrder.wholesale_price_paise / 100).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold">Profit</div>
                                        <div className="text-lg font-black text-emerald-600">
                                            +₹{(newOrder.profit_margin_paise / 100).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col gap-3">
                                <button
                                    onClick={handleAccept}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#D4AF37] dark:to-amber-500 text-white font-bold tracking-wide shadow-lg shadow-slate-900/20 dark:shadow-[#D4AF37]/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95"
                                >
                                    Review & Accept
                                    <ArrowRight size={16} />
                                </button>
                                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium">
                                    <ShieldCheck size={12} />
                                    Secured by InTrust Vault
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
