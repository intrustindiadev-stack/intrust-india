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
            const res = await fetch(`/api/merchant/ai-orders/${newOrder.id}/initiate-payment`, {
                method: 'POST'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');

            toast.success('Redirecting to SabPaisa checkout...');
            setNewOrder(null);
            
            if (data.paymentUrl) {
                router.push(data.paymentUrl);
            } else {
                router.push(`/payment/sabpaisa/checkout?txnId=${data.txnId || 'SP' + Date.now()}&amount=${newOrder.wholesale_price_paise}`);
            }
        } catch (error) {
            toast.error(error.message || 'Payment initiation failed');
        } finally {
            setIsAccepting(false);
        }
    };

    const handleReject = () => {
        setNewOrder(null);
        toast('Order dismissed', { icon: 'ℹ️' });
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
                    onClick={() => setNewOrder(null)}
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
                                onClick={() => setNewOrder(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
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
                    <div className="grid grid-cols-3 gap-2 py-3 px-4 rounded-2xl bg-slate-50/90 border border-slate-100 mb-5 text-left">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wholesale</span>
                            <div className="text-base font-black text-slate-900 mt-0.5">
                                ₹{wholesale.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="border-l border-slate-200 pl-3">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Your Profit</span>
                            <div className="text-base font-black text-emerald-600 mt-0.5">
                                ₹{profit.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="border-l border-slate-200 pl-3">
                            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">ROI</span>
                            <div className="text-base font-black text-blue-600 mt-0.5">
                                {roi}%
                            </div>
                        </div>
                    </div>

                    {/* Actions: Reject & Accept/Pay Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={handleReject}
                            disabled={isAccepting}
                            className="w-full py-3 rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                            <X size={15} /> Reject
                        </button>

                        <button
                            type="button"
                            onClick={handleAcceptAndPay}
                            disabled={isAccepting}
                            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isAccepting ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : (
                                <>
                                    <Check size={16} /> Accept & Pay
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
