"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
    Package, Search, Clock, CheckCircle2, Truck,
    ShoppingBag, ChevronDown, MapPin, ArrowUpRight, AlertTriangle,
    RotateCcw, Receipt, Store, Calendar, ExternalLink,
    Download, X, Sparkles, Copy, ChevronLeft, ChevronRight,
    CreditCard, Wallet, Filter, Check, Eye, CircleDollarSign,
    TrendingUp, Zap, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StoreCreditRequestsTab from "./StoreCreditRequestsTab";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";
import { isOrderInvoiceEligible } from "@/lib/orders/invoiceEligibility";
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
    pending: { label: "Pending", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800/60", icon: Clock },
    packed: { label: "Packed", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800/50", icon: Package },
    shipped: { label: "Shipped", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800/60", icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800/60", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800/60", icon: AlertTriangle },
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
        <div className="p-4 sm:p-6 space-y-5 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-white/5">
            {/* Delivery address & tracking if available */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {order.delivery_address && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shipping Address</p>
                            <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed mt-0.5">{order.delivery_address}</p>
                        </div>
                    </div>
                )}
                {order.tracking_number && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <Truck size={16} className="text-violet-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tracking Number</p>
                            <p className="text-xs font-mono font-bold text-slate-800 dark:text-white mt-0.5">{order.tracking_number}</p>
                            {order.estimated_delivery_at && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Est. Delivery: {format(new Date(order.estimated_delivery_at), "dd MMM, HH:mm")}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Line Items List */}
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Package size={13} /> Line Items ({order.items?.length || 0})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(order.items || []).map((item) => {
                        const gstRate = item.gst_percentage || 0;
                        const totalPaise = item.total_price_paise || (item.unit_price_paise * (item.quantity || 1)) || 0;

                        return (
                            <div key={item.id} className="flex gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-xs items-center">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative border border-slate-200/60 dark:border-white/5">
                                    {item.product_image ? (
                                        <Image src={item.product_image} alt="" fill sizes="48px" className="object-cover" />
                                    ) : (
                                        <Package size={18} className="text-slate-300 dark:text-slate-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.product_title}</h4>
                                        <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">₹{((totalPaise) / 100).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Qty: {item.quantity}</span>
                                        {gstRate > 0 && (
                                            <span className="text-teal-600 dark:text-teal-400 font-black">GST {gstRate}%</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Financial Margin & Ledger */}
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                    <Receipt size={13} /> Financial Breakdown
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center sm:text-left">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Customer Paid</p>
                        <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                            ₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Wholesale Cost</p>
                        <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                            ₹{(orderTotalCost / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Platform Fee</p>
                        <p className="text-sm sm:text-base font-black text-slate-500 dark:text-slate-400 mt-0.5">
                            -₹{(orderCommission / 100).toFixed(2)}
                        </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs">
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Net Profit</p>
                        <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            +₹{(orderNetProfit / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Settlement</p>
                        <p className={`text-xs font-black mt-1 uppercase tracking-wider ${isSettled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {isSettled ? "Settled to Wallet" : "On Delivery"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions in expanded drawer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Payment via <span className="font-bold uppercase text-slate-700 dark:text-slate-200">{order.payment_method || "Wallet"}</span> • Order ID <span className="font-mono text-slate-600 dark:text-slate-300">{order.id}</span>
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
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200/60 dark:border-white/10"
                        >
                            <Calendar size={13} /> Update Schedule
                        </button>

                        {nextStatus && nextStatus !== "delivered" && (
                            <button
                                onClick={() => onUpdate(order.id, nextStatus)}
                                disabled={isUpdating}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                {isUpdating ? (
                                    <RotateCcw size={13} className="animate-spin" />
                                ) : (
                                    <ArrowUpRight size={13} />
                                )}
                                Mark as {STATUS_CONFIG[nextStatus]?.label}
                            </button>
                        )}

                        {order.delivery_status !== "delivered" && (
                            <button
                                onClick={() => onUpdate(order.id, "delivered")}
                                disabled={isUpdating}
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                {isUpdating ? (
                                    <RotateCcw size={13} className="animate-spin" />
                                ) : (
                                    <CheckCircle2 size={13} />
                                )}
                                Mark as Delivered
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
    const searchParams = useSearchParams();
    const selectedKpi = searchParams.get("kpi");
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

    // Deep Linking: Read URL query params on mount & smooth scroll to KPIs if requested
    useEffect(() => {
        const periodParam = searchParams.get("period");
        const statusParam = searchParams.get("status");
        const paymentParam = searchParams.get("payment");

        if (periodParam && ["all", "today", "7d", "30d", "this_month"].includes(periodParam)) {
            setSelectedPeriod(periodParam);
        }
        if (statusParam && ["all", "pending", "packed", "shipped", "delivered", "cancelled"].includes(statusParam)) {
            setFilter(statusParam);
        }
        if (paymentParam && ["all", "wallet", "gateway", "store_credit"].includes(paymentParam)) {
            setPaymentFilter(paymentParam);
        }

        if (typeof window !== "undefined") {
            const hash = window.location.hash;
            if (hash === "#kpi-summary" || hash === "#kpis") {
                const timer = setTimeout(() => {
                    const el = document.getElementById("kpi-summary");
                    if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                }, 200);
                return () => clearTimeout(timer);
            }
        }
    }, [searchParams]);

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

    // Filter out invalid / unpaid / cancelled draft orders
    const validOrders = useMemo(() => {
        return orders.filter(isValidOrder);
    }, [orders]);

    // Orders filtered by period first
    const periodOrders = useMemo(() => {
        return filterOrdersByPeriod(validOrders, selectedPeriod);
    }, [validOrders, selectedPeriod]);

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
            const st = (o.delivery_status || "pending").toLowerCase();
            if (counts[st] !== undefined) {
                counts[st]++;
            }
        });
        return counts;
    }, [periodOrders]);

    // 4-Stage Animated Order Journey (Pending -> Packed -> Shipped -> Delivered)
    const [journeyStage, setJourneyStage] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setJourneyStage((prev) => (prev + 1) % 5);
        }, 1800);
        return () => clearInterval(timer);
    }, []);

    const JOURNEY_STEPS = useMemo(() => [
        {
            key: "pending",
            label: "Pending",
            sublabel: "Awaiting Pack",
            icon: Clock,
            activeColor: "bg-amber-500 text-white ring-amber-500/25 shadow-amber-500/30",
            dotColor: "bg-amber-500"
        },
        {
            key: "packed",
            label: "Packed",
            sublabel: "Ready to Dispatch",
            icon: Package,
            activeColor: "bg-blue-600 text-white ring-blue-500/25 shadow-blue-500/30",
            dotColor: "bg-blue-500"
        },
        {
            key: "shipped",
            label: "Shipped",
            sublabel: "In Transit",
            icon: Truck,
            activeColor: "bg-violet-600 text-white ring-violet-500/25 shadow-violet-500/30",
            dotColor: "bg-violet-500"
        },
        {
            key: "delivered",
            label: "Delivered",
            sublabel: "Settled to Wallet",
            icon: CheckCircle2,
            activeColor: "bg-emerald-600 text-white ring-emerald-500/25 shadow-emerald-500/30",
            dotColor: "bg-emerald-500"
        },
    ], []);

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
    }, [filter, paymentFilter, search, selectedPeriod]);

    // Paginate filtered orders
    const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, currentPage, pageSize]);

    const getNextStatus = (current) => {
        const idx = STATUS_FLOW.indexOf(current);
        if (idx >= 0 && idx < STATUS_FLOW.length - 1) {
            return STATUS_FLOW[idx + 1];
        }
        return null;
    };

    const getFulfillmentErrorMessage = (err) => {
        const raw = String(err?.message || err || "").toLowerCase();
        if (raw.includes("not ready to be packed") || raw.includes("stock locked") || raw.includes("not packed yet")) {
            return "Order cannot advance yet. Please confirm stock packing status.";
        }
        if (raw.includes("tracking number is required") || raw.includes("tracking_number")) {
            return "Tracking number is required before shipping.";
        }
        if (raw.includes("insufficient_balance") || raw.includes("wallet")) {
            return "Merchant wallet balance issue during settlement.";
        }
        return err?.message || "Failed to update order status.";
    };

    const updateStatus = async (orderId, newStatus, tracking = null, estAt = null, notes = null) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    newStatus,
                    trackingNumber: tracking || null,
                    estimatedAt: estAt || null,
                    statusNotes: notes || null,
                    isMerchant: true,
                })
            });
            const data = await res.json();
            if (!res.ok || !data?.success) throw new Error(data?.message || data?.error || "Status update failed");

            const nowIso = new Date().toISOString();
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? {
                            ...o,
                            delivery_status: newStatus,
                            tracking_number: tracking !== null && tracking !== undefined ? tracking : o.tracking_number,
                            estimated_delivery_at: estAt !== null && estAt !== undefined ? estAt : o.estimated_delivery_at,
                            status_notes: notes !== null && notes !== undefined ? notes : o.status_notes,
                            packed_at: (newStatus === "packed" || newStatus === "shipped" || newStatus === "delivered") ? (o.packed_at || nowIso) : o.packed_at,
                            shipped_at: (newStatus === "shipped" || newStatus === "delivered") ? (o.shipped_at || nowIso) : o.shipped_at,
                            delivered_at: newStatus === "delivered" ? (o.delivered_at || nowIso) : o.delivered_at,
                            settlement_status: (newStatus === "packed" || newStatus === "shipped" || newStatus === "delivered") ? "settled" : o.settlement_status
                        }
                        : o
                )
            );
            toast.success(`Order marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}!`);
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

    const openShippingModal = (order, mode = "schedule") => {
        setShippingModal({ ...order, mode });
        setShippingData({
            tracking_number: order.tracking_number || "",
            estimated_delivery_at: order.estimated_delivery_at
                ? format(new Date(order.estimated_delivery_at), "yyyy-MM-dd'T'HH:mm")
                : format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
            status_notes: order.status_notes || ""
        });
    };

    const handleDownloadInvoice = async (order) => {
        if (!isOrderInvoiceEligible(order)) {
            toast.error("Invoice will be available once the order is packed.");
            return;
        }
        try {
            await generateOrderInvoice({
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
            toast.success("Invoice downloaded successfully");
        } catch (err) {
            console.error("Failed to generate invoice:", err);
            toast.error(err.message || "Failed to generate invoice");
        }
    };

    return (
        <div className="space-y-6 pb-28 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Error Banner */}
            {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-red-700 dark:text-red-400">Unable to load orders</p>
                        <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Please refresh the page or retry.</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="shrink-0 text-xs font-black text-red-600 dark:text-red-400 hover:underline uppercase tracking-wider"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── Authentic Merchant Header (Matches DashboardHeader Aesthetic) ── */}
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/80 shadow-sm border border-slate-200/60 dark:border-white/10 p-5 md:p-8 backdrop-blur-md">
                {/* Decorative Ambient Blobs (Identical to Dashboard Header) */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-100/50 dark:bg-blue-950/20 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-purple-100/40 dark:bg-purple-950/20 blur-3xl pointer-events-none" />
                <div className="absolute top-10 left-1/3 w-72 h-72 rounded-full bg-amber-50/60 dark:bg-amber-950/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-6">
                    {/* Top Tier: Title, Identity & Operational Status */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        Orders
                                    </h1>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                        </span>
                                        Live
                                    </span>
                                    {merchantInfo?.auto_mode && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                            <Sparkles size={11} /> Auto Mode
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                    Manage customer shopping orders, live shipments, and wallet profit settlements.
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons (Matches Dashboard Primary Buttons) */}
                        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                            <Link
                                href="/merchant/shopping/wholesale"
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.15)] hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <ArrowUpRight className="w-4 h-4" />
                                Buy Wholesale
                            </Link>
                            <Link
                                href="/merchant/shopping/inventory"
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Store className="w-4 h-4 text-slate-500" />
                                Catalog
                            </Link>
                        </div>
                    </div>

                    {/* ── Animated Order Journey: 4 Connected Circles with Labels Below ── */}
                    <div className="pt-4 border-t border-slate-100/80 dark:border-slate-800/80 w-full min-w-0">
                        <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 rounded-2xl p-3 sm:p-4 shadow-xs w-full max-w-full overflow-hidden">
                            <div className="flex items-start w-full min-w-0">
                                {JOURNEY_STEPS.map((step, idx) => {
                                    const isPassed = journeyStage > idx;
                                    const isCurrent = journeyStage === idx;
                                    const StepIcon = step.icon;

                                    return (
                                        <div key={step.key} className="relative flex-1 flex flex-col items-center text-center min-w-0">
                                            {/* Connecting Line from this circle to the next */}
                                            {idx < JOURNEY_STEPS.length - 1 && (
                                                <div className="absolute top-3.5 sm:top-4 left-1/2 w-full h-1 sm:h-1.5 -translate-y-1/2 bg-slate-200/80 dark:bg-slate-700/60 z-0">
                                                    <div
                                                        className={`h-full transition-all duration-700 ease-out ${
                                                            journeyStage > idx
                                                                ? "w-full bg-emerald-500"
                                                                : journeyStage === idx
                                                                ? "w-full bg-gradient-to-r from-emerald-500 to-blue-500 animate-pulse"
                                                                : "w-0"
                                                        }`}
                                                    />
                                                </div>
                                            )}

                                            {/* Step Circle */}
                                            <div className="relative z-10 flex items-center justify-center">
                                                {isCurrent && (
                                                    <span className={`absolute -inset-1 rounded-full animate-ping pointer-events-none opacity-50 ${step.dotColor}`} />
                                                )}
                                                <div
                                                    className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 shadow-xs ring-4 ring-slate-50 dark:ring-slate-800 ${
                                                        isPassed
                                                            ? "bg-emerald-500 text-white shadow-emerald-500/25 scale-100"
                                                            : isCurrent
                                                            ? `${step.activeColor} scale-105`
                                                            : "bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-700"
                                                    }`}
                                                >
                                                    {isPassed ? (
                                                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                                                    ) : (
                                                        <StepIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isCurrent ? "animate-pulse" : ""}`} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Label & Sublabel placed below each circle */}
                                            <div className="mt-1.5 sm:mt-2 flex flex-col items-center min-w-0 w-full px-0.5">
                                                <span className={`text-[10px] sm:text-xs font-bold transition-colors truncate max-w-full leading-tight ${
                                                    isPassed || isCurrent
                                                        ? "text-slate-900 dark:text-white"
                                                        : "text-slate-400 dark:text-slate-500"
                                                }`}>
                                                    {step.label}
                                                </span>
                                                <span className="hidden sm:block text-[9px] sm:text-[10px] text-slate-400 font-medium truncate max-w-full mt-0.5">
                                                    {step.sublabel}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI Summary Deck (Target for Deep Links: #kpi-summary) ── */}
            <section id="kpi-summary" className="scroll-mt-24 space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Performance Overview
                    </h2>
                    <span className="text-[11px] font-semibold text-slate-400">
                        Showing metrics for {PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label || "Selected Period"}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* 1. Total Sales Card */}
                    <div className={`relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border p-5 shadow-xs transition-all hover:shadow-md ${
                        selectedKpi === 'sales'
                            ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-blue-500/10'
                            : 'border-slate-200/80 dark:border-white/10'
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                Total Sales
                                {selectedKpi === 'sales' && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider">SELECTED</span>
                                )}
                            </span>
                            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                                <CircleDollarSign size={20} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                ₹{kpis.totalSalesFormatted}
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="truncate">{kpis.totalSalesSubtext}</span>
                            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                                Gross
                            </span>
                        </div>
                    </div>

                    {/* 2. Total Orders Card */}
                    <div className={`relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border p-5 shadow-xs transition-all hover:shadow-md ${
                        selectedKpi === 'orders'
                            ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-purple-500/10'
                            : 'border-slate-200/80 dark:border-white/10'
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                Total Orders
                                {selectedKpi === 'orders' && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[8px] font-black uppercase tracking-wider">SELECTED</span>
                                )}
                            </span>
                            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                                <ShoppingBag size={20} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                {kpis.ordersFormatted}
                            </span>
                            <span className="text-xs font-bold text-slate-400">placed</span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="truncate">{kpis.ordersSubtext}</span>
                            <span className="text-purple-600 dark:text-purple-400 font-bold shrink-0">Volume</span>
                        </div>
                    </div>

                    {/* 3. Pending Fulfillment Action Card (Clickable to Filter Pending) */}
                    <div 
                        onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
                        className={`relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border p-5 shadow-xs transition-all hover:shadow-md cursor-pointer group ${
                            filter === "pending" || selectedKpi === "pending"
                                ? "border-amber-400 ring-2 ring-amber-400/20 shadow-amber-500/10"
                                : "border-slate-200/80 dark:border-white/10"
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                Pending Action
                                {selectedKpi === "pending" && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider">SELECTED</span>
                                )}
                                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                            </span>
                            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                                <Clock size={20} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${kpis.pendingOrdersCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                                {kpis.pendingOrdersFormatted}
                            </span>
                            {kpis.pendingOrdersCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 animate-pulse">
                                    Action Required
                                </span>
                            )}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-amber-600 dark:text-amber-400 font-bold truncate">
                                {filter === "pending" ? "Filtering pending orders" : "Click to view pending"}
                            </span>
                            <span className="text-slate-400 shrink-0">Dispatch SLA</span>
                        </div>
                    </div>

                    {/* 4. Settled Profit Card */}
                    <div className={`relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border p-5 shadow-xs transition-all hover:shadow-md ${
                        selectedKpi === 'revenue' || selectedKpi === 'profit'
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-500/10'
                            : 'border-slate-200/80 dark:border-white/10'
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                Net Profit
                                {(selectedKpi === 'revenue' || selectedKpi === 'profit') && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider">SELECTED</span>
                                )}
                            </span>
                            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                ₹{kpis.settledEarningsFormatted}
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="truncate">{kpis.settledEarningsSubtext}</span>
                            {kpis.contingentProfitPaise > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800/60 shrink-0">
                                    +₹{kpis.contingentProfitFormatted} pend
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                                    Settled
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── One Combined Clean Filter Bar ── */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-3 sm:p-4 shadow-xs space-y-3 w-full max-w-full overflow-hidden">
                {/* Row 1: View Switcher, Search Input, and Period Options */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
                    {/* View Switcher: Customer Orders vs Store Credits */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-white/5 shrink-0 self-start sm:self-auto">
                        <button
                            onClick={() => setActiveView("orders")}
                            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                                activeView === "orders"
                                    ? "bg-emerald-600 text-white shadow-xs font-black"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            }`}
                        >
                            Customer Orders ({periodOrders.length})
                        </button>
                        <button
                            onClick={() => setActiveView("credits")}
                            className={`relative px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                                activeView === "credits"
                                    ? "bg-emerald-600 text-white shadow-xs font-black"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            }`}
                        >
                            <span>Store Credits</span>
                            {pendingCreditsCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-500 text-white leading-tight">
                                    {pendingCreditsCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search Bar */}
                    {activeView === "orders" && (
                        <div className="relative flex-1 min-w-0 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Order ID, customer, phone, product title..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/10 rounded-2xl py-2 pl-10 pr-8 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Period Switcher */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-x-auto no-scrollbar shrink-0 max-w-full">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 flex items-center gap-1 shrink-0">
                            <Calendar size={12} />
                            Period:
                        </span>
                        {PERIOD_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setSelectedPeriod(opt.key)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0 ${
                                    selectedPeriod === opt.key
                                        ? "bg-emerald-600 text-white shadow-xs font-black"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Status tabs + Payment filter + Reset (Only for Orders view) */}
                {activeView === "orders" && (
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 w-full min-w-0">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1 max-w-full">
                            {["all", "pending", "packed", "shipped", "delivered", "cancelled"].map((st) => {
                                const count = statusCounts[st] || 0;
                                const isActive = filter === st;

                                return (
                                    <button
                                        key={st}
                                        onClick={() => setFilter(st)}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 border shrink-0 ${
                                            isActive
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-600/20 font-black"
                                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-300"
                                        }`}
                                    >
                                        <span>{st === "all" ? "All Orders" : st}</span>
                                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                            isActive
                                                ? "bg-white/25 text-white"
                                                : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Payment Filter & Reset */}
                        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 p-0.5 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5">Pay:</span>
                                {[
                                    { key: "all", label: "All" },
                                    { key: "wallet", label: "Wallet" },
                                    { key: "gateway", label: "Gateway" },
                                    { key: "store_credit", label: "Credit" }
                                ].map((pm) => (
                                    <button
                                        key={pm.key}
                                        onClick={() => setPaymentFilter(pm.key)}
                                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                            paymentFilter === pm.key
                                                ? "bg-emerald-600 text-white font-black shadow-xs"
                                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                        }`}
                                    >
                                        {pm.label}
                                    </button>
                                ))}
                            </div>

                            {(search || filter !== "all" || paymentFilter !== "all" || selectedPeriod !== "all") && (
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setFilter("all");
                                        setPaymentFilter("all");
                                        setSelectedPeriod("all");
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline whitespace-nowrap px-1.5 py-1"
                                >
                                    <RotateCcw size={12} />
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Active View Content (Orders vs Store Credits) ── */}
            {activeView === "orders" ? (
                <>

                    {/* Orders Table Container */}
                    <div id="orders-table" className="scroll-mt-24">
                        {filteredOrders.length === 0 ? (
                            /* Empty State */
                            <div className="text-center py-20 bg-white dark:bg-slate-900/80 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl space-y-3">
                                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                                    <Package size={24} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">No customer orders found</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    {search
                                        ? "No orders match your search keyword. Try clearing filters."
                                        : filter !== "all"
                                        ? `No orders currently match status "${filter}".`
                                        : "New orders will appear automatically in real-time as customers place them."}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* ── Desktop Table View (>=1024px) ── */}
                                <div className="hidden lg:block bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 select-none">
                                                    <th className="py-3.5 px-5">Order ID &amp; Date</th>
                                                    <th className="py-3.5 px-5">Customer</th>
                                                    <th className="py-3.5 px-5">Items</th>
                                                    <th className="py-3.5 px-5">Amount</th>
                                                    <th className="py-3.5 px-5">Status</th>
                                                    <th className="py-3.5 px-5">Settlement</th>
                                                    <th className="py-3.5 px-5 text-right">Actions</th>
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
                                                                className={`cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                                                                    isExpanded ? "bg-slate-50/80 dark:bg-slate-800/50" : ""
                                                                }`}
                                                            >
                                                                {/* Order ID & Date */}
                                                                <td className="py-3.5 px-5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Link
                                                                            href={`/merchant/shopping/orders/${order.id}`}
                                                                            className="font-mono font-black text-slate-900 dark:text-white text-xs hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                                        >
                                                                            #{order.id.slice(0, 8).toUpperCase()}
                                                                        </Link>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigator.clipboard.writeText(order.id);
                                                                                toast.success("Order ID copied");
                                                                            }}
                                                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                                            title="Copy Order ID"
                                                                        >
                                                                            <Copy size={12} />
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                                        {order.created_at ? format(new Date(order.created_at), "dd MMM, HH:mm") : "N/A"}
                                                                    </p>
                                                                </td>

                                                                {/* Customer */}
                                                                <td className="py-3.5 px-5">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                                                                            {(order.customer_name || "C").charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-slate-800 dark:text-white truncate max-w-[130px]">
                                                                                {order.customer_name || "Customer"}
                                                                            </p>
                                                                            <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                                                                {order.customer_phone || (order.payment_method ? `via ${order.payment_method}` : "")}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                {/* Items */}
                                                                <td className="py-3.5 px-5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5">
                                                                            {order.items?.length || 1}
                                                                        </span>
                                                                        <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                                                                            {order.items?.[0]?.product_title || "Product"}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                {/* Total Amount */}
                                                                <td className="py-3.5 px-5">
                                                                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                                                        ₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}
                                                                    </span>
                                                                </td>

                                                                {/* Status Badge */}
                                                                <td className="py-3.5 px-5">
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                                                        <cfg.icon size={11} />
                                                                        {cfg.label}
                                                                    </span>
                                                                </td>

                                                                {/* Settlement */}
                                                                <td className="py-3.5 px-5">
                                                                    <div>
                                                                        <span className={`text-xs font-black ${isSettled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                                            ₹{(orderProfit / 100).toLocaleString("en-IN")}
                                                                        </span>
                                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                                            {order.settlement_status === "settled" ? "Settled" : "Pending"}
                                                                        </p>
                                                                    </div>
                                                                </td>

                                                                {/* Actions */}
                                                                <td className="py-3.5 px-5 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                        {/* Order Details Button (Slug based routing) */}
                                                                        <Link
                                                                            href={`/merchant/shopping/orders/${order.id}`}
                                                                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 border border-slate-200/60 dark:border-white/5 shadow-xs"
                                                                        >
                                                                            <Eye size={12} className="text-slate-400" />
                                                                            <span>Details</span>
                                                                        </Link>

                                                                        {/* Download Invoice Button - Only available after packing */}
                                                                        {isOrderInvoiceEligible(order) && (
                                                                            <button
                                                                                onClick={() => handleDownloadInvoice(order)}
                                                                                title="Download Invoice PDF"
                                                                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 transition-all flex items-center justify-center"
                                                                            >
                                                                                <Download size={13} />
                                                                            </button>
                                                                        )}

                                                                        {/* Single Primary Action Button at a Time */}
                                                                        {order.delivery_status === "pending" && (
                                                                            <button
                                                                                onClick={() => updateStatus(order.id, "packed")}
                                                                                disabled={updatingId === order.id}
                                                                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 disabled:opacity-50 active:scale-95"
                                                                            >
                                                                                {updatingId === order.id ? (
                                                                                    <RotateCcw size={10} className="animate-spin" />
                                                                                ) : (
                                                                                    <Package size={12} />
                                                                                )}
                                                                                <span>Pack</span>
                                                                            </button>
                                                                        )}

                                                                        {order.delivery_status === "packed" && (
                                                                            <button
                                                                                onClick={() => updateStatus(order.id, "shipped")}
                                                                                disabled={updatingId === order.id}
                                                                                className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 disabled:opacity-50 active:scale-95"
                                                                            >
                                                                                {updatingId === order.id ? (
                                                                                    <RotateCcw size={10} className="animate-spin" />
                                                                                ) : (
                                                                                    <Truck size={12} />
                                                                                )}
                                                                                <span>Ship</span>
                                                                            </button>
                                                                        )}

                                                                        {order.delivery_status === "shipped" && (
                                                                            <button
                                                                                onClick={() => updateStatus(order.id, "delivered")}
                                                                                disabled={updatingId === order.id}
                                                                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 disabled:opacity-50 active:scale-95"
                                                                            >
                                                                                {updatingId === order.id ? (
                                                                                    <RotateCcw size={10} className="animate-spin" />
                                                                                ) : (
                                                                                    <CheckCircle2 size={12} />
                                                                                )}
                                                                                <span>Mark Delivered</span>
                                                                            </button>
                                                                        )}

                                                                        {order.delivery_status === "delivered" && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold uppercase tracking-wider">
                                                                                <CheckCircle2 size={11} /> Delivered
                                                                            </span>
                                                                        )}

                                                                        {order.delivery_status === "cancelled" && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 text-[10px] font-bold uppercase tracking-wider">
                                                                                <AlertTriangle size={11} /> Cancelled
                                                                            </span>
                                                                        )}
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

                                {/* ── Mobile Cards View (<1024px) ── */}
                                <div className="block lg:hidden space-y-3">
                                    {paginatedOrders.map((order) => {
                                        const cfg = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending;
                                        const isSettled = isSettledOrder(order);
                                        const orderProfit = (order.merchant_profit_paise ?? 0) !== 0
                                            ? order.merchant_profit_paise
                                            : (order.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0);

                                        return (
                                            <div
                                                key={order.id}
                                                className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs"
                                            >
                                                <div className="p-4 select-none space-y-3">
                                                    {/* Header: Order ID link, Invoice download & Status badge */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <Link
                                                                href={`/merchant/shopping/orders/${order.id}`}
                                                                className="font-mono font-black text-xs text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                            >
                                                                #{order.id.slice(0, 8).toUpperCase()}
                                                            </Link>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(order.id);
                                                                    toast.success("Order ID copied");
                                                                }}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                                title="Copy Order ID"
                                                            >
                                                                <Copy size={11} />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {isOrderInvoiceEligible(order) && (
                                                                <button
                                                                    onClick={() => handleDownloadInvoice(order)}
                                                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                                    title="Download Invoice PDF"
                                                                >
                                                                    <Download size={13} />
                                                                </button>
                                                            )}
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                                                <cfg.icon size={10} />
                                                                {cfg.label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Body: Customer info & Amount / Profit */}
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                                                                {(order.customer_name || "C").charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-slate-800 dark:text-white truncate max-w-[150px]">
                                                                    {order.customer_name || "Customer"}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {order.created_at ? format(new Date(order.created_at), "dd MMM, HH:mm") : "N/A"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="font-black text-slate-900 dark:text-white">
                                                                ₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}
                                                            </p>
                                                            <p className={`text-[10px] font-bold ${isSettled ? "text-emerald-600" : "text-amber-600"}`}>
                                                                +₹{(orderProfit / 100).toLocaleString("en-IN")} profit
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Card Footer: Clean Slug-based Order Details button & Single Next Action button */}
                                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                                                        {/* Slug-based Order Detail Page Button */}
                                                        <Link
                                                            href={`/merchant/shopping/orders/${order.id}`}
                                                            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200/60 dark:border-white/5 shadow-xs active:scale-95"
                                                        >
                                                            <Eye size={13} className="text-slate-500 dark:text-slate-400" />
                                                            <span>Order Details</span>
                                                        </Link>

                                                        {/* Single Primary Action Button at a Time */}
                                                        {order.delivery_status === "pending" && (
                                                            <button
                                                                onClick={() => updateStatus(order.id, "packed")}
                                                                disabled={updatingId === order.id}
                                                                className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                                                            >
                                                                {updatingId === order.id ? (
                                                                    <RotateCcw size={12} className="animate-spin" />
                                                                ) : (
                                                                    <Package size={14} />
                                                                )}
                                                                <span>Pack Order</span>
                                                            </button>
                                                        )}

                                                        {order.delivery_status === "packed" && (
                                                            <button
                                                                onClick={() => updateStatus(order.id, "shipped")}
                                                                disabled={updatingId === order.id}
                                                                className="flex-1 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                                                            >
                                                                {updatingId === order.id ? (
                                                                    <RotateCcw size={12} className="animate-spin" />
                                                                ) : (
                                                                    <Truck size={14} />
                                                                )}
                                                                <span>Ship Order</span>
                                                            </button>
                                                        )}

                                                        {order.delivery_status === "shipped" && (
                                                            <button
                                                                onClick={() => updateStatus(order.id, "delivered")}
                                                                disabled={updatingId === order.id}
                                                                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                                                            >
                                                                {updatingId === order.id ? (
                                                                    <RotateCcw size={12} className="animate-spin" />
                                                                ) : (
                                                                    <CheckCircle2 size={14} />
                                                                )}
                                                                <span>Mark Delivered</span>
                                                            </button>
                                                        )}

                                                        {order.delivery_status === "delivered" && (
                                                            <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                                                                <CheckCircle2 size={13} />
                                                                <span>Delivered</span>
                                                            </div>
                                                        )}

                                                        {order.delivery_status === "cancelled" && (
                                                            <div className="flex-1 py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                                                                <AlertTriangle size={13} />
                                                                <span>Cancelled</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-2 px-1 text-xs">
                                        <p className="text-slate-400 font-semibold">
                                            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <span className="px-3.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-slate-800 dark:text-white">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            ) : (
                /* Store Credit Requests View */
                <StoreCreditRequestsTab merchantId={merchantId} />
            )}

            {/* Shipping & Tracking Modal */}
            <AnimatePresence>
                {shippingModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/50">
                                            <Truck size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-base text-slate-900 dark:text-white">
                                                {shippingModal.mode === "schedule" ? "Schedule Delivery" : "Dispatch Order"}
                                            </h3>
                                            <p className="text-xs text-slate-400 font-medium">Order #{shippingModal.id?.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShippingModal(null)}
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Tracking Number / AWB
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. BLUEDART987654"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-900 dark:text-white"
                                            value={shippingData.tracking_number}
                                            onChange={(e) => setShippingData((prev) => ({ ...prev, tracking_number: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Estimated Delivery Date &amp; Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-900 dark:text-white"
                                            value={shippingData.estimated_delivery_at}
                                            onChange={(e) => setShippingData((prev) => ({ ...prev, estimated_delivery_at: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Delivery Partner / Notes
                                        </label>
                                        <textarea
                                            placeholder="e.g. Partner: Blue Dart Express"
                                            rows={2}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-900 dark:text-white resize-none"
                                            value={shippingData.status_notes}
                                            onChange={(e) => setShippingData((prev) => ({ ...prev, status_notes: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button
                                        onClick={() => updateStatus(
                                            shippingModal.id,
                                            shippingModal.mode === "schedule" ? shippingModal.delivery_status : "shipped",
                                            shippingData.tracking_number,
                                            shippingData.estimated_delivery_at,
                                            shippingData.status_notes
                                        )}
                                        disabled={updatingId === shippingModal.id}
                                        className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                                    >
                                        {updatingId === shippingModal.id ? (
                                            <RotateCcw className="animate-spin" size={14} />
                                        ) : (
                                            <Truck size={14} />
                                        )}
                                        {shippingModal.mode === "schedule" ? "Save Schedule" : "Confirm Dispatch"}
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
