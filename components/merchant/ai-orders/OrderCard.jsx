'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import toast from 'react-hot-toast';

export default function OrderCard({ order, onAccepted }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();

    const wholesale = (order.wholesale_price_paise || 0) / 100;
    const retail = (order.retail_price_paise || 0) / 100;
    const profit = (order.profit_margin_paise || 0) / 100;
    const profitPct = wholesale > 0 ? ((profit / wholesale) * 100).toFixed(0) : '0';

    const handleAcceptAndPay = async (e) => {
        e.stopPropagation();
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/merchant/ai-orders/${order.id}/initiate-payment`, {
                method: 'POST'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');

            toast.success('Redirecting to secure SabPaisa checkout...');
            if (data.paymentUrl) {
                router.push(data.paymentUrl);
            } else {
                router.push(`/payment/sabpaisa/checkout?txnId=${data.txnId || 'SP' + Date.now()}&amount=${order.wholesale_price_paise}`);
            }

            if (onAccepted) onAccepted(order.id);
        } catch (error) {
            toast.error(error.message || 'Payment initiation failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCardClick = () => {
        router.push(`/merchant/ai-orders/${order.id}`);
    };

    const getStatusBadge = () => {
        switch (order.status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                        • PENDING
                    </span>
                );
            case 'PAYMENT_PENDING':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40">
                        • PAYMENT PENDING
                    </span>
                );
            case 'ACCEPTED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                        • IN PROGRESS
                    </span>
                );
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                        • COMPLETED
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                        {order.status}
                    </span>
                );
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={handleCardClick}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group"
        >
            <div>
                {/* Product Header & Thumbnail */}
                <div className="flex items-center gap-3.5 mb-4">
                    <ProductThumbnail
                        src={order.product_image_url}
                        alt={order.product_name}
                        category={order.category}
                        className="w-14 h-14 rounded-2xl group-hover:scale-105 transition-transform"
                    />
                    <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                            {order.product_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {order.category || 'Electronics'}
                        </p>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="flex items-end justify-between py-3 px-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 mb-4">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wholesale Price</span>
                        <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                            ₹{wholesale.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Profit</span>
                        <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            +₹{profit.toLocaleString('en-IN')} <span className="text-xs">({profitPct}%)</span>
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                    {getStatusBadge()}
                </div>
            </div>

            {/* Dynamic Primary CTA */}
            <div>
                {order.status === 'PENDING' ? (
                    <button
                        onClick={handleAcceptAndPay}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                Accept & Pay <ArrowRight size={14} />
                            </>
                        )}
                    </button>
                ) : order.status === 'PAYMENT_PENDING' ? (
                    <button
                        onClick={handleAcceptAndPay}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                Complete Payment <ArrowRight size={14} />
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleCardClick}
                        className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                        View Details <ArrowRight size={14} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}
