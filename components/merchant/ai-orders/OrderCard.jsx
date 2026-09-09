import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, ShieldCheck, CheckCircle2, X, XCircle, Sparkles } from 'lucide-react';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

export default function OrderCard({ order, onAccepted }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const [actionState, setActionState] = useState(null); // 'accepting' | 'rejected'
    const router = useRouter();

    const wholesale = (order.wholesale_price_paise || 0) / 100;
    const retail = (order.retail_price_paise || 0) / 100;
    const tax = (order.gst_amount_paise || 0) / 100;
    const calculatedGstRate = (wholesale > 0 && tax > 0) ? Math.round((tax / wholesale) * 100) : 18;
    const displayGstRate = order.gst_rate_percent || calculatedGstRate;
    const profit = (order.profit_margin_paise || 0) / 100;
    const profitPct = wholesale > 0 ? ((profit / wholesale) * 100).toFixed(0) : '0';

    const handleAcceptAndPay = async (e) => {
        e.stopPropagation();
        setIsProcessing(true);
        setActionState('accepting');
        try {
            const clientTxnId = `AIO_${Date.now()}_${order.id.substring(0, 8)}`;

            const res = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: (order.wholesale_price_paise / 100).toFixed(2),
                    clientTxnId,
                    payerName: 'AI Order Merchant',
                    payerEmail: 'merchant@intrust.in',
                    payerMobile: '9999999998',
                    udf1: 'AI_ORDER',
                    udf2: order.id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || 'Failed to initiate payment');

            if (!data.encData || !data.paymentUrl || !data.clientCode) {
                throw new Error('Invalid response from payment server');
            }

            toast.success('Redirecting to secure SabPaisa checkout...');
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.paymentUrl;

            const encInput = document.createElement('input');
            encInput.type = 'hidden';
            encInput.name = 'encData';
            encInput.value = data.encData;
            form.appendChild(encInput);

            const ccInput = document.createElement('input');
            ccInput.type = 'hidden';
            ccInput.name = 'clientCode';
            ccInput.value = data.clientCode;
            form.appendChild(ccInput);

            document.body.appendChild(form);
            form.submit();

            if (onAccepted) onAccepted(order.id);
        } catch (error) {
            setActionState(null);
            toast.error(error.message || 'Payment initiation failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const submitReject = async (e) => {
        e.stopPropagation();
        if (!rejectReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        setIsRejecting(true);
        try {
            const res = await fetch(`/api/merchant/ai-orders/${order.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejection_reason: rejectReason })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reject order');
            }

            setActionState('rejected');
            toast.success('Order rejected successfully');
            setShowRejectForm(false);
            setRejectReason('');
            setTimeout(() => {
                if (onAccepted) onAccepted(order.id);
            }, 700);
        } catch (error) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsRejecting(false);
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
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                        • REJECTED
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
                <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 mb-4 text-left">
                    <div>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wholesale</span>
                        <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                            ₹{wholesale.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div className="border-l border-slate-200 dark:border-slate-800 pl-2">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">GST ({displayGstRate}%)</span>
                        <div className="text-sm font-black text-rose-500 mt-0.5">
                            ₹{tax.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div className="border-l border-slate-200 dark:border-slate-800 pl-2">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Profit</span>
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            +₹{profit.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                    {getStatusBadge()}
                </div>
            </div>

            {/* Dynamic Primary CTA with Animations */}
            <div onClick={(e) => e.stopPropagation()}>
                {actionState === 'rejected' ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400"
                    >
                        <XCircle size={14} className="text-rose-500" />
                        <span>Order Rejected</span>
                    </motion.div>
                ) : actionState === 'accepting' ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                    >
                        <Loader2 size={14} className="animate-spin text-emerald-600" />
                        <span>Securing & Redirecting...</span>
                    </motion.div>
                ) : order.status === 'PENDING' ? (
                    showRejectForm ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason for rejection..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition-all resize-none h-14"
                                disabled={isRejecting}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowRejectForm(false)}
                                    disabled={isRejecting}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitReject}
                                    disabled={isRejecting || !rejectReason.trim()}
                                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isRejecting ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowRejectForm(true)}
                                disabled={isProcessing}
                                className="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                            >
                                <X size={14} /> Reject
                            </button>
                            <button
                                onClick={handleAcceptAndPay}
                                disabled={isProcessing}
                                className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <>Accept <ArrowRight size={14} /></>
                                )}
                            </button>
                        </div>
                    )
                ) : order.status === 'PAYMENT_PENDING' ? (
                    showRejectForm ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason for rejection..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition-all resize-none h-14"
                                disabled={isRejecting}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowRejectForm(false)}
                                    disabled={isRejecting}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitReject}
                                    disabled={isRejecting || !rejectReason.trim()}
                                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isRejecting ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowRejectForm(true)}
                                disabled={isProcessing}
                                className="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                            >
                                <X size={14} /> Reject
                            </button>
                            <button
                                onClick={handleAcceptAndPay}
                                disabled={isProcessing}
                                className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <>Complete Payment <ArrowRight size={14} /></>
                                )}
                            </button>
                        </div>
                    )
                ) : (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={handleCardClick}
                            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                            Details <ArrowRight size={14} />
                        </button>
                        {order.invoice_id && (
                            <a
                                href={`/payment/sabpaisa/checkout?invoice_id=${order.invoice_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-blue-200/50 dark:border-blue-800/30"
                            >
                                Invoice
                            </a>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
