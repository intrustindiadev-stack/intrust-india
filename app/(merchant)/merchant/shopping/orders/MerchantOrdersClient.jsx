"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
    Package, Search, Clock, CheckCircle2, Truck,
    TrendingUp, TrendingDown, DollarSign, ShoppingBag,
    ChevronDown, ChevronUp, MapPin, ArrowUpRight, AlertTriangle,
    RotateCcw, Receipt
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_CONFIG = {
    pending:   { label: "Pending",   color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20", icon: Clock },
    packed:    { label: "Packed",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",  icon: Package },
    shipped:   { label: "Shipped",   color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20",icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20",icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",   icon: AlertTriangle },
};

const STATUS_FLOW = ["pending", "packed", "shipped", "delivered"];

export default function MerchantOrdersClient({ orders: initialOrders, stats, merchantId }) {
    const supabase = createClient();
    const [orders, setOrders] = useState(initialOrders);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const filtered = orders.filter(o => {
        const matchesFilter = filter === "all" || o.delivery_status === filter;
        const matchesSearch = !search ||
            o.id.toLowerCase().includes(search.toLowerCase()) ||
            (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
            (o.items || []).some(i => i.product_title?.toLowerCase().includes(search.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    const getNextStatus = (current) => {
        const idx = STATUS_FLOW.indexOf(current);
        return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    };

    const updateStatus = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            const { error } = await supabase
                .from("shopping_order_groups")
                .update({ delivery_status: newStatus })
                .eq("id", orderId);
            if (error) throw error;
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_status: newStatus } : o));
        } catch (err) {
            alert("Failed to update: " + err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                            <Package className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Orders Hub</h1>
                            <p className="text-gray-400 text-sm mt-0.5">Track fulfillment and monitor your earnings</p>
                        </div>
                    </div>
                </div>
                <Link
                    href="/merchant/shopping/inventory"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-all"
                >
                    <ShoppingBag size={14} /> My Inventory
                </Link>
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: "Total Revenue",
                        value: `₹${((stats.totalRevenue || 0) / 100).toLocaleString("en-IN")}`,
                        icon: DollarSign,
                        color: "text-emerald-400",
                        bg: "bg-emerald-500/10",
                        sub: `${stats.totalOrders} orders`
                    },
                    {
                        label: "Gross Profit",
                        value: `₹${((stats.totalGrossProfit || 0) / 100).toLocaleString("en-IN")}`,
                        icon: TrendingUp,
                        color: "text-blue-400",
                        bg: "bg-blue-500/10",
                        sub: "Before platform fee"
                    },
                    {
                        label: "Platform Fee (5%)",
                        value: `₹${((stats.totalCommission || 0) / 100).toLocaleString("en-IN")}`,
                        icon: TrendingDown,
                        color: "text-amber-400",
                        bg: "bg-amber-500/10",
                        sub: "Deducted by InTrust"
                    },
                    {
                        label: "Net Earnings",
                        value: `₹${((stats.totalNetProfit || 0) / 100).toLocaleString("en-IN")}`,
                        icon: Receipt,
                        color: "text-violet-400",
                        bg: "bg-violet-500/10",
                        sub: `${stats.deliveredOrders} delivered`
                    },
                ].map(s => (
                    <div key={s.label} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-gray-400 text-xs font-medium">{s.label}</span>
                            <div className={`p-1.5 ${s.bg} rounded-lg`}>
                                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                            </div>
                        </div>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-gray-500 text-[11px] mt-1">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by order ID, customer, product..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/40 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {["all", "pending", "packed", "shipped", "delivered", "cancelled"].map(f => {
                        const cfg = f === "all" ? { label: "All", color: "text-gray-300", bg: "" } : STATUS_CONFIG[f];
                        const count = f === "all" ? orders.length : orders.filter(o => o.delivery_status === f).length;
                        return (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    filter === f ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "hover:bg-white/10 text-gray-400"
                                }`}
                            >
                                {cfg.label}
                                <span className={`px-1 py-0.5 rounded-md text-[9px] font-black ${filter === f ? "bg-white/20" : "bg-white/10"}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                        <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-400">No orders found</h3>
                        <p className="text-gray-500 mt-2 text-sm">New orders will appear here when customers buy from you.</p>
                    </div>
                ) : (
                    filtered.map(order => {
                        const cfg = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending;
                        const StatusIcon = cfg.icon;
                        const nextStatus = getNextStatus(order.delivery_status);
                        const isExpanded = expandedId === order.id;
                        const isUpdating = updatingId === order.id;
                        const isCancelled = order.delivery_status === "cancelled";

                        const orderGrossProfit = (order.items || []).reduce((s, i) => s + (i.gross_profit_paise || 0), 0);
                        const orderCommission = (order.items || []).reduce((s, i) => s + (i.commission_amount_paise || 0), 0);
                        const orderNetProfit = (order.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0);

                        return (
                            <div
                                key={order.id}
                                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
                            >
                                {/* Order Header (always visible) */}
                                <div
                                    className="p-5 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        {/* Left: ID + status + date */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                                                <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-white font-mono text-sm">#{order.id.slice(0, 12).toUpperCase()}</p>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <p className="text-gray-400 text-xs">
                                                        {order.created_at ? format(new Date(order.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                                                    </p>
                                                    {order.customer_name && (
                                                        <p className="text-gray-500 text-xs truncate">{order.customer_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: amount + earnings */}
                                        <div className="flex items-center gap-5 shrink-0">
                                            <div className="text-right">
                                                <p className="font-bold text-white">₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                                <p className="text-xs text-emerald-400 font-bold">
                                                    Net: ₹{(orderNetProfit / 100).toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                            {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 p-5 space-y-5">
                                        {/* Delivery Address */}
                                        {order.delivery_address && (
                                            <div className="flex items-start gap-2 text-xs text-gray-400">
                                                <MapPin size={12} className="mt-0.5 text-gray-500 shrink-0" />
                                                <span>{order.delivery_address}</span>
                                            </div>
                                        )}

                                        {/* Items */}
                                        <div className="space-y-3">
                                            {(order.items || []).map(item => {
                                                const gstRate = item.gst_percentage || 0;
                                                const totalPaise = item.total_price_paise || 0;
                                                const baseTaxable = totalPaise / (1 + gstRate / 100);
                                                const gstAmount = totalPaise - baseTaxable;

                                                return (
                                                    <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                                        <div className="w-12 h-12 bg-white/10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                                                            {item.product_image ? (
                                                                <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package size={18} className="text-gray-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="text-sm font-semibold text-white truncate">{item.product_title}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                        {item.hsn_code && <span className="text-[9px] text-gray-500 font-medium">HSN: {item.hsn_code}</span>}
                                                                        {gstRate > 0 && <span className="text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded font-black">GST {gstRate}%</span>}
                                                                        <span className="text-[9px] text-gray-500">× {item.quantity}</span>
                                                                    </div>
                                                                </div>
                                                                <p className="font-bold text-white text-sm shrink-0">₹{(totalPaise / 100).toLocaleString("en-IN")}</p>
                                                            </div>
                                                            {/* Tax breakdown */}
                                                            {gstRate > 0 && (
                                                                <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-gray-500">
                                                                    <span>Base: ₹{(baseTaxable / 100).toFixed(2)}</span>
                                                                    <span>CGST {gstRate/2}%: ₹{(gstAmount / 200).toFixed(2)}</span>
                                                                    <span>SGST {gstRate/2}%: ₹{(gstAmount / 200).toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Financial Breakdown */}
                                        <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-2">
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Transaction Summary</p>
                                            {[
                                                { label: "Order Total", value: order.total_amount_paise || 0, color: "text-white" },
                                                { label: "Gross Profit", value: orderGrossProfit, color: "text-blue-400" },
                                                { label: "Platform Commission (5%)", value: -orderCommission, color: "text-amber-400" },
                                            ].map(row => (
                                                <div key={row.label} className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-400">{row.label}</span>
                                                    <span className={`font-bold ${row.color}`}>
                                                        {row.value < 0 ? "−" : ""}₹{(Math.abs(row.value) / 100).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                                <span className="font-black text-white text-sm">Your Net Earnings</span>
                                                <span className="font-black text-emerald-400 text-lg">₹{(orderNetProfit / 100).toLocaleString("en-IN")}</span>
                                            </div>
                                        </div>

                                        {/* Status Actions */}
                                        {!isCancelled && (
                                            <div className="flex items-center justify-between pt-2">
                                                <p className="text-xs text-gray-500">Update fulfillment status:</p>
                                                <div className="flex gap-2">
                                                    {nextStatus && (
                                                        <button
                                                            onClick={() => updateStatus(order.id, nextStatus)}
                                                            disabled={isUpdating}
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all disabled:opacity-50"
                                                        >
                                                            {isUpdating ? <RotateCcw size={12} className="animate-spin" /> : <ArrowUpRight size={12} />}
                                                            Mark as {STATUS_CONFIG[nextStatus]?.label}
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/orders/${order.id}/invoice`}
                                                        target="_blank"
                                                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 text-xs font-semibold transition-all"
                                                    >
                                                        Invoice
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
