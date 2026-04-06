"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
    Package, MapPin, Phone, Store, ChevronLeft, Clock, Truck,
    CheckCircle2, XCircle, RefreshCw, ArrowUpRight, User, 
    Receipt, Download, TrendingUp, AlertCircle, Info, Calendar
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

const STATUS_CONFIG = {
    pending:   { label: "Pending",   color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  icon: Clock },
    packed:    { label: "Packed",    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200",   icon: Package },
    shipped:   { label: "Shipped",   color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200",icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-500",    bg: "bg-red-50",    border: "border-red-200",    icon: XCircle },
};

const STATUS_FLOW = ["pending", "packed", "shipped", "delivered"];
const STEPS = [
    { key: "pending",   label: "Order Placed",  icon: Package },
    { key: "packed",    label: "Packed",        icon: Package },
    { key: "shipped",   label: "Shipped",       icon: Truck },
    { key: "delivered", label: "Delivered",     icon: CheckCircle2 },
];

export default function AdminOrderDetailClient({ order: initialOrder }) {
    const supabase = createClient();
    const [order, setOrder] = useState(initialOrder);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "");
    const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState(
        order.estimated_delivery_at 
            ? format(new Date(order.estimated_delivery_at), "yyyy-MM-dd'T'HH:mm") 
            : ""
    );
    const [statusNotes, setStatusNotes] = useState(order.status_notes || "");

    const cfg = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;
    const currentStepIdx = STATUS_FLOW.indexOf(order.delivery_status);
    const nextStatus = currentStepIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStepIdx + 1] : null;
    const isCancelled = order.delivery_status === "cancelled";

    // Financial calculations
    const itemsTotal = (order.items || []).reduce((sum, i) => sum + (i.total_price_paise || 0), 0);
    const deliveryFee = order.delivery_fee_paise ?? 0;
    const grandTotal = itemsTotal + deliveryFee;
    const totalProfit = (order.items || []).reduce((sum, i) => sum + (i.profit_paise || 0), 0);

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
            
            setOrder(prev => ({ 
                ...prev, 
                delivery_status: newStatus,
                tracking_number: trackingNumber,
                estimated_delivery_at: estimatedDeliveryAt || prev.estimated_delivery_at,
                status_notes: statusNotes || prev.status_notes
            }));
            
            toast.success(newStatus === order.delivery_status ? "Delivery info saved" : `Status updated to ${newStatus}`);
            setStatusNotes(""); // Clear notes after update
        } catch (err) {
            console.error("Update error:", err);
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto min-h-screen bg-[#f8f9fb]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/shopping/orders"
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"
                >
                    <ChevronLeft size={18} />
                </Link>
                <div>
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Order Management / Detail
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                        #{order.id?.slice(0, 16).toUpperCase()}
                    </h1>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                        <StatusIcon size={12} />
                        {cfg.label}
                    </span>
                    {order.is_platform_order ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                            🏢 Platform Order
                        </span>
                    ) : (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-violet-50 text-violet-600 border border-violet-200">
                            🏪 Merchant Order
                        </span>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-5 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {/* Status Tracker */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Delivery Progress</h2>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                            {!isCancelled && nextStatus && (
                                <button
                                    onClick={() => updateStatus(nextStatus)}
                                    disabled={updating}
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10 active:scale-95"
                                >
                                    {updating ? <RefreshCw size={12} className="animate-spin" /> : <ArrowUpRight size={12} />}
                                    Mark as {STATUS_CONFIG[nextStatus]?.label}
                                </button>
                            )}
                            {!isCancelled && (
                                <button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to cancel this order? This cannot be undone.")) {
                                            updateStatus("cancelled");
                                        }
                                    }}
                                    disabled={updating}
                                    className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-200 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    <XCircle size={12} className="inline mr-1" />
                                    Cancel Order
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {isCancelled ? (
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                        <XCircle size={24} className="text-red-500" />
                        <div>
                            <p className="font-bold text-red-700">Order Cancelled</p>
                            <p className="text-xs text-red-500 mt-0.5">This order has been cancelled.</p>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="flex justify-between relative z-10">
                            {STEPS.map((step, idx) => {
                                const isActive = idx <= currentStepIdx;
                                const Icon = step.icon;
                                return (
                                    <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all ${
                                            isActive ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white border-slate-200 text-slate-300"
                                        }`}>
                                            <Icon size={18} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-tighter text-center ${isActive ? "text-blue-600" : "text-slate-300"}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="absolute top-5 left-[11%] right-[11%] h-0.5 bg-slate-100 -z-0" />
                        {currentStepIdx >= 0 && (
                            <div
                                className="absolute top-5 left-[11%] h-0.5 bg-blue-600 -z-0 transition-all duration-700"
                                style={{ width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%` }}
                            />
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Manual Delivery Schedule - NEW */}
                {!['delivered', 'cancelled'].includes(order.delivery_status) && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calendar size={12} /> Manual Delivery Estimate
                        </h2>
                        
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Est. Date & Time</label>
                                <input 
                                    type="datetime-local"
                                    className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50/50"
                                    value={estimatedDeliveryAt}
                                    onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Tracking ID / ID</label>
                                <input 
                                    type="text"
                                    placeholder="Enter ID..."
                                    className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono bg-slate-50/50"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Fulfillment Notes</label>
                                <input 
                                    type="text"
                                    placeholder="Driver contact, extra info..."
                                    className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50/50"
                                    value={statusNotes}
                                    onChange={(e) => setStatusNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => updateStatus(order.delivery_status)}
                            disabled={updating}
                            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/10 active:scale-95 disabled:opacity-50"
                        >
                            {updating ? <RefreshCw className="animate-spin mx-auto" size={14} /> : 'Save Delivery Info'}
                        </button>
                    </div>
                )}

                {/* Customer Info */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <User size={12} /> Customer
                    </h2>
                    <p className="font-black text-slate-900 text-lg">{order.customer_name || "Unknown"}</p>
                    {order.customer_phone && (
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                            <Phone size={12} /> {order.customer_phone}
                        </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={10} /> Delivery Address</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{order.delivery_address || "No address provided"}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs text-slate-400">Order Placed</p>
                        <p className="text-xs font-bold text-slate-700">
                            {order.created_at ? format(new Date(order.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                        </p>
                    </div>
                </div>

                {/* Seller Info */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Store size={12} /> Seller
                    </h2>
                    {order.is_platform_order ? (
                        <div>
                            <p className="font-black text-slate-900 text-lg">InTrust Official</p>
                            <p className="text-sm text-slate-500 mt-1">Platform-owned inventory</p>
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-xs font-black text-blue-700 flex items-center gap-1.5">
                                        <TrendingUp size={12} /> Platform Revenue Order
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">100% revenue goes to InTrust</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="font-black text-slate-900 text-lg">{order.merchant_name || "Unknown Merchant"}</p>
                            {order.merchant_phone && (
                                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                                    <Phone size={12} /> {order.merchant_phone}
                                </p>
                            )}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                                    <p className="text-xs font-black text-violet-700 flex items-center gap-1.5">
                                        <Info size={12} /> Commission Order
                                    </p>
                                    <p className="text-xs text-violet-600 mt-1">5% platform commission applies</p>
                                </div>
                                <Link
                                    href={`/admin/merchants/${order.merchant_id}`}
                                    className="mt-3 flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700"
                                >
                                    View Merchant Profile <ArrowUpRight size={11} />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Items List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Package size={12} /> Order Items ({(order.items || []).length})
                </h2>
                <div className="space-y-3">
                    {(order.items || []).map((item) => {
                        const gstRate = item.gst_percentage || 0;
                        const subtotal = item.total_price_paise;
                        const baseTaxable = subtotal / (1 + gstRate / 100);
                        const gstAmount = subtotal - baseTaxable;
                        return (
                            <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
                                    {item.product_image ? (
                                        <img src={item.product_image} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                    ) : (
                                        <Package size={20} className="text-slate-200" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{item.product_title}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {item.hsn_code && (
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">HSN: {item.hsn_code}</span>
                                                )}
                                                {gstRate > 0 && (
                                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">GST {gstRate}%</span>
                                                )}
                                                <span className="text-[9px] font-black text-slate-400">× {item.quantity}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-black text-slate-900">₹{((item.total_price_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                            <p className="text-[9px] text-slate-400">₹{((item.unit_price_paise || 0) / 100).toLocaleString("en-IN")} each</p>
                                        </div>
                                    </div>
                                    {/* Tax breakdown */}
                                    {gstRate > 0 && (
                                        <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] font-medium text-slate-500">
                                            <div>Base: ₹{(baseTaxable / 100).toFixed(2)}</div>
                                            <div>CGST {gstRate/2}%: ₹{(gstAmount / 200).toFixed(2)}</div>
                                            <div>SGST {gstRate/2}%: ₹{(gstAmount / 200).toFixed(2)}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Receipt size={12} /> Bill Summary
                </h2>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Items Total</span>
                        <span className="font-bold text-slate-900">₹{(itemsTotal / 100).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Delivery Fee</span>
                        <span className="font-bold text-slate-900">₹{(deliveryFee / 100).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between">
                        <span className="font-black text-slate-900">Grand Total</span>
                        <span className="font-black text-xl text-slate-900">₹{(grandTotal / 100).toLocaleString("en-IN")}</span>
                    </div>
                    {totalProfit > 0 && (
                        <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between">
                            <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                                <TrendingUp size={12} /> Platform Profit
                            </span>
                            <span className="font-black text-emerald-700">₹{(totalProfit / 100).toLocaleString("en-IN")}</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex gap-3">
                    <Link
                        href={`/admin/shopping/orders/${order.id}/invoice`}
                        target="_blank"
                        className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center gap-2 transition-all"
                    >
                        <Download size={14} /> Customer Invoice
                    </Link>
                </div>
            </div>
        </div>
    );
}
