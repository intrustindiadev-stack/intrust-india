"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package, CheckCircle2, Truck, Clock, ArrowLeft,
    MapPin, Receipt, Store, Calendar, Download, ArrowUpRight,
    RotateCcw, AlertTriangle, ChevronLeft, XCircle, Copy, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";
import { calculatePlatformFeePercentage } from "@/lib/utils/ledger";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabaseClient";
import ConfirmModal from "@/components/ui/ConfirmModal";

// ─── Delivery Stage Config ───────────────────────────────────────────────────
const STAGES = [
    { key: "pending", label: "Order Placed", icon: Clock, color: "amber" },
    { key: "packed", label: "Packed", icon: Package, color: "blue" },
    { key: "shipped", label: "Shipped", icon: Truck, color: "violet" },
    { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "emerald" },
];

const COLOR_MAP = {
    amber: { ring: "ring-amber-400", bg: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", light: "bg-amber-500/10", border: "border-amber-500/20" },
    blue: { ring: "ring-blue-400", bg: "bg-blue-400", text: "text-blue-600 dark:text-blue-400", light: "bg-blue-500/10", border: "border-blue-500/20" },
    violet: { ring: "ring-violet-400", bg: "bg-violet-400", text: "text-violet-600 dark:text-violet-400", light: "bg-violet-500/10", border: "border-violet-500/20" },
    emerald: { ring: "ring-emerald-400", bg: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-400", light: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

const STATUS_FLOW = ["pending", "packed", "shipped", "delivered"];

// ─── Animated Stage Timeline ──────────────────────────────────────────────────
function DeliveryTimeline({ currentStatus }) {
    const currentIdx = STATUS_FLOW.indexOf(currentStatus);
    const isCancelled = currentStatus === "cancelled";

    return (
        <div className="bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 rounded-3xl p-6 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Truck size={12} /> Delivery Progress
            </p>

            {isCancelled ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="text-red-500" size={20} />
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">This order has been cancelled.</p>
                </div>
            ) : (
                <>
                    {/* Desktop: horizontal */}
                    <div className="hidden sm:flex items-center gap-0">
                        {STAGES.map((stage, idx) => {
                            const done = idx <= currentIdx;
                            const active = idx === currentIdx;
                            const colors = COLOR_MAP[stage.color];
                            const Icon = stage.icon;
                            return (
                                <React.Fragment key={stage.key}>
                                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                        <motion.div
                                            initial={false}
                                            animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                                            transition={active ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
                                            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500
                                                ${done ? colors.bg + " text-white shadow-lg" : "bg-slate-100 dark:bg-white/5 text-slate-400"}
                                                ${active ? colors.ring + " ring-4 shadow-xl" : ""}`}
                                        >
                                            <Icon size={20} />
                                            {done && !active && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border-2 border-emerald-500"
                                                >
                                                    <CheckCircle2 size={11} className="text-emerald-500" />
                                                </motion.div>
                                            )}
                                        </motion.div>
                                        <span className={`text-[10px] font-black uppercase tracking-wide transition-colors ${done ? colors.text : "text-slate-400 dark:text-gray-600"}`}>
                                            {stage.label}
                                        </span>
                                    </div>
                                    {idx < STAGES.length - 1 && (
                                        <div className="flex-1 h-1 mx-2 mb-5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: idx < currentIdx ? "100%" : "0%" }}
                                                transition={{ duration: 0.6, delay: idx * 0.15 }}
                                                className="h-full bg-emerald-400 rounded-full"
                                            />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Mobile: vertical */}
                    <div className="sm:hidden flex flex-col gap-0">
                        {STAGES.map((stage, idx) => {
                            const done = idx <= currentIdx;
                            const active = idx === currentIdx;
                            const colors = COLOR_MAP[stage.color];
                            const Icon = stage.icon;
                            return (
                                <div key={stage.key} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <motion.div
                                            animate={active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                                            transition={active ? { repeat: Infinity, duration: 2 } : {}}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                                                ${done ? colors.bg + " text-white shadow-lg" : "bg-slate-100 dark:bg-white/5 text-slate-400"}
                                                ${active ? colors.ring + " ring-4" : ""}`}
                                        >
                                            <Icon size={18} />
                                        </motion.div>
                                        {idx < STAGES.length - 1 && (
                                            <div className="w-0.5 flex-1 my-1 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden min-h-[24px]">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: idx < currentIdx ? "100%" : "0%" }}
                                                    transition={{ duration: 0.5, delay: idx * 0.15 }}
                                                    className="w-full bg-emerald-400 rounded-full"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className={`pb-6 pt-2 ${idx === STAGES.length - 1 ? "pb-0" : ""}`}>
                                        <p className={`text-sm font-black transition-colors ${done ? colors.text : "text-slate-400 dark:text-gray-600"}`}>
                                            {stage.label}
                                        </p>
                                        {active && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[11px] text-slate-400 dark:text-gray-500 font-medium mt-0.5"
                                            >
                                                Current stage
                                            </motion.p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function MerchantOrderDetailClient({ order, merchantInfo }) {
    const supabase = createClient();
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(order.delivery_status);
    const [showCannotFulfillModal, setShowCannotFulfillModal] = useState(false);
    const [cannotFulfillLoading, setCannotFulfillLoading] = useState(false);

    const orderGrossProfit = (order.items || []).reduce((s, i) => s + (i.gross_profit_paise || 0), 0);
    const orderCommission = (order.items || []).reduce((s, i) => s + (i.commission_amount_paise || 0), 0);
    const orderNetProfit = (order.merchant_profit_paise ?? 0) !== 0
        ? order.merchant_profit_paise
        : (order.items || []).reduce((s, i) => s + (i.net_profit_paise || 0), 0);

    const currentIdx = STATUS_FLOW.indexOf(currentStatus);
    const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
    const isCancelled = currentStatus === "cancelled";

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
    };

    const handleCannotFulfill = async () => {
        setCannotFulfillLoading(true);
        try {
            const response = await fetch(`/api/merchant/cannot-fulfill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Escalation failed");
            toast.success("Order escalated to admin. Commission adjusted.");
            setCurrentStatus('admin_takeover');
        } catch (err) {
            toast.error(err.message || "Failed to escalate");
        } finally {
            setCannotFulfillLoading(false);
            setShowCannotFulfillModal(false);
        }
    };

    const handleMarkNext = async () => {
        if (!nextStatus) return;
        setUpdatingStatus(true);
        try {
            const { data, error } = await supabase.rpc("update_order_delivery_v3", {
                p_order_id: order.id,
                p_new_status: nextStatus,
                p_tracking_number: order.tracking_number || null,
                p_estimated_at: null,
                p_status_notes: null,
                p_is_merchant: true
            });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "Failed");
            setCurrentStatus(nextStatus);
            toast.success(`Order marked as ${nextStatus}!`);
        } catch (err) {
            console.error("[MerchantOrderDetail] status update failed:", err);
            toast.error(getFulfillmentErrorMessage(err));
        } finally {
            setUpdatingStatus(false);
        }
    };


    const handleDownloadInvoice = () => {
        generateOrderInvoice({
            order: { ...order, delivery_fee_paise: order.delivery_fee_paise || 0 },
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
    };

    return (
        <div className="space-y-6 pb-28">
            {/* Back + Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/merchant/shopping/orders"
                    className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center shrink-0 justify-center text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-90"
                >
                    <ChevronLeft size={20} />
                </Link>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-gray-400 font-medium truncate">
                        {order.created_at ? format(new Date(order.created_at), "dd MMM yyyy, HH:mm") : "N/A"} · {order.customer_name || "Guest"}
                    </p>
                </div>
            </div>

            {/* ── Delivery Stage Timeline ── */}
            <DeliveryTimeline currentStatus={currentStatus} />

            {/* ── Shipping Info (if available) ── */}
            {(order.tracking_number || order.delivery_address) && (
                <div className="bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-3">
                    {order.delivery_address && (
                        <div className="flex items-start gap-3">
                            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">{order.delivery_address}</span>
                        </div>
                    )}
                    {order.tracking_number && (
                        <div className="flex items-center gap-3">
                            <Truck size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-700 dark:text-gray-300">Tracking: <span className="font-mono">{order.tracking_number}</span></span>
                        </div>
                    )}
                    {order.estimated_delivery_at && (
                        <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-500 dark:text-gray-400">
                                Est. Delivery: <span className="font-bold text-slate-700 dark:text-gray-300">{format(new Date(order.estimated_delivery_at), "dd MMM, hh:mm a")}</span>
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Order Items ── */}
            <div className="bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 rounded-3xl p-5 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                    Order Items ({order.items?.length || 0})
                </p>
                <div className="space-y-3">
                    {(order.items || []).map(item => {
                        const gstAmt = Math.round((item.total_price_paise || 0) * (item.gst_percentage || 0) / 100);
                        return (
                            <div key={item.id} className="flex gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                                <div className="w-14 h-14 bg-white dark:bg-white/5 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-white/5 shrink-0">
                                    {item.product_image ? (
                                        <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package size={20} className="text-slate-300 dark:text-gray-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.product_title}</h4>
                                        <p className="text-sm font-black text-slate-900 dark:text-white shrink-0">₹{((item.total_price_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/20 flex items-center gap-1">
                                            <Store size={8} /> STORE
                                        </span>
                                        <span className="text-[9px] text-slate-500 dark:text-gray-500 font-bold">× {item.quantity} units</span>
                                        {item.gst_percentage > 0 && (
                                            <span className="text-[9px] text-teal-600 dark:text-teal-400 font-black">SGST {item.gst_percentage / 2}% | CGST {item.gst_percentage / 2}%</span>
                                        )}
                                    </div>
                                    {item.gst_percentage > 0 && (
                                        <p className="text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                                            Base: ₹{((item.total_price_paise || 0) / 100).toFixed(2)} · SGST: ₹{(gstAmt / 200).toFixed(2)} · CGST: ₹{(gstAmt / 200).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Transaction Ledger (Refactored for Mobile) ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Receipt size={12} className="text-slate-400 dark:text-gray-500" /> Transaction Ledger
                    </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Transaction ID Card */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 group/id relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/id:opacity-100 transition-opacity">
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(order.id);
                                    toast.success("Transaction ID copied!");
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-emerald-500 hover:text-black transition-all"
                                title="Copy Transaction ID"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Transaction ID</p>
                        <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 break-all leading-tight">
                            {order.id.toUpperCase()}
                        </p>
                    </div>

                    {/* Gross Transaction Card */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Gross Revenue</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            ₹{((order.total_amount_paise || 0) / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Sales Profit Card */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Sales Profit</p>
                        <p className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">
                            ₹{(orderGrossProfit / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Platform Fee Card */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Platform Fee</p>
                            {calculatePlatformFeePercentage(order.commission_rate, orderCommission, orderGrossProfit) !== null && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 font-black">
                                    {calculatePlatformFeePercentage(order.commission_rate, orderCommission, orderGrossProfit)}%
                                </span>
                            )}
                        </div>
                        <p className="text-lg font-black text-amber-600 dark:text-amber-500/90 tracking-tight leading-none">
                            ₹{(orderCommission / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Cost Card */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Inventory Cost</p>
                        <p className="text-lg font-black text-red-600 dark:text-red-400 tracking-tight leading-none">
                            ₹{(orderTotalCost / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Pure Margin Card */}
                    <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles size={10} className="text-emerald-500" />
                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Pure Margin</p>
                        </div>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                            ₹{(orderPureProfit / 100).toLocaleString("en-IN")}
                        </p>
                    </div>

                    {/* Net Payout Card */}
                    <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-900 dark:bg-white/10 border border-slate-800 dark:border-white/10 flex items-center justify-between shadow-lg shadow-slate-900/10">
                        <div>
                            <p className="text-[9px] text-slate-400 dark:text-gray-400 font-black uppercase tracking-widest mb-1">Final Net Payout</p>
                            <p className="text-[10px] text-emerald-500/80 font-bold italic">
                                {order.settlement_status === 'settled'
                                    ? 'Settled to wallet'
                                    : order.settlement_status === 'settled_zero'
                                    ? 'Settled (₹0 payout)'
                                    : 'Pending settlement'}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-white tracking-tighter leading-none">
                                ₹{(orderNetProfit / 100).toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Action Bar ── */}
            {!isCancelled && (
                <div className="space-y-3">
                    {/* Status banners — mirror OrderCard logic */}
                    {order.settlement_status === 'settled_zero' && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50">
                            <CheckCircle2 size={14} className="text-amber-500" />
                            <span>₹0 payout — no profit on this order. Settlement complete.</span>
                        </div>
                    )}
                    {order.payment_method !== 'store_credit' && order.settlement_status === 'pending' && currentStatus === 'pending' && (
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/20">
                            <Clock size={14} />
                            <span>⏳ Pending Settlement — approve within 2 hours to keep 70%</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-500 font-semibold bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10 w-fit">
                        <CheckCircle2 size={12} />
                        <span>Ready for next stage</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleDownloadInvoice}
                            className="w-full sm:w-auto sm:flex-none px-5 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 text-xs font-black transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Download size={14} /> PDF INVOICE
                        </button>
                        {currentStatus === 'pending'
                            && order.settlement_status === 'pending'
                            && order.settlement_status !== 'settled_zero'
                            && order.payment_method !== 'store_credit'
                            && (
                            <button
                                onClick={() => setShowCannotFulfillModal(true)}
                                disabled={cannotFulfillLoading}
                                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                <XCircle size={14} /> CANNOT FULFILL
                            </button>
                        )}
                        {nextStatus && (
                            <motion.button
                                onClick={handleMarkNext}
                                disabled={updatingStatus}
                                whileTap={{ scale: 0.96 }}
                                className="w-full sm:w-auto sm:flex-none px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                            >
                                {updatingStatus ? <RotateCcw size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                                MARK AS {nextStatus.toUpperCase()}
                            </motion.button>
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showCannotFulfillModal}
                onConfirm={handleCannotFulfill}
                onCancel={() => setShowCannotFulfillModal(false)}
                title="Cannot Fulfill Order?"
                message="This will escalate the order to admin for fulfillment. Your commission will be reduced to 30% of the profit margin. This action cannot be undone."
                confirmLabel="Yes, Escalate"
                cancelLabel="Keep Order"
            />
        </div>
    );
}
