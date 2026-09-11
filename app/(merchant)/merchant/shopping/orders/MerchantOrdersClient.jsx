"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
    Package, Search, Clock, CheckCircle2, Truck,
    ShoppingBag, ChevronDown, MapPin, ArrowUpRight, AlertTriangle,
    RotateCcw, Receipt, Store, Calendar, ExternalLink,
    Download, X, Sparkles, Copy, ChevronLeft, ChevronRight,
    CreditCard, Wallet, Filter, Check
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StoreCreditRequestsTab from "./StoreCreditRequestsTab";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";
import { calculatePlatformFeePercentage } from "@/lib/utils/ledger";
import { toast } from "react-hot-toast";
import Image from "next/image";
import {
    PERIOD_OPTIONS,
    filterOrdersByPeriod,
    calculateMerchantOrderKPIs,
    formatPaise,
    isValidOrder,
    isSettledOrder
} from "@/lib/merchant/orderMetrics";

const STATUS_CONFIG = {
    pending: { label: "Pending", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20 dark:border-amber-500/30", icon: Clock },
    packed: { label: "Packed", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20 dark:border-blue-500/30", icon: Package },
    shipped: { label: "Shipped", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20 dark:border-violet-500/30", icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20 dark:border-emerald-500/30", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", border: "border-red-500/20 dark:border-red-500/30", icon: AlertTriangle },
};

const STATUS_FLOW = ["pending", "packed", "shipped", "delivered"];

// ─── Order Detail / Drawer Component (Shared Desktop & Mobile) ───────────────
const OrderDetailDrawer = ({
    order,
    merchantInfo,
    nextStatus,
    isUpdating,
    onUpdate,
    setShippingModal,
    setShippingData
}) => {
    const isCancelled = order.delivery_status === "cancelled";
    const isSettled = isSettledOrder(order);
    const orderGrossProfit = (order.items || []).reduce((s, i) => s + (i.gross_profit_paise || 0), 0);
    const orderCommission = order.platform_cut_paise ?? (order.items || []).reduce((s, i) => s + (i.commission_amount_paise || 0), 0);
    const orderNetProfit = (order.merchant_profit_paise ?? 0) !== 0
        ? order.merchant_profit_paise
        : (order.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0);
    const orderTotalCost = (order.items || []).reduce((s, i) => s + ((i.cost_price_paise || 0) * (i.quantity || 1)), 0);

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-slate-50/60 dark:bg-black/20 border-t border-slate-100 dark:border-white/5">
            {/* Delivery address & tracking if available */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {order.delivery_address && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 shadow-xs">
                        <MapPin size={15} className="text-slate-400 dark:text-gray-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-500">Shipping Address</p>
                            <p className="text-xs text-slate-700 dark:text-gray-300 font-medium leading-relaxed mt-0.5">{order.delivery_address}</p>
                        </div>
                    </div>
                )}
                {order.tracking_number && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 shadow-xs">
                        <Truck size={15} className="text-violet-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-500">Tracking Number</p>
                            <p className="text-xs font-mono font-bold text-slate-800 dark:text-white mt-0.5">{order.tracking_number}</p>
                            {order.estimated_delivery_at && (
                                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">
                                    Est. Delivery: {format(new Date(order.estimated_delivery_at), "dd MMM, HH:mm")}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Item list */}
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                    Order Items ({order.items?.length || 0})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(order.items || []).map((item) => {
                        const gstRate = item.gst_percentage || 0;
                        const totalPaise = item.total_price_paise || (item.unit_price_paise * (item.quantity || 1)) || 0;
                        const gstAmount = Math.round(totalPaise * gstRate / 100);

                        return (
                            <div key={item.id} className="flex gap-3 p-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 shadow-xs">
                                <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative border border-slate-100 dark:border-white/5">
                                    {item.product_image ? (
                                        <Image src={item.product_image} alt="" fill sizes="56px" className="object-cover" />
                                    ) : (
                                        <Package size={20} className="text-slate-300 dark:text-gray-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.product_title}</h4>
                                        <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">₹{((totalPaise) / 100).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[9px] text-slate-500 dark:text-gray-400 font-bold">Qty: {item.quantity}</span>
                                        {gstRate > 0 && (
                                            <span className="text-[9px] text-teal-600 dark:text-teal-400 font-black">GST {gstRate}%</span>
                                        )}
                                    </div>
                                    {gstRate > 0 && (
                                        <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1">
                                            Base: ₹{((totalPaise) / 100).toFixed(2)} · SGST: ₹{(gstAmount / 200).toFixed(2)} · CGST: ₹{(gstAmount / 200).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Transaction Ledger */}
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <Receipt size={12} /> Financial Ledger
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Total Order Amount */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                        <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Customer Paid</p>
                        <p className="text-base font-black text-slate-900 dark:text-white">
                            ₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Inventory Cost */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                        <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Wholesale Cost</p>
                        <p className="text-base font-black text-red-600 dark:text-red-400">
                            ₹{(orderTotalCost / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Gross Profit Margin */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                        <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Gross Margin</p>
                        <p className="text-base font-black text-blue-600 dark:text-blue-400">
                            ₹{(orderGrossProfit / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Platform Fee */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider">Commission</p>
                            {calculatePlatformFeePercentage(order.commission_rate, orderCommission, orderGrossProfit) !== null && (
                                <span className="text-[8px] px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black">
                                    {calculatePlatformFeePercentage(order.commission_rate, orderCommission, orderGrossProfit)}%
                                </span>
                            )}
                        </div>
                        <p className="text-base font-black text-amber-600 dark:text-amber-400">
                            ₹{(orderCommission / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Merchant Payout */}
                    <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30">
                        <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">
                            {isSettled ? "Settled Profit" : "Expected Profit"}
                        </p>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            ₹{(orderNetProfit / 100).toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>

                {/* Settlement state callout */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">
                    {order.settlement_status === "settled" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                            <CheckCircle2 size={13} /> Profit credited to merchant wallet
                        </span>
                    )}
                    {order.settlement_status === "settled_zero" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-[11px] font-bold">
                            Settled with ₹0 profit payout
                        </span>
                    )}
                    {order.settlement_status === "admin_takeover" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[11px] font-bold">
                            <AlertTriangle size={13} /> Admin Takeover — 30% merchant share settled
                        </span>
                    )}
                    {order.settlement_status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                            <Clock size={13} /> Settlement pending fulfillment (contingent profit)
                        </span>
                    )}
                </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-2">
                    <Link
                        href={`/merchant/shopping/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 transition-all"
                    >
                        <ExternalLink size={12} /> View Details
                    </Link>

                    <button
                        onClick={() => {
                            generateOrderInvoice({
                                order: {
                                    ...order,
                                    delivery_fee_paise: order.delivery_fee_paise || 0,
                                },
                                items: order.items || [],
                                seller: {
                                    name: merchantInfo?.business_name || "Merchant Store",
                                    address: merchantInfo?.business_address || "",
                                    phone: merchantInfo?.business_phone || "",
                                    gstin: merchantInfo?.gst_number || "Unregistered",
                                },
                                customer: {
                                    name: order.customer_name || "Customer",
                                    phone: order.customer_phone || "",
                                    address: order.delivery_address || "",
                                },
                                type: "shopping",
                            });
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 transition-all"
                    >
                        <Download size={12} /> Invoice PDF
                    </button>
                </div>

                {!isCancelled && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setShippingModal({ ...order, mode: "schedule" });
                                setShippingData({
                                    tracking_number: order.tracking_number || "",
                                    estimated_delivery_at: order.estimated_delivery_at
                                        ? format(new Date(order.estimated_delivery_at), "yyyy-MM-dd'T'HH:mm")
                                        : format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
                                    status_notes: order.status_notes || ""
                                });
                            }}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-white/20 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                        >
                            <Calendar size={13} /> Schedule
                        </button>

                        {nextStatus && order.settlement_status !== "settled" && (
                            <button
                                onClick={() => onUpdate(order.id, nextStatus)}
                                disabled={isUpdating}
                                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                            >
                                {isUpdating ? (
                                    <RotateCcw size={13} className="animate-spin" />
                                ) : (
                                    <ArrowUpRight size={13} />
                                )}
                                Mark as {STATUS_CONFIG[nextStatus]?.label}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main MerchantOrdersClient Component ─────────────────────────────────────
export default function MerchantOrdersClient({
    orders: initialOrders,
    stats,
    merchantId,
    merchantInfo,
    error
}) {
    const router = useRouter();
    const supabase = createClient();
    const [orders, setOrders] = useState(initialOrders || []);
    const [selectedPeriod, setSelectedPeriod] = useState("all"); // 'all' | 'this_month' | '30d' | '7d' | 'today'
    const [filter, setFilter] = useState("all"); // 'all' | 'pending' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
    const [search, setSearch] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("all"); // 'all' | 'wallet' | 'gateway' | 'store_credit'
    const [expandedId, setExpandedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [activeView, setActiveView] = useState("orders"); // "orders" | "credits"
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const [shippingModal, setShippingModal] = useState(null);
    const [shippingData, setShippingData] = useState({
        tracking_number: "",
        estimated_delivery_at: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
        status_notes: ""
    });

    const [pendingCreditsCount, setPendingCreditsCount] = useState(0);

    // Fetch pending store credit count
    useEffect(() => {
        const fetchPendingCreditsCount = async () => {
            if (!merchantId) return;
            const { count, error } = await supabase
                .from("udhari_requests")
                .select("*", { count: "exact", head: true })
                .eq("merchant_id", merchantId)
                .eq("status", "pending")
                .eq("source_type", "shop_order");

            if (!error && count !== null) {
                setPendingCreditsCount(count);
            }
        };

        fetchPendingCreditsCount();
    }, [merchantId, supabase]);

    // Realtime subscription on shopping_order_groups
    useEffect(() => {
        if (!merchantId) return;

        const channel = supabase
            .channel(`merchant-orders-${merchantId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "shopping_order_groups",
                filter: `merchant_id=eq.${merchantId}`,
            }, (payload) => {
                const row = payload.new;
                if (row.payment_method === "gateway" && row.payment_status === "pending") return;
                if (row.delivery_status === "pending_credit") return;
                if (row.status === "failed" || row.status === "cancelled") return;

                toast.success("New order received! 🛒");
                router.refresh();
            })
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "shopping_order_groups",
                filter: `merchant_id=eq.${merchantId}`,
            }, (payload) => {
                setOrders((prev) => {
                    const exists = prev.some((o) => o.id === payload.new.id);
                    if (!exists) {
                        router.refresh();
                        return prev;
                    }
                    return prev.map((o) =>
                        o.id === payload.new.id ? { ...o, ...payload.new } : o
                    );
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [merchantId, supabase, router]);

    // Calculate Authoritative KPIs for Selected Period
    const kpis = useMemo(() => {
        return calculateMerchantOrderKPIs(orders, selectedPeriod);
    }, [orders, selectedPeriod]);

    // Orders filtered by period first
    const periodOrders = useMemo(() => {
        return filterOrdersByPeriod(orders, selectedPeriod);
    }, [orders, selectedPeriod]);

    // Compute status counts for the selected period
    const statusCounts = useMemo(() => {
        const counts = {
            all: periodOrders.length,
            pending: 0,
            packed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };
        periodOrders.forEach((o) => {
            const st = (o.delivery_status || "").toLowerCase();
            if (counts[st] !== undefined) {
                counts[st]++;
            }
        });
        return counts;
    }, [periodOrders]);

    // Filter by status, payment method, and search
    const filteredOrders = useMemo(() => {
        return periodOrders.filter((o) => {
            const matchesStatus = filter === "all" || (o.delivery_status || "").toLowerCase() === filter;
            const matchesPayment = paymentFilter === "all" || (o.payment_method || "").toLowerCase() === paymentFilter;
            
            if (!matchesStatus || !matchesPayment) return false;

            if (!search) return true;
            const q = search.toLowerCase().trim();
            const matchesId = (o.id || "").toLowerCase().includes(q);
            const matchesCustomer = (o.customer_name || "").toLowerCase().includes(q) || (o.customer_phone || "").includes(q);
            const matchesProduct = (o.items || []).some((i) => (i.product_title || "").toLowerCase().includes(q));

            return matchesId || matchesCustomer || matchesProduct;
        });
    }, [periodOrders, filter, paymentFilter, search]);

    // Reset pagination when filter/search/period changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedPeriod, filter, paymentFilter, search]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, currentPage, pageSize]);

    const getNextStatus = (current) => {
        const idx = STATUS_FLOW.indexOf(current);
        return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    };

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
        if (newStatus === "shipped" && !tracking && !shippingModal) {
            setShippingModal({ id: orderId });
            return;
        }

        setUpdatingId(orderId);
        try {
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    newStatus,
                    trackingNumber: tracking,
                    estimatedAt: estAt,
                    statusNotes: notes,
                    isMerchant: true
                })
            });
            const data = await res.json();
            if (!res.ok || !data?.success) throw new Error(data?.message || data?.error || "Status update failed");

            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? {
                            ...o,
                            delivery_status: newStatus,
                            tracking_number: tracking || o.tracking_number,
                            estimated_delivery_at: estAt || o.estimated_delivery_at,
                            status_notes: notes || o.status_notes,
                            // If order was pending settlement and is now packed/shipped/delivered, update locally to settled
                            settlement_status: o.settlement_status === "pending" && (o.merchant_profit_paise || 0) > 0 ? "settled" : o.settlement_status
                        }
                        : o
                )
            );
            toast.success(`Order updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}!`);
            setShippingModal(null);
            setShippingData({
                tracking_number: "",
                estimated_delivery_at: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
                status_notes: ""
            });
        } catch (err) {
            console.error("[MerchantOrders] status update failed:", err);
            toast.error(getFulfillmentErrorMessage(err));
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-8 pb-32">
            {/* Error Banner */}
            {error && (
                <div className="flex items-start gap-4 p-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-red-700 dark:text-red-400">Unable to load orders</p>
                        <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Please try refreshing the page. If the issue persists, contact merchant support.</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="shrink-0 text-xs font-black text-red-600 dark:text-red-400 hover:underline uppercase tracking-widest"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Page Header with Actions & Period Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 rounded-3xl shadow-xs backdrop-blur-md">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Merchant Orders</h1>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Manage and fulfill your customer shopping orders</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Live Indicator */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">LIVE</span>
                    </div>

                    <Link
                        href="/merchant/shopping/wholesale"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-black transition-all shadow-sm active:scale-95"
                    >
                        <ArrowUpRight size={14} /> BUY STOCK
                    </Link>
                    <Link
                        href="/merchant/shopping/inventory"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-black text-white border border-slate-800 dark:border-white/10 transition-all"
                    >
                        <Store size={14} /> MANAGE SHOP
                    </Link>
                </div>
            </div>

            {/* Auto Mode Active Banner */}
            {merchantInfo?.auto_mode && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-xs">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-slate-800 dark:text-slate-100 font-black text-xs sm:text-sm uppercase tracking-wider">
                                    Auto Mode Active
                                </h3>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/90 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Enabled
                                </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mt-0.5">
                                Intrust AI is automatically evaluating and processing incoming orders for your store.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Period Selector Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/80 dark:bg-white/[0.02] p-2 rounded-2xl border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 px-2 flex items-center gap-1.5">
                    <Calendar size={13} /> Reporting Period
                </span>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {PERIOD_OPTIONS.map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => setSelectedPeriod(opt.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all whitespace-nowrap ${selectedPeriod === opt.key
                                ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10 font-black"
                                : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Performance Cards (Total Sales, Orders, Pending Orders, Settled Earnings) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Sales */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all hover:border-emerald-500/30"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <ShoppingBag size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-400">Total Sales</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            ₹{kpis.totalSalesFormatted}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-1.5 flex items-center gap-1">
                        <span>{kpis.totalSalesSubtext}</span>
                    </p>
                </motion.div>

                {/* 2. Orders */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all hover:border-blue-500/30"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                            <Package size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-400">Orders</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {kpis.ordersFormatted}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-1.5">
                        {kpis.ordersSubtext}
                    </p>
                </motion.div>

                {/* 3. Pending Orders (Actionable - clicks to filter pending) */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => setFilter("pending")}
                    className="cursor-pointer bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all hover:border-amber-500/40 hover:shadow-md group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                            <Clock size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-400">Pending Orders</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl sm:text-3xl font-black tracking-tight ${kpis.pendingOrdersCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                            {kpis.pendingOrdersFormatted}
                        </span>
                        {kpis.pendingOrdersCount > 0 && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Action
                            </span>
                        )}
                    </div>
                    <p className={`text-[11px] font-semibold mt-1.5 ${kpis.pendingOrdersCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-gray-400"}`}>
                        {kpis.pendingOrdersSubtext}
                    </p>
                </motion.div>

                {/* 4. Settled Earnings */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs transition-all hover:border-emerald-500/30"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-400">Settled Earnings</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                            ₹{kpis.settledEarningsFormatted}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-1.5">
                        {kpis.settledEarningsSubtext}
                        {kpis.contingentProfitPaise > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 ml-1 font-bold">
                                (₹{kpis.contingentProfitFormatted} pending)
                            </span>
                        )}
                    </p>
                </motion.div>
            </div>

            {/* Standard Orders vs Store Credit Requests Switcher */}
            <div className="flex space-x-2 bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveView("orders")}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${activeView === "orders"
                        ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white"
                    }`}
                >
                    Standard Orders
                </button>
                <button
                    onClick={() => setActiveView("credits")}
                    className={`relative px-6 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${activeView === "credits"
                        ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white"
                    }`}
                >
                    <span>Store Credit Requests</span>
                    {pendingCreditsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white leading-none">
                            {pendingCreditsCount}
                        </span>
                    )}
                </button>
            </div>

            {activeView === "orders" ? (
                <>
                    {/* Search, Payment Filter & Status Tabs */}
                    <div className="space-y-4">
                        {/* Top Filter Bar: Search + Payment Type */}
                        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search Order ID, customer name, phone, or product title..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Payment Method Pills */}
                            <div className="flex items-center gap-1 bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 p-1 rounded-2xl overflow-x-auto no-scrollbar shrink-0">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2.5">Payment:</span>
                                {[
                                    { key: "all", label: "All" },
                                    { key: "wallet", label: "Wallet" },
                                    { key: "gateway", label: "Gateway" },
                                    { key: "store_credit", label: "Store Credit" }
                                ].map((pm) => (
                                    <button
                                        key={pm.key}
                                        onClick={() => setPaymentFilter(pm.key)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${paymentFilter === pm.key
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-black font-black shadow-xs"
                                            : "text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white"
                                        }`}
                                    >
                                        {pm.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status Tabs with Counts */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {["all", "pending", "packed", "shipped", "delivered", "cancelled"].map((st) => {
                                const count = statusCounts[st] || 0;
                                const isActive = filter === st;

                                return (
                                    <button
                                        key={st}
                                        onClick={() => setFilter(st)}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border ${isActive
                                            ? "bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/20"
                                            : "bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5"
                                        }`}
                                    >
                                        <span>{st === "all" ? "All Orders" : st}</span>
                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${isActive ? "bg-black/15 text-black" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400"}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Orders Content Area */}
                    {filteredOrders.length === 0 ? (
                        /* Empty States */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-24 bg-white dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-3xl space-y-4"
                        >
                            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                                <Package size={28} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">No orders found</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
                                    {search
                                        ? "No orders match your search query. Try clearing the search term or filters."
                                        : filter !== "all"
                                        ? `No orders currently have the status "${filter}" for ${PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label.toLowerCase()}.`
                                        : selectedPeriod !== "all"
                                        ? `No orders found in the selected period (${PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label}).`
                                        : "You haven't received any customer orders yet. Orders will appear here automatically once customers checkout."}
                                </p>
                            </div>
                            {(search || filter !== "all" || selectedPeriod !== "all" || paymentFilter !== "all") && (
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setFilter("all");
                                        setPaymentFilter("all");
                                        setSelectedPeriod("all");
                                    }}
                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 transition-all"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <>
                            {/* ── Desktop Structured Table View (Large Screen) ── */}
                            <div className="hidden lg:block bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 select-none">
                                                <th className="py-4 px-6">Order ID & Date</th>
                                                <th className="py-4 px-6">Customer</th>
                                                <th className="py-4 px-6">Items</th>
                                                <th className="py-4 px-6">Total Sales</th>
                                                <th className="py-4 px-6">Status</th>
                                                <th className="py-4 px-6">Settlement</th>
                                                <th className="py-4 px-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                                            {paginatedOrders.map((order) => {
                                                const cfg = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending;
                                                const isExpanded = expandedId === order.id;
                                                const isSettled = isSettledOrder(order);
                                                const orderProfit = (order.merchant_profit_paise ?? 0) !== 0
                                                    ? order.merchant_profit_paise
                                                    : (order.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0);
                                                const nextSt = getNextStatus(order.delivery_status);

                                                return (
                                                    <React.Fragment key={order.id}>
                                                        <tr
                                                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                                            className={`cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02] ${isExpanded ? "bg-slate-50/80 dark:bg-white/[0.03]" : ""}`}
                                                        >
                                                            {/* Order ID & Date */}
                                                            <td className="py-4 px-6">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                                                                        #{order.id.slice(0, 8).toUpperCase()}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigator.clipboard.writeText(order.id);
                                                                            toast.success("Order ID copied");
                                                                        }}
                                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                                                                        title="Copy Order ID"
                                                                    >
                                                                        <Copy size={11} />
                                                                    </button>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                                                                    {order.created_at ? format(new Date(order.created_at), "dd MMM, HH:mm") : "N/A"}
                                                                </p>
                                                            </td>

                                                            {/* Customer */}
                                                            <td className="py-4 px-6">
                                                                <p className="font-bold text-slate-800 dark:text-white truncate max-w-[140px]">
                                                                    {order.customer_name || "Guest User"}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate max-w-[140px]">
                                                                    {order.customer_phone || (order.payment_method ? `via ${order.payment_method}` : "")}
                                                                </p>
                                                            </td>

                                                            {/* Items */}
                                                            <td className="py-4 px-6">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-black text-slate-700 dark:text-gray-300">
                                                                        {order.items?.length || 1} item{order.items?.length === 1 ? "" : "s"}
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-500 dark:text-gray-400 truncate max-w-[150px]">
                                                                        {order.items?.[0]?.product_title || "Product"}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Total Sales */}
                                                            <td className="py-4 px-6">
                                                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                                                    ₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}
                                                                </span>
                                                            </td>

                                                            {/* Status Badge */}
                                                            <td className="py-4 px-6">
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                                                    <cfg.icon size={11} />
                                                                    {cfg.label}
                                                                </span>
                                                            </td>

                                                            {/* Settlement */}
                                                            <td className="py-4 px-6">
                                                                <div>
                                                                    <span className={`text-xs font-black ${isSettled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                                        ₹{(orderProfit / 100).toLocaleString("en-IN")}
                                                                    </span>
                                                                    <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-tight mt-0.5">
                                                                        {order.settlement_status === "settled"
                                                                            ? "Settled"
                                                                            : order.settlement_status === "admin_takeover"
                                                                            ? "Takeover (30%)"
                                                                            : order.settlement_status === "settled_zero"
                                                                            ? "₹0 Payout"
                                                                            : "Contingent"}
                                                                    </p>
                                                                </div>
                                                            </td>

                                                            {/* Actions */}
                                                            <td className="py-4 px-6 text-right">
                                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                                    {nextSt && order.settlement_status !== "settled" && order.delivery_status !== "cancelled" && (
                                                                        <button
                                                                            onClick={() => updateStatus(order.id, nextSt)}
                                                                            disabled={updatingId === order.id}
                                                                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs"
                                                                        >
                                                                            {updatingId === order.id ? (
                                                                                <RotateCcw size={11} className="animate-spin" />
                                                                            ) : (
                                                                                <Check size={11} />
                                                                            )}
                                                                            {STATUS_CONFIG[nextSt]?.label}
                                                                        </button>
                                                                    )}

                                                                    <div className={`p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                                                        <ChevronDown size={14} />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* Accordion Detail Row */}
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan={7} className="p-0">
                                                                    <OrderDetailDrawer
                                                                        order={order}
                                                                        merchantInfo={merchantInfo}
                                                                        nextStatus={nextSt}
                                                                        isUpdating={updatingId === order.id}
                                                                        onUpdate={updateStatus}
                                                                        setShippingModal={setShippingModal}
                                                                        setShippingData={setShippingData}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── Mobile Touch Cards View (<1024px) ── */}
                            <div className="block lg:hidden space-y-3.5">
                                {paginatedOrders.map((order) => {
                                    const cfg = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending;
                                    const isExpanded = expandedId === order.id;
                                    const isSettled = isSettledOrder(order);
                                    const orderProfit = (order.merchant_profit_paise ?? 0) !== 0
                                        ? order.merchant_profit_paise
                                        : (order.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0);
                                    const nextSt = getNextStatus(order.delivery_status);

                                    return (
                                        <div
                                            key={order.id}
                                            className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs"
                                        >
                                            <div
                                                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                                className="p-4 cursor-pointer select-none space-y-3"
                                            >
                                                {/* Card Header: Order ID + Status */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                                            #{order.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(order.id);
                                                                toast.success("Order ID copied");
                                                            }}
                                                            className="p-1 rounded bg-slate-100 dark:bg-white/5 text-slate-400"
                                                        >
                                                            <Copy size={10} />
                                                        </button>
                                                    </div>

                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                                        <cfg.icon size={10} />
                                                        {cfg.label}
                                                    </span>
                                                </div>

                                                {/* Customer & Date */}
                                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                                                    <span className="font-bold text-slate-700 dark:text-gray-300 truncate max-w-[180px]">
                                                        {order.customer_name || "Guest User"}
                                                    </span>
                                                    <span className="text-[10px]">
                                                        {order.created_at ? format(new Date(order.created_at), "dd MMM, HH:mm") : "N/A"}
                                                    </span>
                                                </div>

                                                {/* Items snippet */}
                                                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-200/60 dark:bg-white/5 overflow-hidden shrink-0 flex items-center justify-center relative">
                                                        {order.items?.[0]?.product_image ? (
                                                            <Image src={order.items[0].product_image} alt="" fill sizes="40px" className="object-cover" />
                                                        ) : (
                                                            <Package size={16} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                            {order.items?.[0]?.product_title || "Product"}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 dark:text-gray-500">
                                                            {order.items?.length || 1} item{order.items?.length === 1 ? "" : "s"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Financial Overview Row */}
                                                <div className="flex items-center justify-between pt-1">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Sales</p>
                                                        <p className="text-base font-black text-slate-900 dark:text-white">
                                                            ₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                            {isSettled ? "Settled Profit" : "Expected Profit"}
                                                        </p>
                                                        <p className={`text-base font-black ${isSettled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                            ₹{(orderProfit / 100).toLocaleString("en-IN")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Primary Card Action Bar */}
                                            <div className="px-4 py-3 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                                    className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-gray-400 flex items-center gap-1"
                                                >
                                                    <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                                                    <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                </button>

                                                {nextSt && order.settlement_status !== "settled" && order.delivery_status !== "cancelled" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, nextSt)}
                                                        disabled={updatingId === order.id}
                                                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm active:scale-95"
                                                    >
                                                        {updatingId === order.id ? (
                                                            <RotateCcw size={12} className="animate-spin" />
                                                        ) : (
                                                            <ArrowUpRight size={12} />
                                                        )}
                                                        Mark as {STATUS_CONFIG[nextSt]?.label}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Expanded Drawer for Mobile */}
                                            {isExpanded && (
                                                <OrderDetailDrawer
                                                    order={order}
                                                    merchantInfo={merchantInfo}
                                                    nextStatus={nextSt}
                                                    isUpdating={updatingId === order.id}
                                                    onUpdate={updateStatus}
                                                    setShippingModal={setShippingModal}
                                                    setShippingData={setShippingData}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
                                    <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
                                    </p>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-gray-300 disabled:opacity-40 transition-all hover:bg-slate-50 dark:hover:bg-white/10"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                                            <button
                                                key={pg}
                                                onClick={() => setCurrentPage(pg)}
                                                className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === pg
                                                    ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs"
                                                    : "text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5"
                                                }`}
                                            >
                                                {pg}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-gray-300 disabled:opacity-40 transition-all hover:bg-slate-50 dark:hover:bg-white/10"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            ) : (
                /* Store Credit Requests Tab */
                <div className="relative">
                    <StoreCreditRequestsTab merchantId={merchantId} />
                </div>
            )}

            {/* Shipping / Scheduling Modal */}
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
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-white/10"
                        >
                            <div className="p-6 sm:p-8">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                            Order #{shippingModal.id.slice(0, 8).toUpperCase()}
                                        </h4>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
                                            {shippingModal.mode === "schedule" ? "Schedule Delivery" : "Shipment Details"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShippingModal(null)}
                                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Tracking ID / Number
                                        </label>
                                        <div className="relative">
                                            <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="e.g. DTDC-9281726"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900 dark:text-white"
                                                value={shippingData.tracking_number}
                                                onChange={(e) => setShippingData((prev) => ({ ...prev, tracking_number: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Estimated Delivery Date & Time
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="datetime-local"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-900 dark:text-white"
                                                value={shippingData.estimated_delivery_at}
                                                onChange={(e) => setShippingData((prev) => ({ ...prev, estimated_delivery_at: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Delivery Partner / Delivery Notes
                                        </label>
                                        <textarea
                                            placeholder="e.g. Delivery Partner: Blue Dart (Awb: 918237)"
                                            rows={2}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm text-slate-900 dark:text-white resize-none"
                                            value={shippingData.status_notes}
                                            onChange={(e) => setShippingData((prev) => ({ ...prev, status_notes: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={() => updateStatus(
                                            shippingModal.id,
                                            shippingModal.mode === "schedule" ? shippingModal.delivery_status : "shipped",
                                            shippingData.tracking_number,
                                            shippingData.estimated_delivery_at,
                                            shippingData.status_notes
                                        )}
                                        disabled={updatingId === shippingModal.id}
                                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 ${shippingModal.mode === "schedule"
                                            ? "bg-slate-900 hover:bg-slate-800 text-white"
                                            : "bg-emerald-500 hover:bg-emerald-400 text-black"
                                        }`}
                                    >
                                        {updatingId === shippingModal.id ? (
                                            <RotateCcw className="animate-spin" size={16} />
                                        ) : (
                                            <>
                                                {shippingModal.mode === "schedule" ? <Calendar size={16} /> : <Truck size={16} />}
                                                {shippingModal.mode === "schedule" ? "Save Schedule Info" : "Confirm Dispatch"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
