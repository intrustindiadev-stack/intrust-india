'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useMerchant } from '@/hooks/useMerchant';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import toast from 'react-hot-toast';

export default function AIOrderNotificationModal() {
    const [newOrder, setNewOrder] = useState(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const router = useRouter();
    const { merchant } = useMerchant();

    useEffect(() => {
        // Allow programmatic or dev trigger
        const handleTrigger = (e) => {
            if (e.detail) setNewOrder(e.detail);
        };
        window.addEventListener('trigger-ai-order-notification', handleTrigger);

        if (!merchant) {
            return () => window.removeEventListener('trigger-ai-order-notification', handleTrigger);
        }

        const merchantUserId = merchant.user_id || merchant.id;

        const fetchPendingOrder = async () => {
            try {
                const { data, error } = await supabase
                    .from('ai_orders')
                    .select('*')
                    .eq('status', 'PENDING')
                    .or(`merchant_id.eq.${merchantUserId},merchant_id.is.null`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (data) setNewOrder(data);
            } catch (err) {
                console.error('Error fetching pending AI order:', err);
            }
        };
        fetchPendingOrder();

        // Subscribe to real-time AI orders insertions & updates targeted to this merchant
        const channel = supabase
            .channel(`ai_order_modal_${merchantUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ai_orders',
                },
                (payload) => {
                    const order = payload.new;
                    if (order.status === 'PENDING' && (!order.merchant_id || order.merchant_id === merchantUserId)) {
                        setNewOrder(order);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'ai_orders',
                },
                (payload) => {
                    const order = payload.new;
                    if (order.status === 'PENDING' && (!order.merchant_id || order.merchant_id === merchantUserId)) {
                        setNewOrder(order);
                    }
                }
            )
            .subscribe();

        return () => {
            window.removeEventListener('trigger-ai-order-notification', handleTrigger);
            supabase.removeChannel(channel);
        };
    }, [merchant]);

    const handleAcceptAndPay = async () => {
        if (!newOrder) return;
        setIsAccepting(true);
        try {
            const clientTxnId = `AIO_${Date.now()}_${newOrder.id.substring(0, 8)}`;

            const res = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: (newOrder.wholesale_price_paise / 100).toFixed(2),
                    clientTxnId,
                    payerName: 'AI Order Merchant',
                    payerEmail: 'merchant@intrust.in',
                    payerMobile: '9999999998',
                    udf1: 'AI_ORDER',
                    udf2: newOrder.id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || 'Failed to initiate payment');

            if (!data.encData || !data.paymentUrl || !data.clientCode) {
                throw new Error('Invalid response from payment server');
            }

            toast.success('Redirecting to SabPaisa checkout...');
            setNewOrder(null);
            
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
        } catch (error) {
            toast.error(error.message || 'Payment initiation failed');
        } finally {
            setIsAccepting(false);
        }
    };

    const handleDismiss = () => {
        setNewOrder(null);
        setShowRejectForm(false);
        setRejectReason('');
        toast('Order dismissed', { icon: 'ℹ️' });
    };

    const submitReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        setIsRejecting(true);
        try {
            const res = await fetch(`/api/merchant/ai-orders/${newOrder.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejection_reason: rejectReason })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reject order');
            }

            toast.success('Order rejected successfully');
            setNewOrder(null);
            setShowRejectForm(false);
            setRejectReason('');
        } catch (error) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsRejecting(false);
        }
    };

    if (!newOrder) return null;

    const wholesale = (newOrder.wholesale_price_paise || 0) / 100;
    const profit = (newOrder.profit_margin_paise || 0) / 100;
    const roi = wholesale > 0 ? ((profit / wholesale) * 100).toFixed(0) : '0';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 pointer-events-none">
                {/* Subtle Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs pointer-events-auto"
                    onClick={() => {
                        if (!isAccepting && !isRejecting) handleDismiss();
                    }}
                />

                {/* Floating Notification Card matching Blueprint */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 25 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 25 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className="pointer-events-auto relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-5 overflow-hidden"
                >
                    {/* Top Bar: Badge, Time, and Close */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-black tracking-wide">
                            <Zap size={13} className="fill-blue-600" />
                            New AI Order
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">just now</span>
                            <button
                                onClick={handleDismiss}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                disabled={isAccepting || isRejecting}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Product & Scooter Delivery Illustration Row */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <ProductThumbnail
                                src={newOrder.product_image_url}
                                alt={newOrder.product_name}
                                category={newOrder.category}
                                className="w-16 h-16 rounded-2xl border border-slate-200/80 shadow-xs"
                            />
                            <div className="min-w-0">
                                <h4 className="text-base font-black text-slate-900 leading-snug truncate">
                                    {newOrder.product_name}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {newOrder.category || 'Electronics'} • High Demand
                                </p>
                            </div>
                        </div>

                        {/* Scooter Delivery Graphic */}
                        <div className="w-20 h-16 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                                src="/banners/delivery-scooter.jpg"
                                alt="Express Delivery"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Financial Metrics Row: Wholesale | Your Profit | ROI */}
                    <div className="grid grid-cols-3 gap-2 py-3 px-2 sm:px-4 rounded-2xl bg-slate-50/90 border border-slate-100 mb-5 text-left">
                        <div>
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wholesale</span>
                            <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">
                                ₹{wholesale.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="border-l border-slate-200 pl-2 sm:pl-3">
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Your Profit</span>
                            <div className="text-sm sm:text-base font-black text-emerald-600 mt-0.5 truncate">
                                ₹{profit.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="border-l border-slate-200 pl-2 sm:pl-3">
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-600 tracking-wider">ROI</span>
                            <div className="text-sm sm:text-base font-black text-blue-600 mt-0.5 truncate">
                                {roi}%
                            </div>
                        </div>
                    </div>

                    {/* Actions: Reject & Accept/Pay Buttons OR Reject Form */}
                    <AnimatePresence mode="wait">
                        {showRejectForm ? (
                            <motion.div
                                key="reject-form"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3"
                            >
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                                        Reason for Rejection <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="E.g., Margin too low, Currently out of capacity..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none h-16"
                                        disabled={isRejecting}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowRejectForm(false)}
                                        disabled={isRejecting}
                                        className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitReject}
                                        disabled={isRejecting || !rejectReason.trim()}
                                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                                    >
                                        {isRejecting ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Reject'}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="action-buttons"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-2 gap-3"
                            >
                                <button
                                    type="button"
                                    onClick={() => setShowRejectForm(true)}
                                    disabled={isAccepting}
                                    className="w-full py-3 rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                    <X size={15} /> Reject
                                </button>

                                <button
                                    type="button"
                                    onClick={handleAcceptAndPay}
                                    disabled={isAccepting}
                                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isAccepting ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={16} /> Accept & Pay
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
