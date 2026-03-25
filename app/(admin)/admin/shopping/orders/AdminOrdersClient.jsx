"use client";

import React, { useState, useTransition } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
    ShoppingBag, Package, Truck, CheckCircle2, XCircle, Clock,
    TrendingUp, DollarSign, Store, ChevronRight, Filter, Search,
    AlertCircle, RotateCcw, Eye, MapPin, RefreshCw, X, ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const STATUS_CONFIG = {
    pending:   { label: "Pending",   color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  icon: Clock },
    packed:    { label: "Packed",    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200",   icon: Package },
    shipped:   { label: "Shipped",   color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200",icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-500",    bg: "bg-red-50",    border: "border-red-200",    icon: XCircle },
};

const STATUS_FLOW = ["pending", "packed", "shipped", "delivered"];

export default function AdminOrdersClient({ orders: initialOrders, stats }) {
    const supabase = createClient();
    const router = useRouter();
    const [orders, setOrders] = useState(initialOrders);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all"); // all | platform | merchant
    const [updatingId, setUpdatingId] = useState(null);
    const [isPending, startTransition] = useTransition();

    const filteredOrders = orders.filter(order => {
        const matchesSearch = !searchQuery || 
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.merchant_name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || order.delivery_status === statusFilter;
        const matchesType = typeFilter === "all" ||
            (typeFilter === "platform" && order.is_platform_order) ||
            (typeFilter === "merchant" && !order.is_platform_order);
        return matchesSearch && matchesStatus && matchesType;
    });

    const updateStatus = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            const { data, error } = await supabase.rpc("admin_update_order_status", {
                p_order_id: orderId,
                p_delivery_status: newStatus
            });
            if (error || !data?.success) throw new Error(error?.message || "Failed");
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_status: newStatus } : o));
        } catch (err) {
            alert("Failed to update status: " + err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const getNextStatus = (current) => {
        const idx = STATUS_FLOW.indexOf(current);
        return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    };

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen bg-[#f8f9fb]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">
                        <ShoppingBag size={12} className="text-blue-600" /> Order Management
                    </div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">
                        All <span className="text-blue-600">Orders</span>
                    </h1>
                    <p className="text-slate-400 font-medium mt-1">Track and manage all platform and merchant orders</p>
                </div>
                <Link href="/admin/shopping" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                    ← Back to Shopping
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {[
                    { label: "Total", value: stats.total, icon: ShoppingBag, color: "text-slate-700", bg: "bg-slate-100" },
                    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "In Transit", value: stats.inProgress, icon: Truck, color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Delivered", value: stats.delivered, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Cancelled", value: stats.cancelled, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
                    { label: "Revenue", value: `₹${((stats.totalRevenue || 0) / 100).toLocaleString('en-IN')}`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                            <s.icon size={18} />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-900 leading-none">{s.value}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by order ID, customer name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-1.5 flex-wrap">
                    {["all", "pending", "packed", "shipped", "delivered", "cancelled"].map(s => {
                        const cfg = s === "all" ? { label: "All", color: "text-slate-600", bg: "bg-slate-100" } : STATUS_CONFIG[s];
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    statusFilter === s ? `${cfg.bg} ${cfg.color} ring-1 ring-current` : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                }`}
                            >
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>

                {/* Type Filter */}
                <div className="flex gap-1.5">
                    {[
                        { id: "all", label: "All" },
                        { id: "platform", label: "Platform" },
                        { id: "merchant", label: "Merchant" }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTypeFilter(t.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                typeFilter === t.id ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50">
                    {["Order / Customer", "Seller", "Amount", "Date", "Status", "Action"].map(h => (
                        <p key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</p>
                    ))}
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="py-20 text-center">
                        <ShoppingBag size={40} className="mx-auto text-slate-100 mb-3" />
                        <p className="text-slate-400 font-bold">No orders found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredOrders.map(order => {
                            const cfg = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending;
                            const StatusIcon = cfg.icon;
                            const nextStatus = getNextStatus(order.delivery_status);
                            const isUpdating = updatingId === order.id;
                            const isCancelled = order.delivery_status === "cancelled";

                            return (
                                <div key={order.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-4 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors">
                                    {/* Order Info */}
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-900 font-mono">#{order.id.slice(0, 12).toUpperCase()}</p>
                                        <p className="text-sm font-bold text-slate-700 mt-0.5 truncate">{order.customer_name || "Unknown Customer"}</p>
                                        {order.delivery_address && (
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                                <MapPin size={9} /> {order.delivery_address?.split(',').slice(-2).join(',')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Seller */}
                                    <div className="min-w-0">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                            order.is_platform_order ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"
                                        }`}>
                                            {order.is_platform_order ? "🏢 Platform" : "🏪 Merchant"}
                                        </span>
                                        {!order.is_platform_order && (
                                            <p className="text-xs font-bold text-slate-600 mt-1 truncate">{order.merchant_name || "Unknown"}</p>
                                        )}
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <p className="text-sm font-black text-slate-900">₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                        {order.item_count > 0 && (
                                            <p className="text-[10px] text-slate-400 font-medium">{order.item_count} item{order.item_count !== 1 ? "s" : ""}</p>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <div>
                                        <p className="text-xs font-bold text-slate-700">
                                            {order.created_at ? format(new Date(order.created_at), "dd MMM") : "—"}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {order.created_at ? format(new Date(order.created_at), "hh:mm a") : ""}
                                        </p>
                                    </div>

                                    {/* Status */}
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                            <StatusIcon size={10} />
                                            {cfg.label}
                                        </span>
                                        {nextStatus && !isCancelled && (
                                            <button
                                                onClick={() => updateStatus(order.id, nextStatus)}
                                                disabled={isUpdating}
                                                title={`Mark as ${STATUS_CONFIG[nextStatus]?.label}`}
                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-400 transition-all disabled:opacity-50"
                                            >
                                                {isUpdating ? <RefreshCw size={12} className="animate-spin" /> : <ArrowUpRight size={12} />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/admin/shopping/orders/${order.id}`}
                                            className="p-2 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                                        >
                                            <Eye size={15} />
                                        </Link>
                                        {!isCancelled && (
                                            <button
                                                onClick={() => updateStatus(order.id, "cancelled")}
                                                disabled={isUpdating}
                                                className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                                                title="Cancel Order"
                                            >
                                                <X size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {filteredOrders.length > 0 && (
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-400">
                            Showing {filteredOrders.length} of {orders.length} orders
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
