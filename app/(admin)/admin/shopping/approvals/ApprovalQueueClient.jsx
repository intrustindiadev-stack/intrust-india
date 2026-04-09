"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Package, CheckCircle, XCircle, ChevronLeft, CalendarClock } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function ApprovalQueueClient({ initialProducts }) {
    const [products, setProducts] = useState(initialProducts || []);
    const [processingId, setProcessingId] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");

    // REALTIME SUBSCRIPTION
    useEffect(() => {
        const productChannel = supabase
            .channel('admin-approval-queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_products' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new.approval_status === 'pending_approval') {
                    setProducts(prev => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new.approval_status !== 'pending_approval') {
                        // Remove from queue if approved/rejected
                        setProducts(prev => prev.filter(p => p.id !== payload.new.id));
                    } else if (!products.some(p => p.id === payload.new.id)) {
                        // Added back to pending
                        setProducts(prev => [payload.new, ...prev]);
                    } else {
                        // Update existing in queue
                        setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
                    }
                } else if (payload.eventType === 'DELETE') {
                    setProducts(prev => prev.filter(p => p.id === payload.old.id));
                }
            })
            .subscribe();

        return () => supabase.removeChannel(productChannel);
    }, [products]);

    const handleApprove = async (productId) => {
        setProcessingId(productId);
        try {
            const res = await fetch('/api/admin/shopping/approve-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, action: 'approve' })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to approve product');

            toast.success('Product approved and is now live!');
            // Optimistically remove
            setProducts(prev => prev.filter(p => p.id !== productId));
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Approval failed');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (productId) => {
        if (!rejectionReason.trim()) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        setProcessingId(productId);
        try {
            const res = await fetch('/api/admin/shopping/approve-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, action: 'reject', rejectionReason: rejectionReason.trim() })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reject product');

            toast.success('Product rejected.');
            // Optimistically remove
            setProducts(prev => prev.filter(p => p.id !== productId));
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Rejection failed');
        } finally {
            setProcessingId(null);
            setRejectingId(null);
            setRejectionReason("");
        }
    };

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-[#f8f9fb] min-h-screen font-[family-name:var(--font-outfit)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="space-y-2">
                    <Link href="/admin/shopping" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors text-xs font-black uppercase tracking-widest mb-2">
                        <ChevronLeft size={14} /> Back to Shopping
                    </Link>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none">
                        Approval <span className="text-amber-600">Queue</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-base max-w-md">
                        Review and approve custom products submitted by merchants.
                    </p>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 ? (
                    <div className="col-span-full py-24 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
                        <CheckCircle className="mx-auto text-emerald-100 mb-4" size={56} />
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Queue Empty: All caught up!</p>
                    </div>
                ) : (
                    products.map(product => {
                        const businessName = product.merchant_inventory?.[0]?.merchants?.business_name || "Unknown Merchant";
                        const isProcessing = processingId === product.id;

                        return (
                            <div
                                key={product.id}
                                className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col gap-4"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                                        {product.product_images?.[0] ? (
                                            <img src={product.product_images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Package size={24} className="text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="inline-block px-2 py-0.5 rounded-lg text-[8px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-widest mb-2">
                                            ⏳ Pending
                                        </span>
                                        <h3 className="text-base font-black text-slate-950 tracking-tight leading-tight line-clamp-2">
                                            {product.title}
                                        </h3>
                                        <span className="text-[9px] font-black text-violet-500 uppercase tracking-widest block mt-1">
                                            {businessName}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</span>
                                        <span className="text-sm font-bold text-slate-900">{product.category}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selling Price</span>
                                        <span className="text-sm font-black text-blue-600">₹{((product.suggested_retail_price_paise || 0) / 100).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MRP</span>
                                        <span className="text-sm font-bold text-slate-500 line-through">₹{((product.mrp_paise || 0) / 100).toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Stock</span>
                                        <span className="text-sm font-bold text-slate-900">{product.merchant_inventory?.[0]?.stock_quantity || 0}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</span>
                                        <p className="text-xs text-slate-600 line-clamp-2">{product.description}</p>
                                    </div>
                                </div>

                                {rejectingId === product.id ? (
                                    <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Reason for rejection..."
                                            className="w-full text-xs p-3 rounded-xl border border-red-200 bg-red-50/30 outline-none focus:ring-2 focus:ring-red-500/20"
                                            rows="2"
                                            disabled={isProcessing}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleReject(product.id)}
                                                disabled={isProcessing}
                                                className="flex-1 py-2.5 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => setRejectingId(null)}
                                                disabled={isProcessing}
                                                className="px-4 py-2.5 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 mt-auto pt-2">
                                        <button
                                            onClick={() => handleApprove(product.id)}
                                            disabled={isProcessing}
                                            className="flex-1 flex justify-center items-center gap-2 py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                                        >
                                            <CheckCircle size={14} /> Approve
                                        </button>
                                        <button
                                            onClick={() => setRejectingId(product.id)}
                                            disabled={isProcessing}
                                            className="flex-1 flex justify-center items-center gap-2 py-3 bg-slate-50 text-slate-500 border border-slate-100 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                                        >
                                            <XCircle size={14} /> Reject
                                        </button>
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
