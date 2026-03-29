'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, CreditCard, Loader2, Info, Smartphone, Package, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { RequestTimeline, UdhariStatusBadge } from '@/components/customer/store-credits/UdhariSharedComponents';

/**
 * ShopOrderCreditCard
 * Renders a store-credit request that is linked to a shopping_order_group
 * (source_type = 'shop_order') instead of a gift card coupon.
 */
export default function ShopOrderCreditCard({ req, payingId, onPaySuccess }) {
    const [localPayingId, setLocalPayingId] = useState(null);
    const isBusy = payingId === req.id || localPayingId === req.id;
    const isApproved = req.status === 'approved';
    const isPending = req.status === 'pending';
    const daysLeft = req.due_date ? Math.ceil((new Date(req.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = daysLeft !== null && daysLeft < 0;

    // Order items from the nested shopping_order_group relation
    const orderItems = req.shopping_order_group?.shopping_order_items || [];
    const feePaise = Math.round(req.amount_paise * 0.03);

    const handlePay = async (method = 'wallet') => {
        setLocalPayingId(req.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (method === 'wallet') {
                const res = await fetch('/api/shopping/settle-store-credit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ udhariRequestId: req.id })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                toast.success('Payment successful! Your order is now confirmed.');
                if (onPaySuccess) onPaySuccess();

            } else if (method === 'sabpaisa') {
                const res = await fetch('/api/udhari/pay-sabpaisa', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ requestId: req.id })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = data.paymentUrl;
                form.innerHTML = `
                    <input type="hidden" name="encData" value="${data.encData}" />
                    <input type="hidden" name="clientCode" value="${data.clientCode}" />
                `;
                document.body.appendChild(form);
                form.submit();
                return;
            }
        } catch (err) {
            toast.error(err.message || 'Payment failed');
        } finally {
            setLocalPayingId(null);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
        >
            <div className="p-5 sm:p-6">
                {/* Header badge */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                        <ShoppingBag size={11} />
                        Shop Order
                    </span>
                    <UdhariStatusBadge status={req.status} daysLeft={daysLeft} />
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Product images strip */}
                    <div className="flex gap-2 md:flex-col md:w-48 shrink-0">
                        {orderItems.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto md:overflow-visible md:flex-wrap">
                                {orderItems.slice(0, 4).map((item, idx) => (
                                    <div
                                        key={item.id || idx}
                                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0"
                                    >
                                        {item.shopping_products?.image_url ? (
                                            <img
                                                src={item.shopping_products.image_url}
                                                alt={item.shopping_products.title}
                                                className="w-full h-full object-contain p-1.5"
                                            />
                                        ) : (
                                            <Package size={20} className="text-gray-300" />
                                        )}
                                    </div>
                                ))}
                                {orderItems.length > 4 && (
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-black text-gray-400">+{orderItems.length - 4}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-24 bg-gradient-to-br from-violet-100 to-purple-200 rounded-2xl flex items-center justify-center">
                                <ShoppingBag size={32} className="text-violet-400" />
                            </div>
                        )}
                    </div>

                    {/* Middle: Info */}
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            {/* Order items summary */}
                            {orderItems.length > 0 && (
                                <p className="text-sm text-gray-600 font-medium mb-3 leading-relaxed">
                                    {orderItems.map(i => `${i.shopping_products?.title}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
                                </p>
                            )}

                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Principal</span>
                                    <span className="text-lg font-black text-gray-900">₹{(req.amount_paise / 100).toFixed(0)}</span>
                                </div>
                                <div className="h-8 w-[1px] bg-gray-100" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Convenience Fee</span>
                                    <span className="text-lg font-black text-amber-600">₹{(feePaise / 100).toFixed(0)}</span>
                                </div>
                                {req.due_date && (
                                    <>
                                        <div className="h-8 w-[1px] bg-gray-100" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Due Date</span>
                                            <span className="text-sm font-black text-gray-900 flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(req.due_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <RequestTimeline status={req.status} />
                    </div>

                    {/* Right: Actions */}
                    <div className="md:w-64 flex flex-col gap-3 justify-center pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-100">
                        {isApproved && (
                            <>
                                <button
                                    onClick={() => handlePay('wallet')}
                                    disabled={isBusy}
                                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                                        isOverdue
                                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200'
                                            : 'bg-gray-900 hover:bg-black text-white shadow-gray-200'
                                    }`}
                                >
                                    {isBusy ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                                    PAY WITH WALLET
                                </button>
                                <button
                                    onClick={() => handlePay('sabpaisa')}
                                    disabled={isBusy}
                                    className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                >
                                    {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />}
                                    PAY WITH UPI / CARD
                                </button>
                                {req.due_date && (
                                    <div className="flex items-start gap-2 text-[10px] text-gray-400 leading-tight px-1">
                                        <Info size={12} className="shrink-0 mt-0.5" />
                                        <span>Payment must be made by {new Date(req.due_date).toLocaleDateString()} to avoid account restriction.</span>
                                    </div>
                                )}
                            </>
                        )}

                        {isPending && (
                            <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="mb-3 text-amber-500"
                                >
                                    <Clock size={32} />
                                </motion.div>
                                <p className="text-sm font-black text-gray-900">Review in Progress</p>
                                <p className="text-[10px] text-gray-500 text-center mt-2 px-4 leading-relaxed">
                                    Merchant is reviewing your credit request. Usually 2-4 business hours.
                                </p>
                            </div>
                        )}

                        {!isApproved && !isPending && (
                            <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-2xl">
                                <span className="text-xs font-black uppercase text-gray-400">{req.status}</span>
                                {req.status === 'completed' && req.completed_at && (
                                    <span className="text-[10px] text-green-600 font-bold mt-1 uppercase tracking-tight">
                                        Paid on {new Date(req.completed_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
