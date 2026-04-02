'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import Link from 'next/link';

export default function MerchantNFCOrdersPage() {
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
        if (paymentStatus === 'pending') return { icon: 'schedule', label: 'Payment Pending', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200/30 dark:border-amber-600/20' };
        if (status === 'shipped') return { icon: 'local_shipping', label: 'Shipped', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200/30 dark:border-blue-600/20' };
        if (status === 'delivered') return { icon: 'check_circle', label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200/30 dark:border-emerald-600/20' };
        if (status === 'cancelled') return { icon: 'cancel', label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200/30 dark:border-red-600/20' };
        return { icon: 'hourglass_top', label: 'Processing', color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/5', border: 'border-[#D4AF37]/10' };
    };

    return (
        <div className="relative">
            {/* Background blurs */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/merchant/nfc-service"
                        className="w-10 h-10 rounded-xl flex items-center justify-center merchant-glass border border-black/5 dark:border-white/10 text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                        <span className="material-icons-round text-lg">arrow_back</span>
                    </Link>
                    <div>
                        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-1 text-slate-800 dark:text-slate-100">NFC Orders</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Track your InTrust NFC card orders</p>
                    </div>
                </div>
                <Link
                    href="/merchant/nfc-service"
                    className="px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#020617] font-bold text-xs hover:bg-opacity-90 transition-all flex items-center gap-2 gold-glow w-fit"
                >
                    <span className="material-icons-round text-sm">add</span> New Order
                </Link>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : orders.length === 0 ? (
                <div className="merchant-glass bg-white/60 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-16 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-5">
                        <span className="material-icons-round text-[#D4AF37] text-3xl">inventory_2</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No orders yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">You haven't ordered any NFC cards yet.</p>
                    <Link
                        href="/merchant/nfc-service"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-[#020617] font-bold text-sm hover:bg-opacity-90 transition-all gold-glow"
                    >
                        <span className="material-icons-round text-sm">contactless</span> Order NFC Card
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => {
                        const sc = getStatusConfig(order.status, order.payment_status);
                        const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                        return (
                            <div
                                key={order.id}
                                className="merchant-glass bg-white/60 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 flex-wrap mb-2">
                                            <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">{order.card_holder_name}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 border ${sc.color} ${sc.bg} ${sc.border}`}>
                                                <span className="material-icons-round text-xs">{sc.icon}</span> {sc.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <span className="material-icons-round text-xs text-[#D4AF37]">payments</span>
                                                ₹{(order.sale_price_paise / 100).toLocaleString()} via {order.payment_method}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="material-icons-round text-xs text-[#D4AF37]">calendar_today</span>
                                                {date}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="material-icons-round text-xs text-[#D4AF37]">call</span>
                                                {order.phone}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">#{order.id?.slice(-6).toUpperCase()}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
