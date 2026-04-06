"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
    ShoppingBag, Package, Truck, CheckCircle2, XCircle, Clock,
    TrendingUp, DollarSign, Store, ChevronRight, Filter, Search,
    AlertCircle, RotateCcw, Eye, MapPin, RefreshCw, X, ArrowUpRight,
    User, Receipt, ExternalLink, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const STATUS_CONFIG = {
    pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: Clock },
    packed: { label: "Packed", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: Package },
    shipped: { label: "Shipped", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-500", bg: "bg-red-50", border: "border-red-200", icon: XCircle },
};

const STATUS_FLOW = ["pending", "packed", "shipped", "delivered"];

export default function AdminOrdersClient({ orders: initialOrders, stats: initialStats }) {
    const supabase = createClient();
    const router = useRouter();
    const [orders, setOrders] = useState(initialOrders);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [updatingId, setUpdatingId] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [shippingModal, setShippingModal] = useState(null); // { id: string }
    const [shippingData, setShippingData] = useState({
        tracking_number: '',
        estimated_delivery_at: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
        status_notes: ''
    });

    // REALTIME SUBSCRIPTION
    useEffect(() => {
        const orderChannel = supabase
            .channel('admin-orders-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_order_groups' }, (payload) => {
                // Since RPC returns joined data, we might need a refresh or manual update if possible
                // For now, let's trigger a router refresh or handle simple updates
                if (payload.eventType === 'UPDATE') {
                    setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
                }
                router.refresh();
            })
            .subscribe();

        return () => { supabase.removeChannel(orderChannel); };
    }, [router]);

    // DERIVED STATS (Computed from current orders for consistency)
    const currentStats = useMemo(() => ({
        total: orders.length,
        pending: orders.filter(o => o.delivery_status === 'pending').length,
        inProgress: orders.filter(o => ['packed', 'shipped'].includes(o.delivery_status)).length,
        delivered: orders.filter(o => o.delivery_status === 'delivered').length,
        cancelled: orders.filter(o => o.delivery_status === 'cancelled').length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.total_amount_paise || 0), 0),
    }), [orders]);

    const filteredOrders = useMemo(() => orders.filter(order => {
        const matchesSearch = !searchQuery ||
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.merchant_name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || order.delivery_status === statusFilter;
        const matchesType = typeFilter === "all" ||
            (typeFilter === "platform" && order.is_platform_order) ||
            (typeFilter === "merchant" && !order.is_platform_order);
        return matchesSearch && matchesStatus && matchesType;
    }), [orders, searchQuery, statusFilter, typeFilter]);

    const updateStatus = async (orderId, newStatus, tracking = null, estAt = null, notes = null) => {
        setUpdatingId(orderId);
        try {
            console.log('Updating order status:', { orderId, newStatus, tracking, estAt, notes });
            
            // Standard status update
            const { data, error } = await supabase.rpc("update_order_delivery_v3", {
                p_order_id: orderId,
                p_new_status: newStatus,
                p_tracking_number: tracking,
                p_estimated_at: estAt,
                p_status_notes: notes,
                p_is_admin: true
            });

            if (error) {
                console.error('RPC Error:', error);
                throw new Error(error.message);
            }

            if (!data?.success) {
                console.error('Logic Error:', data);
                throw new Error(data?.message || "Status update failed");
            }

            toast.success(`Order marked as ${newStatus}`);
            setOrders(prev => prev.map(o => o.id === orderId ? {
                ...o,
                delivery_status: newStatus,
                tracking_number: tracking || o.tracking_number,
                estimated_delivery_at: estAt || o.estimated_delivery_at,
                status_notes: notes || o.status_notes
            } : o));
            setShippingModal(null);
            setShippingData({ tracking_number: '', estimated_delivery_at: '', status_notes: '' });
        } catch (err) {
            console.error('Update Status Error:', err);
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setUpdatingId(null);
        }
    };

    const getNextStatus = (current) => {
        const idx = STATUS_FLOW.indexOf(current);
        return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    };

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto min-h-screen bg-[#f8f9fb] dark:bg-slate-950 font-[family-name:var(--font-outfit)] transition-colors duration-300">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="space-y-3">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20"
                    >
                        <ShoppingBag size={12} /> Platform Oversight
                    </motion.div>
                    <h1 className="text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
                        Omni <span className="text-blue-600">Orders</span>
                    </h1>
                    <p className="text-slate-400 dark:text-gray-500 font-medium text-lg">Central hub for platform and merchant commerce</p>
                </div>
                <Link href="/admin/shopping" className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
                    <RotateCcw size={16} className="group-hover:-rotate-45 transition-transform" />
                    Back to Hub
                </Link>
            </header>

            {/* Stats Grid - Mobile Horizontal Scroll */}
            <div className="flex overflow-x-auto pb-6 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10 hide-scrollbar snap-x snap-mandatory">
                {[
                    { label: "Volume", value: currentStats.total, icon: ShoppingBag, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
                    { label: "Pending", value: currentStats.pending, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
                    { label: "Active", value: currentStats.inProgress, icon: Truck, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
                    { label: "Settled", value: currentStats.delivered, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                    { label: "Loss/Cancel", value: currentStats.cancelled, icon: XCircle, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
                    { label: "Revenue", value: `₹${((currentStats.totalRevenue || 0) / 100).toLocaleString('en-IN')}`, icon: DollarSign, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
                ].map((s, i) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        key={s.label}
                        className="snap-center shrink-0 w-[45vw] sm:w-auto bg-white dark:bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/[0.05] p-5 shadow-sm overflow-hidden relative group"
                    >
                        <div className={`w-10 h-10 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500`}>
                            <s.icon size={20} />
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter truncate">{s.value}</p>
                        <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1 truncate">{s.label}</p>
                        <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                            <s.icon size={64} />
                        </div>
                    </motion.div>
                ))}
            </div>
            {/* Smart Filters Bar - Sticky & Compact */}
            <div className="sticky top-4 sm:top-6 z-30 mb-8 p-3 sm:p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.8rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-white/[0.05] shadow-2xl flex flex-col items-stretch gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50 dark:bg-white/5 border-none rounded-2xl sm:rounded-[1.8rem] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {["all", "platform", "merchant"].map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${typeFilter === type
                                    ? "bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-950 shadow-lg shadow-slate-900/20"
                                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-400"
                                    }`}
                            >
                                {type === "all" ? "All Types" : type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                    {["all", "pending", "packed", "shipped", "delivered", "cancelled"].map(s => {
                        const cfg = s === "all" ? { label: "All Status", color: "text-slate-500", bg: "bg-slate-100 dark:bg-white/5" } : STATUS_CONFIG[s];
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`whitespace-nowrap px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${statusFilter === s
                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105"
                                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-blue-400/50"
                                    }`}
                            >
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>
            </div>


            {/* Orders Feed */}
            <div className="space-y-6">
                {filteredOrders.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-32 text-center bg-white dark:bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10"
                    >
                        <Package size={64} className="mx-auto text-slate-200 dark:text-gray-800 mb-6" />
                        <h3 className="text-xl font-black text-slate-400">No Orders Found</h3>
                        <p className="text-slate-300 dark:text-gray-600 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Try adjusting your filters</p>
                    </motion.div>
                ) : (
                    filteredOrders.map((order, idx) => {
                        const status = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending;
                        const StatusIcon = status.icon;
                        const isExpanded = expandedOrder === order.id;
                        const nextStatus = getNextStatus(order.delivery_status);
                        const isUpdating = updatingId === order.id;

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={order.id}
                                className={`group relative bg-white dark:bg-white/[0.03] rounded-[2.5rem] border ${isExpanded ? 'border-blue-500/30' : 'border-slate-200 dark:border-white/[0.05]'} shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden`}
                            >
                                {/* Order Header - Condensed View */}
                                <div className="p-4 sm:p-6 cursor-pointer" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                                    <div className="flex items-start lg:items-center justify-between gap-4">
                                        <div className="flex items-start sm:items-center gap-3 sm:gap-5 flex-1 min-w-0">
                                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:rotate-6 ${status.bg} ${status.color}`}>
                                                <StatusIcon size={20} className="sm:hidden" />
                                                <StatusIcon size={24} className="hidden sm:block" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">#{order.id.slice(0, 8).toUpperCase()}</span>
                                                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${order.is_platform_order ? "bg-blue-500/10 text-blue-600" : "bg-violet-500/10 text-violet-600"}`}>
                                                        {order.is_platform_order ? "Warehouse" : "Merchant"}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-black text-slate-950 dark:text-white tracking-tight truncate">{order.customer_name || "Guest User"}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-900 dark:text-white">₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                                    <span className="text-slate-300 dark:text-gray-700">•</span>
                                                    <p className="text-[9px] font-bold text-slate-500">
                                                        {order.created_at ? format(new Date(order.created_at), "dd MMM") : "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 sm:gap-2 ${status.bg} ${status.color} ${status.border}`}>
                                                <StatusIcon size={10} className="sm:size-3" />
                                                <span className="hidden xs:inline">{status.label}</span>
                                            </div>
                                            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden border-t border-slate-100 dark:border-white/[0.05]"
                                        >
                                            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10 bg-slate-50/50 dark:bg-white/[0.01]">
                                                {/* Details List */}
                                                <div className="lg:col-span-2 space-y-8">
                                                    <div>
                                                        <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                                                            <Package size={14} className="text-blue-500" /> Manifest Details
                                                        </h4>
                                                        <div className="space-y-2.5">
                                                            {(order.items || []).map((item, i) => (
                                                                <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/[0.05] shadow-sm">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner">
                                                                            {i + 1}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{item.product_title || `Product #${item.product_id?.slice(0, 4)}`}</p>
                                                                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-0.5">Qty: {item.quantity} × ₹{((item.unit_price_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm font-black text-slate-950 dark:text-white tracking-tight shrink-0">₹{((item.price_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                                        <div className="p-5 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/[0.05] shadow-sm">
                                                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <MapPin size={12} className="text-red-500" /> Destination
                                                            </p>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-gray-300 leading-relaxed">
                                                                {order.delivery_address || "No address provided"}
                                                            </p>
                                                        </div>
                                                        <div className="p-5 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/[0.05] shadow-sm">
                                                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <User size={12} className="text-blue-500" /> Customer Info
                                                            </p>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 font-black text-xs shadow-inner">
                                                                    {order.customer_name?.charAt(0) || "G"}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{order.customer_name || "Guest"}</p>
                                                                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-tighter">Verified User</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Ledger Column */}
                                                <div className="space-y-6">
                                                    <div className="rounded-[2.2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/[0.05] shadow-xl overflow-hidden">
                                                        <div className="px-6 py-4 bg-slate-900 dark:bg-white/10 text-white border-b border-white/5">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
                                                                <Receipt size={12} /> Transaction Ledger
                                                            </p>
                                                        </div>
                                                        <div className="p-6 space-y-4">
                                                            <div className="flex justify-between items-center text-[10px]">
                                                                <span className="text-slate-500 dark:text-gray-400 font-black uppercase">Subtotal</span>
                                                                <span className="font-black text-slate-950 dark:text-white">₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px]">
                                                                <span className="text-slate-500 dark:text-gray-400 font-black uppercase tracking-tighter">Platform Commission (5%)</span>
                                                                <span className="font-black text-amber-600">₹{(((order.total_amount_paise || 0) * 0.05) / 100).toLocaleString("en-IN")}</span>
                                                            </div>
                                                            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.05] flex justify-between items-center">
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Net Flow</p>
                                                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 uppercase tracking-widest border border-emerald-500/20">Active</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Quick Actions */}
                                                    <div className="flex flex-col gap-3">
                                                        {nextStatus && order.delivery_status !== "cancelled" && (
                                                            <button
                                                                onClick={() => {
                                                                    if (nextStatus === 'shipped') {
                                                                        setShippingModal(order);
                                                                    } else {
                                                                        updateStatus(order.id, nextStatus);
                                                                    }
                                                                }}
                                                                disabled={isUpdating}
                                                                className="w-full py-4 rounded-2xl sm:rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                                            >
                                                                {isUpdating ? <RefreshCw className="animate-spin" size={16} /> : <TrendingUp size={16} />}
                                                                Promote To {STATUS_CONFIG[nextStatus]?.label}
                                                            </button>
                                                        )}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Link
                                                                href={`/admin/shopping/orders/${order.id}`}
                                                                className="py-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-center hover:bg-slate-50 transition-all shadow-sm"
                                                            >
                                                                View Link
                                                            </Link>
                                                            {order.delivery_status !== "cancelled" && order.delivery_status !== "delivered" && (
                                                                <button
                                                                    onClick={() => updateStatus(order.id, "cancelled")}
                                                                    disabled={isUpdating}
                                                                    className="py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/10 font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all shadow-sm"
                                                                >
                                                                    Revoke
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Pagination / Info Footer */}
            <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-12 p-8 text-center border-t border-slate-200 dark:border-white/[0.05]"
            >
                <p className="text-[10px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-[0.25em]">
                    Displaying {filteredOrders.length} records • Total Matrix Sync Active
                </p>
            </motion.footer>

            {/* SHIPPING MODAL */}
            <AnimatePresence>
                {shippingModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShippingModal(null)}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] border border-white/20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden m-4"
                        >
                            <div className="p-6 sm:p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Shipping Details</h3>
                                    <button onClick={() => setShippingModal(null)} className="p-2 sm:p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors">
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                                    Enter manifest details for Order <span className="text-blue-600 font-black">#{shippingModal.id.substring(0, 8).toUpperCase()}</span>
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Tracking Number / AWB</label>
                                        <div className="relative">
                                            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="e.g. DL12345678"
                                                className="w-full pl-11 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                                                value={shippingData.tracking_number}
                                                onChange={(e) => setShippingData(prev => ({ ...prev, tracking_number: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 underline decoration-blue-500/30 underline-offset-4">Precise Delivery Commitment</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                            <input
                                                type="datetime-local"
                                                className="w-full pl-11 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                                                value={shippingData.estimated_delivery_at}
                                                onChange={(e) => setShippingData(prev => ({ ...prev, estimated_delivery_at: e.target.value }))}
                                            />
                                        </div>
                                        <p className="mt-2 px-1 text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                            <Clock size={10} /> Customers can reschedule until the order is shipped.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Delivery Partner / Note</label>
                                        <textarea
                                            placeholder="e.g. Out with Driver Rajesh (+91 99XXXXXX)"
                                            rows={2}
                                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white resize-none"
                                            value={shippingData.status_notes}
                                            onChange={(e) => setShippingData(prev => ({ ...prev, status_notes: e.target.value }))}
                                        />
                                    </div>

                                    {/* Policy Reference for Admin */}
                                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <AlertCircle size={10} /> Shipping Guidelines
                                        </p>
                                        <ul className="text-[9px] font-bold text-amber-700/80 dark:text-amber-500/80 space-y-1 ml-1">
                                            <li>• Standard Delivery: 3–7 business days post-shipping.</li>
                                            <li>• Retries: Max 2-3 attempts before warehouse return.</li>
                                            <li>• Quality: Advise customer to reject if parcel is tampered/torn.</li>
                                        </ul>
                                    </div>
                                </div>

                                <button
                                    onClick={() => updateStatus(shippingModal.id, 'shipped', shippingData.tracking_number, shippingData.estimated_delivery_at, shippingData.status_notes)}
                                    disabled={updatingId === shippingModal.id}
                                    className="w-full py-5 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20"
                                >
                                    {updatingId === shippingModal.id ? <RefreshCw className="animate-spin" size={18} /> : <Truck size={18} />}
                                    Finalize Shipment
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
