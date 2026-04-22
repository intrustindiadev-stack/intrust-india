"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
    Package, Search, Clock, CheckCircle2, Truck,
    TrendingUp, TrendingDown, DollarSign, ShoppingBag,
    ChevronDown, ChevronUp, MapPin, ArrowUpRight, AlertTriangle,
    RotateCcw, Receipt, Store, Filter, Calendar, ExternalLink,
    MoreVertical, Download, X, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StoreCreditRequestsTab from "./StoreCreditRequestsTab";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";
import { calculatePlatformFeePercentage } from "@/lib/utils/ledger";
import { toast } from "react-hot-toast";

const STATUS_CONFIG = {
    pending: { label: "Pending", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20 dark:border-amber-500/30", icon: Clock },
    packed: { label: "Packed", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20 dark:border-blue-500/30", icon: Package },
    shipped: { label: "Shipped", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20 dark:border-violet-500/30", icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20 dark:border-emerald-500/30", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", border: "border-red-500/20 dark:border-red-500/30", icon: AlertTriangle },
};

const STATUS_FLOW = ["pending", "packed", "shipped", "delivered"];

const OrderCard = ({ order, cfg, nextStatus, isExpanded, isUpdating, onUpdate, onToggle, isCancelled, merchantInfo, setShippingModal, setShippingData }) => {
    const orderGrossProfit = (order.items || []).reduce((s, i) => s + (i.gross_profit_paise || 0), 0);
    const orderCommission = order.platform_cut_paise ?? (order.items || []).reduce((s, i) => s + (i.commission_amount_paise || 0), 0);
    const orderNetProfit = (order.merchant_profit_paise ?? 0) !== 0 ? order.merchant_profit_paise : (order.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0);

    // Cost and Pure Profit Logic
    const orderTotalCost = (order.items || []).reduce((s, i) => s + ((i.cost_price_paise || 0) * i.quantity), 0);
    const orderPureProfit = orderNetProfit;
    const StatusIcon = cfg.icon;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg dark:hover:shadow-none hover:border-emerald-500/30 dark:hover:border-white/20 ${isExpanded ? 'ring-1 ring-emerald-500/20 shadow-xl' : ''}`}
        >
            {/* Header / Clickable Area */}
            <div
                className="p-5 cursor-pointer select-none"
                onClick={onToggle}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* ID + Status Section */}
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center shrink-0 border ${cfg.border} shadow-inner`}>
                            <StatusIcon className={`w-6 h-6 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-slate-900 dark:text-white font-black tracking-widest text-sm font-mono opacity-90 group-hover:opacity-100 transition-opacity">
                                    #{order.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-tighter border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                    {cfg.label}
                                </span>
                                {order.settlement_status === 'admin_takeover' && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-tighter border text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20">
                                        Takeover
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 font-medium">
                                <Calendar size={12} className="opacity-50" />
                                <span>{order.created_at ? format(new Date(order.created_at), "dd MMM, HH:mm") : "N/A"}</span>
                                <span className="opacity-20">•</span>
                                <span className="truncate">{order.customer_name || "Guest User"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Section */}
                    <div className="flex items-center justify-end gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 dark:text-gray-500 font-black uppercase tracking-wider mb-0.5">Order Total</p>
                            <p className="font-bold text-slate-900 dark:text-white text-lg leading-none">₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-500/70 font-black uppercase tracking-wider mb-0.5">Net Income</p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg leading-none">₹{(orderNetProfit / 100).toLocaleString("en-IN")}</p>
                        </div>
                        <div className={`p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown size={14} className="text-slate-500 dark:text-gray-400" />
                        </div>
                    </div>
                </div>
            </div>
            {/* View Details quick link */}
            <div className="px-5 pb-3 -mt-1 flex justify-end" onClick={e => e.stopPropagation()}>
                <Link
                    href={`/merchant/shopping/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors uppercase tracking-widest"
                >
                    <ExternalLink size={10} /> View Full Detail
                </Link>
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
                        <div className="p-6 pt-2 space-y-6">
                            {/* Meta Info */}
                            {order.delivery_address && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05]">
                                    <MapPin size={14} className="text-slate-400 dark:text-gray-500 shrink-0" />
                                    <span className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed italic">{order.delivery_address}</span>
                                </div>
                            )}

                            {/* Items List */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest px-1">Order Items ({order.items?.length || 0})</p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {(order.items || []).map(item => {
                                        const gstRate = item.gst_percentage || 0;
                                        const totalPaise = item.total_price_paise || 0;
                                        const baseTaxable = totalPaise;
                                        const gstAmount = Math.round(totalPaise * gstRate / 100);

                                        return (
                                            <div key={item.id} className="relative group/item flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.05] hover:border-emerald-500/20 dark:hover:border-white/10 transition-all">
                                                <div className="w-16 h-16 bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-none">
                                                    {item.product_image ? (
                                                        <img src={item.product_image} alt="" className="w-full h-full object-cover dark:opacity-80 group-hover/item:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <Package size={24} className="text-slate-300 dark:text-gray-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white/90 truncate group-hover/item:text-emerald-600 dark:group-hover/item:text-white transition-colors">{item.product_title}</h4>
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">₹{(totalPaise / 100).toLocaleString("en-IN")}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/20 flex items-center gap-1">
                                                            <Store size={8} /> STORE
                                                        </span>
                                                        <span className="text-[9px] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-tight">× {item.quantity} units</span>
                                                        {gstRate > 0 && <span className="text-[9px] text-teal-600 dark:text-teal-400/80 font-black">GST {gstRate}%</span>}
                                                    </div>
                                                    {gstRate > 0 && (
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-gray-600 font-medium">
                                                            <span>Base: ₹{(baseTaxable / 100).toFixed(2)}</span>
                                                            <span className="opacity-30">|</span>
                                                            <span>Tax: ₹{(gstAmount / 100).toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Financial Summary Ledger */}
                            <div className="bg-gradient-to-br from-slate-50 to-white dark:from-white/[0.04] dark:to-transparent border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
                                <div className="p-4 border-b border-slate-100 dark:border-white/[0.05] bg-slate-100/50 dark:bg-white/[0.03]">
                                    <p className="text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Receipt size={12} className="text-slate-400 dark:text-gray-500" /> Transaction Ledger
                                    </p>
                                </div>
                                <div className="p-5 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 dark:text-gray-500 font-medium tracking-wide">Gross Transaction Value</span>
                                        <span className="font-bold text-slate-900 dark:text-white tracking-widest">₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 dark:text-gray-500 font-medium tracking-wide">Gross Sale Value</span>
                                        <span className="font-bold text-slate-900 dark:text-white">₹{(orderGrossProfit / 100).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 dark:text-gray-500 font-medium tracking-wide">Product Inventory Cost</span>
                                        <span className="font-bold text-red-600 dark:text-red-400">−₹{(orderTotalCost / 100).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-500 dark:text-gray-500 font-medium tracking-wide">Platform Fee</span>
                                            {calculatePlatformFeePercentage(order.commission_rate, orderCommission, orderGrossProfit) !== null && (
                                                <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 font-black">
                                                    {calculatePlatformFeePercentage(order.commission_rate, orderCommission, orderGrossProfit)}%
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-bold text-amber-600 dark:text-amber-500/90">−₹{(orderCommission / 100).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/[0.05] flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-tight mb-0.5">Final Net Credit</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-500/70 font-medium italic">
                                                {order.settlement_status === 'settled' ? 'Settled to your wallet' : 'Pending settlement'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-tight mb-0.5">Net Payout</p>
                                            <span className="block text-xl font-black text-slate-900 dark:text-white tracking-tighter">₹{(orderNetProfit / 100).toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>

                                    {/* Pure Margin Highlight */}
                                    <div className="mt-3 pt-3 border-t border-dashed border-emerald-500/20 bg-emerald-500/5 -mx-5 px-5 py-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                <Sparkles size={12} className="text-emerald-500" />
                                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Pure Margin Profit</span>
                                            </div>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                                ₹{(orderPureProfit / 100).toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Settlement Status Badges */}
                            {order.settlement_status === 'admin_takeover' && (
                                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                                    <AlertTriangle size={14} />
                                    ⚠️ Admin Takeover — 30% Commission (Reduced)
                                </div>
                            )}
                            {order.settlement_status === 'pending' && order.delivery_status === 'pending' && (
                                <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                                    <Clock size={14} />
                                    ⏳ Pending Settlement — approve within 2 hours to keep 70%
                                </div>
                            )}

                            {/* Action Bar */}
                            {!isCancelled && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 sm:pt-2 border-t border-slate-100 sm:border-0 dark:border-white/5">
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-500/70 font-semibold bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10 w-fit shrink-0">
                                        <CheckCircle2 className="shrink-0" size={14} />
                                        <span>Ready for next stage</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:flex sm:items-center gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShippingModal({ ...order, mode: 'schedule' });
                                                setShippingData({
                                                    tracking_number: order.tracking_number || '',
                                                    estimated_delivery_at: order.estimated_delivery_at ? format(new Date(order.estimated_delivery_at), "yyyy-MM-dd'T'HH:mm") : format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
                                                    status_notes: order.status_notes || ''
                                                });
                                            }}
                                            className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <Calendar size={14} /> Schedule
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                generateOrderInvoice({
                                                    order: {
                                                        ...order,
                                                        delivery_fee_paise: order.delivery_fee_paise || 0,
                                                    },
                                                    items: order.items || [],
                                                    seller: {
                                                        name: merchantInfo?.business_name || 'Merchant Store',
                                                        address: merchantInfo?.business_address || '',
                                                        phone: merchantInfo?.business_phone || '',
                                                        gstin: merchantInfo?.gst_number || 'Unregistered',
                                                    },
                                                    customer: {
                                                        name: order.customer_name || 'Customer',
                                                        phone: order.customer_phone || '',
                                                        address: order.delivery_address || '',
                                                    },
                                                    type: 'shopping',
                                                });
                                            }}
                                            className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 text-xs font-black transition-all flex items-center gap-2 tracking-wide"
                                        >
                                            <Download size={14} /> PDF INVOICE
                                        </button>
                                        {nextStatus && order.settlement_status !== 'settled' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUpdate(order.id, nextStatus);
                                                }}
                                                disabled={isUpdating}
                                                className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 group/btn"
                                            >
                                                {isUpdating ? <RotateCcw size={14} className="animate-spin" /> : <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />}
                                                MARK AS {STATUS_CONFIG[nextStatus]?.label.toUpperCase()}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default function MerchantOrdersClient({ orders: initialOrders, stats, merchantId, merchantInfo, error }) {
    const router = useRouter();
    const supabase = createClient();
    const [orders, setOrders] = useState(initialOrders);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [activeView, setActiveView] = useState("orders"); // "orders" | "credits"
    const [shippingModal, setShippingModal] = useState(null); // { id: string }
    const [shippingData, setShippingData] = useState({
        tracking_number: '',
        estimated_delivery_at: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
        status_notes: ''
    });

    const [pendingCreditsCount, setPendingCreditsCount] = useState(0);

    useEffect(() => {
        const fetchPendingCreditsCount = async () => {
            if (!merchantId) return;
            const { count, error } = await supabase
                .from('udhari_requests')
                .select('*', { count: 'exact', head: true })
                .eq('merchant_id', merchantId)
                .eq('status', 'pending')
                .eq('source_type', 'shop_order');

            if (!error && count !== null) {
                setPendingCreditsCount(count);
            }
        };

        fetchPendingCreditsCount();
    }, [merchantId, supabase]);

    useEffect(() => {
        if (!merchantId) return;

        const channel = supabase
            .channel(`merchant-orders-${merchantId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'shopping_order_groups',
                filter: `merchant_id=eq.${merchantId}`,
            }, () => {
                toast.success('New order received! 🛒');
                router.refresh();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'shopping_order_groups',
                filter: `merchant_id=eq.${merchantId}`,
            }, (payload) => {
                setOrders(prev =>
                    prev.map(o =>
                        o.id === payload.new.id
                            ? { ...o, ...payload.new }
                            : o
                    )
                );
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [merchantId, supabase, router]);

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

    // Maps known DB/RPC error strings to merchant-safe messages.
    const getFulfillmentErrorMessage = (err) => {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("non_zero_amount") || msg.includes("non zero"))
            return "Order payout is ₹0 — no payment was credited. Contact support if this is unexpected.";
        if (msg.includes("settlement_status") || msg.includes("already settled"))
            return "This order has already been settled and cannot be updated again.";
        if (msg.includes("insufficient"))
            return "Could not update order: insufficient data. Please refresh and try again.";
        if (msg.includes("unauthorized"))
            return "You are not authorised to update this order.";
        return "Order update failed. Please try again or contact support.";
    };

    const updateStatus = async (orderId, newStatus, tracking = null, estAt = null, notes = null) => {
        if (newStatus === 'shipped' && !tracking && !shippingModal) {
            setShippingModal({ id: orderId });
            return;
        }

        setUpdatingId(orderId);
        try {
            const { data, error } = await supabase.rpc("update_order_delivery_v3", {
                p_order_id: orderId,
                p_new_status: newStatus,
                p_tracking_number: tracking,
                p_estimated_at: estAt,
                p_status_notes: notes,
                p_is_merchant: true
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "Status update failed");

            setOrders(prev => prev.map(o => o.id === orderId ? {
                ...o,
                delivery_status: newStatus,
                tracking_number: tracking || o.tracking_number,
                estimated_delivery_at: estAt || o.estimated_delivery_at,
                status_notes: notes || o.status_notes
            } : o));
            setShippingModal(null);
            setShippingData({
                tracking_number: '',
                estimated_delivery_at: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
                status_notes: ''
            });
        } catch (err) {
            console.error("[MerchantOrders] status update failed:", err);
            toast.error(getFulfillmentErrorMessage(err));
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <>
            <div className="space-y-10 pb-20">
                {/* Comment 7: Error banner — shown when server-side data fetch fails */}
                {error && (
                    <div className="flex items-start gap-4 p-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">Unable to load orders</p>
                            <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Please try refreshing the page. If the issue persists, <a href="mailto:support@intrust.in" className="underline hover:no-underline">contact support</a>.</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="shrink-0 text-xs font-black text-red-600 dark:text-red-400 hover:underline uppercase tracking-widest"
                        >
                            Retry
                        </button>
                    </div>
                )}
                {/* Header Hero Section */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white shadow-xl dark:shadow-none dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 p-8 rounded-3xl backdrop-blur-md">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                                    <ShoppingBag className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Merchant Orders</h1>
                            </div>
                            <p className="text-slate-500 dark:text-gray-400 text-sm font-medium pl-1 hidden sm:block">Monitor your commerce performance and manage order fulfillment pipeline.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href="/merchant/shopping/wholesale"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-sm font-black text-black transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                            >
                                <ArrowUpRight size={16} /> BUY STOCK
                            </Link>
                            <Link
                                href="/merchant/shopping/inventory"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20 text-sm font-black text-white border border-slate-800 dark:border-white/10 transition-all backdrop-blur-md"
                            >
                                <Store size={16} /> MANAGE SHOP
                            </Link>
                        </div>
                    </div>
                </div>

                {merchantInfo?.auto_mode && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0a1f16] border border-emerald-500/30 rounded-[2rem] p-5 md:p-6 relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)] group flex items-center gap-4"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 to-transparent opacity-50 blur-xl pointer-events-none"></div>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 relative z-10">
                            <Sparkles className="text-emerald-400" size={24} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-emerald-400 font-black text-sm uppercase tracking-widest mb-1 drop-shadow-md">Auto Mode Active</h3>
                            <p className="text-emerald-100/70 text-xs md:text-sm font-medium tracking-tight leading-relaxed max-w-xl">Focus on your business. Intrust AI is automatically evaluating and processing incoming orders.</p>
                        </div>
                    </motion.div>
                )}

                {/* Performance KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Gross Revenue", value: (stats.totalRevenue || 0) / 100, icon: DollarSign, color: "text-slate-900 dark:text-white", bg: "bg-slate-100 dark:bg-white/10", border: "border-slate-200 dark:border-white/10", sub: `${stats.totalOrders} total orders` },
                        { label: "Sales Profit", value: (stats.totalGrossProfit || 0) / 100, icon: TrendingUp, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 dark:bg-blue-500/20", border: "border-blue-200 dark:border-blue-500/30", sub: "Earned from products" },
                        { label: "Platform Fee", value: -(stats.totalCommission || 0) / 100, icon: TrendingDown, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 dark:bg-amber-500/20", border: "border-amber-200 dark:border-amber-500/30", sub: stats.totalRevenue > 0 ? `${((stats.totalCommission / stats.totalRevenue) * 100).toFixed(1)}% effective rate` : "Platform commission" },
                        { label: "Net Earnings", value: (stats.totalNetProfit || 0) / 100, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-500/20", border: "border-emerald-200 dark:border-emerald-500/40", sub: `${stats.deliveredOrders} orders settled` },
                    ].map((s, idx) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group bg-white dark:bg-white/[0.03] backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-3xl p-6 hover:shadow-lg dark:hover:shadow-none hover:border-emerald-500/20 dark:hover:bg-white/[0.05] dark:hover:border-white/20 transition-all"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 ${s.bg} rounded-xl border ${s.border}`}>
                                    <s.icon className={`w-4 h-4 ${s.color}`} />
                                </div>
                                <span className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">{s.label}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-black tracking-tighter ${s.color}`}>
                                    {s.value < 0 ? "−" : ""}₹{Math.abs(s.value).toLocaleString("en-IN")}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold mt-2 uppercase tracking-tight opacity-70">{s.sub}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 mb-8 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveView("orders")}
                        className={`px-6 py-2 rounded-lg text-sm font-black tracking-tight transition-all ${activeView === "orders" ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Standard Orders
                    </button>
                    <button
                        onClick={() => setActiveView("credits")}
                        className={`relative px-6 py-2 rounded-lg text-sm font-black tracking-tight transition-all ${activeView === "credits" ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Store Credit Requests
                        {pendingCreditsCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                </div>

                {activeView === "orders" ? (
                    <>
                        {/* Smart Search & Global Filters */}
                        <div className="sticky top-20 z-20 flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-white/80 dark:bg-black/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 p-3 rounded-2xl shadow-xl dark:shadow-2xl">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Scan Order ID, Customer Name, or Product Brand..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:ring-1 focus:ring-emerald-500/40 focus:bg-white dark:focus:bg-white/[0.07] outline-none transition-all font-medium tracking-tight"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
                                {["all", "pending", "packed", "shipped", "delivered", "cancelled"].map(f => {
                                    const count = f === "all" ? orders.length : orders.filter(o => o.delivery_status === f).length;
                                    return (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${filter === f ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-500"
                                                }`}
                                        >
                                            {f}
                                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${filter === f ? "bg-black/10" : "bg-slate-200 dark:bg-white/10"}`}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Orders Feed */}
                        <div className="space-y-6">
                            {filtered.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-32 bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-[3rem] space-y-4 shadow-inner"
                                >
                                    <div className="w-20 h-20 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border border-slate-100 dark:border-white/10 shadow-sm">
                                        <Package className="w-10 h-10 text-slate-300 dark:text-gray-700" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-700 dark:text-gray-300">Clean Slate</h3>
                                        <p className="text-slate-500 dark:text-gray-500 text-sm mt-1 max-w-xs mx-auto">We couldn't find any orders matching your current search or filter criteria.</p>
                                    </div>
                                    {search && (
                                        <button
                                            onClick={() => { setSearch(""); setFilter("all"); }}
                                            className="text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest hover:underline"
                                        >
                                            Clear all filters
                                        </button>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="space-y-4">
                                    {filtered.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            cfg={STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending}
                                            nextStatus={getNextStatus(order.delivery_status)}
                                            isExpanded={expandedId === order.id}
                                            isUpdating={updatingId === order.id}
                                            isCancelled={order.delivery_status === "cancelled"}
                                            onUpdate={updateStatus}
                                            onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                                            merchantInfo={merchantInfo}
                                            setShippingModal={setShippingModal}
                                            setShippingData={setShippingData}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="relative">
                        <StoreCreditRequestsTab merchantId={merchantId} />
                    </div>
                )}
            </div>

            {/* Shipping Modal */}
            <AnimatePresence>
                {shippingModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShippingModal(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/10"
                        >
                            <div className="p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px]">Order #{shippingModal.id.slice(0, 8)}</h4>
                                        <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-0.5 whitespace-nowrap">
                                            Order Fulfillment
                                        </p>
                                    </div>
                                    <button onClick={() => setShippingModal(null)} className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Tracking ID / Number</label>
                                        <div className="relative">
                                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Enter shipping tracking ID..."
                                                className="w-full pl-11 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                                                value={shippingData.tracking_number}
                                                onChange={(e) => setShippingData(prev => ({ ...prev, tracking_number: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Estimated Delivery (Manual Date & Time)</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                            <input
                                                type="datetime-local"
                                                className="w-full pl-11 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                                                value={shippingData.estimated_delivery_at}
                                                onChange={(e) => setShippingData(prev => ({ ...prev, estimated_delivery_at: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Delivery Person / Notes</label>
                                        <textarea
                                            placeholder="e.g. Delivery Partner: Rahul (+91 98XXX XXXXX)"
                                            rows={2}
                                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm text-slate-900 dark:text-white resize-none"
                                            value={shippingData.status_notes}
                                            onChange={(e) => setShippingData(prev => ({ ...prev, status_notes: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <button
                                        onClick={() => updateStatus(
                                            shippingModal.id,
                                            shippingModal.mode === 'schedule' ? shippingModal.delivery_status : 'shipped',
                                            shippingData.tracking_number,
                                            shippingData.estimated_delivery_at,
                                            shippingData.status_notes
                                        )}
                                        disabled={updatingId === shippingModal.id}
                                        className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50 ${shippingModal.mode === 'schedule'
                                            ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                                            : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                                            }`}
                                    >
                                        {updatingId === shippingModal.id ? (
                                            <RotateCcw className="animate-spin" size={18} />
                                        ) : (
                                            <>
                                                {shippingModal.mode === 'schedule' ? <Calendar size={18} /> : <Truck size={18} />}
                                                {shippingModal.mode === 'schedule' ? 'SAVE DELIVERY INFO' : 'CONFIRM SHIPMENT'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
