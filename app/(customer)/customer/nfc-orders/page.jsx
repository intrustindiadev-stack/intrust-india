'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { Package, ArrowLeft, Clock, CheckCircle, Truck, XCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function NFCOrdersPage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/nfc/orders');
                const data = await res.json();
                if (res.ok && data.orders) {
                    setOrders(data.orders);
                }
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const getStatusConfig = (status, paymentStatus) => {
        if (paymentStatus === 'pending') return { icon: Clock, label: 'Payment Pending', color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' };
        if (status === 'shipped') return { icon: Truck, label: 'Shipped', color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' };
        if (status === 'delivered') return { icon: CheckCircle, label: 'Delivered', color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' };
        if (status === 'cancelled') return { icon: XCircle, label: 'Cancelled', color: 'text-red-500', bg: isDark ? 'bg-red-500/10' : 'bg-red-50' };
        return { icon: Clock, label: 'Processing', color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' };
    };

    return (
        <div className={`min-h-screen pt-28 pb-16 px-4 sm:px-6 transition-colors duration-500 ${isDark ? 'bg-[#08090b]' : 'bg-slate-50'}`}>
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/nfc-service"
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${isDark ? 'border-white/[0.06] text-white/50 hover:bg-white/[0.04]' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>My NFC Orders</h1>
                        <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Track your InTrust NFC card orders</p>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className={`rounded-xl border p-12 text-center ${isDark ? 'bg-[#111318] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                        <Package size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/15' : 'text-slate-300'}`} />
                        <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No orders yet</h3>
                        <p className={`text-sm mb-6 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>You haven't ordered any NFC cards yet.</p>
                        <Link
                            href="/nfc-service"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                        >
                            Order Now <ArrowLeft size={14} className="rotate-180" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map(order => {
                            const statusConfig = getStatusConfig(order.status, order.payment_status);
                            const StatusIcon = statusConfig.icon;
                            const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                            return (
                                <div
                                    key={order.id}
                                    className={`rounded-xl border p-5 transition-colors ${isDark ? 'bg-[#111318] border-white/[0.06]' : 'bg-white border-slate-200'}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.card_holder_name}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${statusConfig.color} ${statusConfig.bg}`}>
                                                    <StatusIcon size={10} /> {statusConfig.label}
                                                </span>
                                            </div>
                                            <div className={`text-sm space-y-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                                <p className="flex items-center gap-1.5"><CreditCard size={12} /> ₹{(order.sale_price_paise / 100).toLocaleString()} via {order.payment_method}</p>
                                                <p className="flex items-center gap-1.5"><Clock size={12} /> {date}</p>
                                            </div>
                                        </div>
                                        <p className={`text-xs font-mono shrink-0 ${isDark ? 'text-white/20' : 'text-slate-400'}`}>#{order.id?.slice(-6).toUpperCase()}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
