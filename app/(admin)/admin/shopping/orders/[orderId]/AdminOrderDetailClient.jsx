"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
    Package, MapPin, Phone, Store, ChevronLeft, Clock, Truck,
    CheckCircle2, XCircle, RefreshCw, ArrowUpRight, User,
    Receipt, Download, TrendingUp, AlertCircle, Calendar, Building2, Zap
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";
import { calculatePlatformFeePercentage } from "@/lib/utils/ledger";
import { PLATFORM_CONFIG } from "@/lib/config/platform";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG = {
    pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400", icon: Clock },
    packed: { label: "Packed", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", icon: Package },
    shipped: { label: "Shipped", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", dot: "bg-violet-500", icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-500", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", icon: XCircle },
};

const STATUS_FLOW = ["pending", "packed", "shipped", "delivered"];
const STEPS = [
    { key: "pending", label: "Placed", icon: Package },
    { key: "packed", label: "Packed", icon: Package },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

export default function AdminOrderDetailClient({ order: initialOrder, sellerDetails }) {
    const supabase = createClient();
    const [order, setOrder] = useState(initialOrder);
    const [updating, setUpdating] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [error, setError] = useState(null);
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "");
    const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState(
        order.estimated_delivery_at
            ? format(new Date(order.estimated_delivery_at), "yyyy-MM-dd'T'HH:mm")
            : ""
    );
    const [statusNotes, setStatusNotes] = useState(order.status_notes || "");

    const handleDownloadInvoice = () => {
        setDownloadingPdf(true);
        try {
            generateOrderInvoice({ order, items: order.items || [], seller: sellerDetails || PLATFORM_CONFIG.business, type: "shopping" });
            toast.success("Invoice downloaded");
        } catch (err) {
            toast.error("Failed to generate invoice");
        } finally {
            setDownloadingPdf(false);
        }
    };

    const cfg = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;
    const currentStepIdx = STATUS_FLOW.indexOf(order.delivery_status);
    const nextStatus = currentStepIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStepIdx + 1] : null;
    const isCancelled = order.delivery_status === "cancelled";

    // Financials
    const itemsTotal = (order.items || []).reduce((s, i) => s + (i.total_price_paise || i.unit_price_paise * i.quantity), 0);
    const totalGst = (order.items || []).reduce((s, i) => s + (i.gst_amount_paise || Math.round((i.total_price_paise || i.unit_price_paise * i.quantity) * (i.gst_percentage || 0) / 100)), 0);
    const deliveryFee = order.delivery_fee_paise ?? 0;
    const grandTotal = order.total_amount_paise || (itemsTotal + totalGst + deliveryFee);
    const totalProfit = (order.items || []).reduce((s, i) => s + (i.profit_paise || 0), 0);
    const merchantProfit = order.merchant_profit_paise || 0;
    const platformCut = order.platform_cut_paise || 0;

    const updateStatus = async (newStatus) => {
        setUpdating(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc("update_order_delivery_v3", {
                p_order_id: order.id,
                p_new_status: newStatus,
                p_tracking_number: trackingNumber,
                p_estimated_at: estimatedDeliveryAt || null,
                p_status_notes: statusNotes || null,
                p_is_admin: true
            });
            if (rpcError || !data?.success) throw new Error(rpcError?.message || data?.message || "Update failed");
            setOrder(prev => ({ ...prev, delivery_status: newStatus, tracking_number: trackingNumber, estimated_delivery_at: estimatedDeliveryAt || prev.estimated_delivery_at, status_notes: statusNotes || prev.status_notes }));
            toast.success(`Status updated to ${newStatus}`);
            setStatusNotes("");
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const fmt = (paise) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Sticky Mobile Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                <Link href="/admin/shopping/orders" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shrink-0">
                    <ChevronLeft size={18} />
                </Link>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Detail</p>
                    <p className="text-sm font-black text-slate-900 font-mono truncate">#{order.id?.slice(0, 20).toUpperCase()}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                </span>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700">
                            <AlertCircle size={14} /> {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Order Type Badge */}
                <div className="flex gap-2">
                    {order.is_platform_order ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5">
                            <Building2 size={11} /> Platform Order
                        </span>
                    ) : (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase bg-violet-50 text-violet-600 border border-violet-100 flex items-center gap-1.5">
                            <Store size={11} /> Merchant Order
                        </span>
                    )}
                    {order.payment_method && (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase bg-slate-100 text-slate-600 capitalize">
                            {order.payment_method}
                        </span>
                    )}
                </div>

                {/* Delivery Progress */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Truck size={12} /> Delivery Progress
                    </h2>

                    {isCancelled ? (
                        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                            <XCircle size={22} className="text-red-500 shrink-0" />
                            <div>
                                <p className="font-bold text-red-700">Order Cancelled</p>
                                <p className="text-xs text-red-500 mt-0.5">This order has been cancelled and cannot be updated.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Step Tracker */}
                            <div className="relative flex justify-between mb-6">
                                <div className="absolute top-4 left-[12%] right-[12%] h-0.5 bg-slate-100 z-0" />
                                {currentStepIdx >= 0 && (
                                    <div className="absolute top-4 left-[12%] h-0.5 bg-blue-500 z-0 transition-all duration-700"
                                        style={{ width: `${(currentStepIdx / (STEPS.length - 1)) * 76}%` }} />
                                )}
                                {STEPS.map((step, idx) => {
                                    const isActive = idx <= currentStepIdx;
                                    const Icon = step.icon;
                                    return (
                                        <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200" : "bg-white border-slate-200 text-slate-300"}`}>
                                                <Icon size={15} />
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-tight ${isActive ? "text-blue-600" : "text-slate-300"}`}>{step.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                {nextStatus && (
                                    <button onClick={() => updateStatus(nextStatus)} disabled={updating}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-md active:scale-95">
                                        {updating ? <RefreshCw size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
                                        Mark {STATUS_CONFIG[nextStatus]?.label}
                                    </button>
                                )}
                                <button
                                    onClick={() => confirm("Cancel this order? This cannot be undone.") && updateStatus("cancelled")}
                                    disabled={updating}
                                    className="px-4 py-3 bg-red-50 text-red-600 text-xs font-black uppercase border border-red-200 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 active:scale-95">
                                    <XCircle size={13} className="inline mr-1" />Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Delivery Schedule */}
                {!['delivered', 'cancelled'].includes(order.delivery_status) && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calendar size={12} /> Delivery Info
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-0.5">Est. Date & Time</label>
                                <input type="datetime-local"
                                    className="w-full px-3.5 py-3 text-sm font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 transition-all"
                                    value={estimatedDeliveryAt} onChange={(e) => setEstimatedDeliveryAt(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-0.5">Tracking / Reference ID</label>
                                <input type="text" placeholder="Enter tracking ID..."
                                    className="w-full px-3.5 py-3 text-sm font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 font-mono transition-all"
                                    value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-0.5">Fulfillment Notes</label>
                                <input type="text" placeholder="Driver name, instructions..."
                                    className="w-full px-3.5 py-3 text-sm font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 transition-all"
                                    value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} />
                            </div>
                        </div>
                        <button onClick={() => updateStatus(order.delivery_status)} disabled={updating}
                            className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-100 active:scale-[0.98] disabled:opacity-50">
                            {updating ? <RefreshCw className="animate-spin mx-auto" size={14} /> : "Save Delivery Info"}
                        </button>
                    </div>
                )}

                {/* Customer + Seller — 2-col on wider, stacked on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <User size={12} /> Customer
                        </h2>
                        <p className="font-black text-slate-900 text-base">{order.customer_name || "Unknown"}</p>
                        {order.customer_phone && (
                            <a href={`tel:${order.customer_phone}`} className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 hover:text-blue-600 transition-colors">
                                <Phone size={12} /> {order.customer_phone}
                            </a>
                        )}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><MapPin size={10} /> Address</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{order.delivery_address || "No address provided"}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold">Placed</p>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">{order.created_at ? format(new Date(order.created_at), "dd MMM yyyy, hh:mm a") : "—"}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Store size={12} /> Seller
                        </h2>
                        {order.is_platform_order ? (
                            <>
                                <p className="font-black text-slate-900 text-base">InTrust Official</p>
                                <p className="text-xs text-slate-400 mt-1">Platform-owned inventory</p>
                                <div className="mt-3 pt-3 border-t border-slate-100 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-xs font-black text-blue-700 flex items-center gap-1.5"><TrendingUp size={11} /> 100% revenue to InTrust</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="font-black text-slate-900 text-base">{order.merchant_name || "Unknown Merchant"}</p>
                                {order.merchant_phone && (
                                    <a href={`tel:${order.merchant_phone}`} className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 hover:text-blue-600 transition-colors">
                                        <Phone size={11} /> {order.merchant_phone}
                                    </a>
                                )}
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                                        <p className="text-xs font-black text-violet-700 flex items-center gap-1.5"><Zap size={11} /> Commission split applied</p>
                                        {calculatePlatformFeePercentage(order.commission_rate, platformCut, totalProfit) !== null && (
                                            <p className="text-xs text-violet-500 mt-0.5">Rate: {calculatePlatformFeePercentage(order.commission_rate, platformCut, totalProfit)}% platform fee</p>
                                        )}
                                    </div>
                                    <Link href={`/admin/merchants/${order.merchant_id}`}
                                        className="mt-3 flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-700">
                                        View Merchant Profile <ArrowUpRight size={11} />
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Package size={12} /> Items ({(order.items || []).length})
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {(order.items || []).map((item) => {
                            const gstRate = item.gst_percentage || 0;
                            const gstAmount = Math.round((item.total_price_paise || 0) * gstRate / 100);
                            return (
                                <div key={item.id} className="flex gap-3 p-4">
                                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden p-1">
                                        {item.product_image
                                            ? <img src={item.product_image} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                            : <Package size={18} className="text-slate-200" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm leading-tight">{item.product_title}</p>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    {item.hsn_code && <span className="text-[9px] font-bold text-slate-400">HSN: {item.hsn_code}</span>}
                                                    {gstRate > 0 && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">SGST {gstRate / 2}% | CGST {gstRate / 2}%</span>}
                                                    <span className="text-[9px] font-bold text-slate-400">× {item.quantity}</span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-slate-900 text-sm">{fmt(item.total_price_paise || 0)}</p>
                                                <p className="text-[9px] text-slate-400">{fmt(item.unit_price_paise || 0)} each</p>
                                            </div>
                                        </div>
                                        {gstRate > 0 && (
                                            <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-slate-400 bg-slate-50 rounded-lg p-2">
                                                <span>Base: {fmt(item.total_price_paise || 0)}</span>
                                                <span>CGST {gstRate / 2}%: ₹{(gstAmount / 200).toFixed(2)}</span>
                                                <span>SGST {gstRate / 2}%: ₹{(gstAmount / 200).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bill Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Receipt size={12} /> Bill Summary
                    </h2>
                    <div className="space-y-2.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Items Total</span>
                            <span className="font-bold text-slate-900">{fmt(itemsTotal)}</span>
                        </div>
                        {deliveryFee > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Delivery Fee</span>
                                <span className="font-bold text-slate-900">{fmt(deliveryFee)}</span>
                            </div>
                        )}
                        {totalGst > 0 && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">SGST</span>
                                    <span className="font-bold text-slate-900">{fmt(totalGst / 2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">CGST</span>
                                    <span className="font-bold text-slate-900">{fmt(totalGst / 2)}</span>
                                </div>
                            </>
                        )}
                        <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between">
                            <span className="font-black text-slate-900">Grand Total</span>
                            <span className="font-black text-xl text-slate-900">{fmt(grandTotal)}</span>
                        </div>
                    </div>

                    {/* Revenue Split */}
                    {(merchantProfit > 0 || platformCut > 0 || totalProfit > 0) && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Revenue Split</p>
                            {merchantProfit > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-violet-600 font-bold flex items-center gap-1.5"><Store size={11} /> Merchant Profit</span>
                                    <span className="font-black text-violet-700">{fmt(merchantProfit)}</span>
                                </div>
                            )}
                            {platformCut > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-blue-600 font-bold flex items-center gap-1.5"><TrendingUp size={11} /> Platform Cut</span>
                                    <span className="font-black text-blue-700">{fmt(platformCut)}</span>
                                </div>
                            )}
                            {totalProfit > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-emerald-600 font-bold flex items-center gap-1.5"><TrendingUp size={11} /> Item Profit</span>
                                    <span className="font-black text-emerald-700">{fmt(totalProfit)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <button onClick={handleDownloadInvoice} disabled={downloadingPdf}
                        className="mt-5 w-full py-3.5 rounded-xl bg-slate-900 hover:bg-blue-600 disabled:bg-slate-400 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]">
                        <Download size={14} /> {downloadingPdf ? "Generating..." : "Download Invoice"}
                    </button>
                </div>

            </div>
        </div>
    );
}
