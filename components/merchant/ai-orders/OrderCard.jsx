'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function OrderCard({ order, onAccept }) {
    const [isAccepting, setIsAccepting] = React.useState(false);
    const router = useRouter();

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            const res = await fetch(`/api/merchant/ai-orders/${order.id}/initiate-payment`, {
                method: 'POST'
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');

            toast.success('Redirecting to Sabpaisa checkout...');

            // In real app, we would redirect to data.paymentUrl
            // For now, simulate webhook call for testing if needed, or just redirect.
            if (data.paymentUrl) {
                router.push(data.paymentUrl);
            }
            
            if (onAccept) onAccept(order.id);

        } catch (error) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white dark:bg-[#1a1c23] rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden group"
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/0 to-[#D4AF37]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-black uppercase tracking-wider mb-2">
                        <Zap size={10} className="fill-current" />
                        High Demand
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {order.product_name}
                    </h3>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-4 border border-slate-100 dark:border-white/5 mb-5 relative z-10">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Wholesale / Invest</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                            ₹{(order.wholesale_price_paise / 100).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 line-through">
                            Retail: ₹{(order.retail_price_paise / 100).toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Guaranteed Profit</p>
                        <p className="text-2xl font-black text-emerald-500">
                            +₹{(order.profit_margin_paise / 100).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3 relative z-10">
                <button
                    onClick={handleAccept}
                    disabled={isAccepting || order.status !== 'PENDING'}
                    className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-[#D4AF37] hover:bg-slate-800 dark:hover:bg-[#B8860B] text-white dark:text-slate-900 font-black tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                    {isAccepting ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            Accept & Pay
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium">
                    <ShieldCheck size={12} />
                    Principal securely locked in Vault
                </div>
            </div>
        </motion.div>
    );
}
