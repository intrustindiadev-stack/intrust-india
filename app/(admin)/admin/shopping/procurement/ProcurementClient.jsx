"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Package, ChevronLeft, Search, ArrowDownToLine,
    CheckCircle2, Store, AlertTriangle, RefreshCw, X, ShoppingCart
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Image from "next/image";

export default function ProcurementClient({ initialProducts }) {
    const [products, setProducts] = useState(initialProducts || []);
    const [search, setSearch] = useState("");
    const [merchantFilter, setMerchantFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [qtyEdits, setQtyEdits] = useState({});
    const [priceEdits, setPriceEdits] = useState({});
    const [confirmItem, setConfirmItem] = useState(null); // { product, qty, platformPricePaise, idempotencyKey }
    const [submitting, setSubmitting] = useState(false);

    // ── Realtime: refresh merchant_inventory stock live ──────────────
    useEffect(() => {
        const invChannel = supabase
            .channel('admin-procurement-inventory')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchant_inventory' }, (payload) => {
                setProducts(prev => prev.map(p => ({
                    ...p,
                    merchant_inventory: p.merchant_inventory?.map(inv =>
                        inv.id === payload.new.id ? { ...inv, ...payload.new } : inv
                    )
                })));
            })
            .subscribe();

        return () => supabase.removeChannel(invChannel);
    }, []);

    // ── Derived filter options ────────────────────────────────────────
    const merchants = useMemo(() => {
        const map = {};
        products.forEach(p => {
            const inv = p.merchant_inventory?.find(i => i.is_platform_product === false) || p.merchant_inventory?.[0];
            const m = inv?.merchants;
            if (m?.id && m?.business_name) map[m.id] = m.business_name;
        });
        return Object.entries(map).map(([id, name]) => ({ id, name }));
    }, [products]);

    const categories = useMemo(() => {
        return [...new Set(products.map(p => p.shopping_categories?.name).filter(Boolean))];
    }, [products]);

    // ── Filtered list ─────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return products.filter(p => {
            const inv = p.merchant_inventory?.find(i => i.is_platform_product === false) || p.merchant_inventory?.[0];
            const businessName = inv?.merchants?.business_name || "";
            const merchantId = inv?.merchants?.id || "";
            const categoryName = p.shopping_categories?.name || "";

            const matchesSearch = !search ||
                p.title.toLowerCase().includes(search.toLowerCase()) ||
                businessName.toLowerCase().includes(search.toLowerCase());

            const matchesMerchant = merchantFilter === "all" || merchantId === merchantFilter;
            const matchesCategory = categoryFilter === "all" || categoryName === categoryFilter;

            return matchesSearch && matchesMerchant && matchesCategory;
        });
    }, [products, search, merchantFilter, categoryFilter]);

    // ── Open confirmation modal ───────────────────────────────────────
    const openConfirm = (product) => {
        const inv = product.merchant_inventory?.find(i => i.is_platform_product === false) || product.merchant_inventory?.[0];
        const qty = parseInt(qtyEdits[product.id]) || 1;
        const platformPriceRs = parseFloat(priceEdits[product.id]);
        const platformPricePaise = Math.round(platformPriceRs * 100);

        setConfirmItem({
            product,
            inv,
            qty,
            platformPricePaise,
            idempotencyKey: crypto.randomUUID(),
        });
    };

    // ── Procure handler ───────────────────────────────────────────────
    const handleProcure = async () => {
        if (!confirmItem) return;
        const { product, inv, qty, platformPricePaise, idempotencyKey } = confirmItem;
        const merchantId = inv?.merchants?.id;

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/shopping/procure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantId,
                    items: [{
                        product_id: product.id,
                        merchant_inventory_id: inv.id,
                        quantity: qty,
                        platform_price_paise: platformPricePaise,
                    }],
                    idempotencyKey,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Procurement failed');

            toast.success(`Procured ${qty} unit${qty > 1 ? 's' : ''} — ₹${(data.total_amount_paise / 100).toLocaleString('en-IN')} credited to merchant.`);

            // Update local stock
            setProducts(prev => prev.map(p =>
                p.id === product.id
                    ? {
                        ...p,
                        admin_stock: (p.admin_stock || 0) + qty,
                        platform_listed: true,
                        platform_price_paise: platformPricePaise,
                        merchant_inventory: p.merchant_inventory?.map(i =>
                            i.id === inv.id
                                ? { ...i, stock_quantity: Math.max(0, (i.stock_quantity || 0) - qty) }
                                : i
                        )
                    }
                    : p
            ));

            // Clear edits for this product
            setQtyEdits(prev => { const n = { ...prev }; delete n[product.id]; return n; });
            setPriceEdits(prev => { const n = { ...prev }; delete n[product.id]; return n; });

            setConfirmItem(null);
        } catch (err) {
            console.error('[Procurement] Error:', err);
            toast.error(err.message || 'Procurement failed');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────
    const fmt = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-[#f8f9fb] min-h-screen font-[family-name:var(--font-outfit)]">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/admin/shopping" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors text-xs font-black uppercase tracking-widest">
                            <ChevronLeft size={14} /> Back to Shopping
                        </Link>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <Link href="/admin/shopping/procurement/history" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors text-xs font-black uppercase tracking-widest">
                            History
                        </Link>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                        <ArrowDownToLine size={12} />
                        Wholesale Procurement
                    </div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none">
                        Procure <span className="text-indigo-600">Stock</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-base max-w-md">
                        Buy wholesale from approved merchants. Stock is added to platform inventory instantly.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search products or merchants..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={merchantFilter}
                    onChange={e => setMerchantFilter(e.target.value)}
                    className="w-full sm:w-44 px-3 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-[10px] font-black text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                >
                    <option value="all">All Merchants</option>
                    {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-full sm:w-44 px-3 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-[10px] font-black text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                >
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Info Banner */}
            <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3">
                <ShoppingCart size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-black text-indigo-800">Wholesale Procurement Flow</p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                        Set a quantity and platform sell price, then confirm. Stock transfers from merchant inventory to platform, and the merchant wallet is credited instantly.
                    </p>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-24 text-center">
                        <Package className="mx-auto text-slate-100 mb-4" size={56} />
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">
                            No live merchant products found
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/70">
                                    <th className="text-left px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Merchant</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">HSN / GST</th>
                                    <th className="text-right px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Wholesale</th>
                                    <th className="text-right px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Avail. Stock</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty to Buy</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sell Price (₹)</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(product => {
                                    const inv = product.merchant_inventory?.find(i => i.is_platform_product === false) || product.merchant_inventory?.[0];
                                    const merchantName = inv?.merchants?.business_name || "Unknown";
                                    const availStock = inv?.stock_quantity ?? 0;
                                    const qty = parseInt(qtyEdits[product.id]) || 1;
                                    const priceRs = priceEdits[product.id] ?? "";
                                    const platformPricePaise = Math.round(parseFloat(priceRs) * 100) || 0;

                                    const isQtyInvalid = qty < 1 || qty > availStock;
                                    const isPriceInvalid = !priceRs || parseFloat(priceRs) <= 0;
                                    const canProcure = !isQtyInvalid && !isPriceInvalid && availStock > 0;

                                    return (
                                        <tr key={product.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            {/* Product */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 relative">
                                                        {product.product_images?.[0]
                                                            ? <Image src={product.product_images[0]} alt="" fill sizes="48px" className="object-cover" />
                                                            : <Package size={20} className="text-slate-200" />
                                                        }
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-slate-950 truncate max-w-[180px] tracking-tight">{product.title}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                            {product.shopping_categories?.name || "General"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Merchant */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Store size={12} className="text-violet-500 shrink-0" />
                                                    <span className="text-xs font-black text-violet-700 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100 uppercase tracking-wider truncate max-w-[120px]">
                                                        {merchantName}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* HSN / GST */}
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <span className="block text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg w-fit">
                                                        {product.hsn_code || "—"}
                                                    </span>
                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        GST {product.gst_percentage ?? 0}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Wholesale price */}
                                            <td className="px-4 py-4 text-right">
                                                <p className="text-sm font-black text-slate-950 tracking-tighter">
                                                    {fmt(product.wholesale_price_paise)}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">per unit</p>
                                            </td>

                                            {/* Available stock */}
                                            <td className="px-4 py-4 text-right">
                                                <span className={`text-sm font-black tracking-tighter ${availStock <= 0 ? 'text-red-500' : availStock < 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                                    {availStock}
                                                </span>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">units</p>
                                            </td>

                                            {/* Qty input */}
                                            <td className="px-4 py-4 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={availStock}
                                                    value={qtyEdits[product.id] ?? 1}
                                                    onChange={e => setQtyEdits(prev => ({ ...prev, [product.id]: e.target.value }))}
                                                    disabled={availStock <= 0}
                                                    className={`w-20 px-2 py-2 text-center bg-slate-50 border rounded-xl text-xs font-black outline-none focus:ring-4 transition-all disabled:opacity-50 ${isQtyInvalid ? 'border-red-300 focus:ring-red-500/10 text-red-600' : 'border-slate-200 focus:ring-indigo-500/10 text-slate-900'}`}
                                                />
                                            </td>

                                            {/* Platform sell price */}
                                            <td className="px-4 py-4 text-center">
                                                <div className="relative inline-block">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={priceRs}
                                                        onChange={e => setPriceEdits(prev => ({ ...prev, [product.id]: e.target.value }))}
                                                        placeholder="0.00"
                                                        disabled={availStock <= 0}
                                                        className={`w-28 pl-6 pr-2 py-2 bg-slate-50 border rounded-xl text-xs font-black outline-none focus:ring-4 transition-all disabled:opacity-50 ${isPriceInvalid && priceRs !== "" ? 'border-red-300 focus:ring-red-500/10 text-red-600' : 'border-slate-200 focus:ring-indigo-500/10 text-slate-900'}`}
                                                    />
                                                </div>
                                            </td>

                                            {/* Action */}
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => openConfirm(product)}
                                                    disabled={!canProcure}
                                                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
                                                >
                                                    <ArrowDownToLine size={12} />
                                                    Procure
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Confirmation Modal ────────────────────────────────────────── */}
            {confirmItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-sm">
                    <div className="relative bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 max-w-sm w-full space-y-6">
                        {/* Close */}
                        <button
                            onClick={() => setConfirmItem(null)}
                            disabled={submitting}
                            className="absolute top-5 right-5 w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
                        >
                            <X size={16} />
                        </button>

                        {/* Icon + Title */}
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center">
                                <ArrowDownToLine size={28} className="text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-950 tracking-tight">Confirm Procurement</h4>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2 font-medium">{confirmItem.product.title}</p>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-100">
                            {[
                                { label: "Quantity", value: `${confirmItem.qty} unit${confirmItem.qty > 1 ? 's' : ''}` },
                                { label: "Unit Wholesale Cost", value: fmt(confirmItem.product.wholesale_price_paise) },
                                { label: "GST Rate", value: `${confirmItem.product.gst_percentage ?? 0}%` },
                                {
                                    label: "GST Amount",
                                    value: fmt(Math.round(confirmItem.product.wholesale_price_paise * confirmItem.qty * (confirmItem.product.gst_percentage ?? 0) / 100))
                                },
                                {
                                    label: "Total Credited to Merchant",
                                    value: fmt(
                                        confirmItem.product.wholesale_price_paise * confirmItem.qty +
                                        Math.round(confirmItem.product.wholesale_price_paise * confirmItem.qty * (confirmItem.product.gst_percentage ?? 0) / 100)
                                    ),
                                    highlight: true
                                },
                                {
                                    label: "Platform Sell Price",
                                    value: fmt(confirmItem.platformPricePaise),
                                },
                                {
                                    label: "Projected Margin (per unit)",
                                    value: fmt(confirmItem.platformPricePaise - confirmItem.product.wholesale_price_paise),
                                    positive: (confirmItem.platformPricePaise - confirmItem.product.wholesale_price_paise) > 0
                                },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                                    <span className={`text-sm font-black tracking-tighter ${row.highlight ? 'text-indigo-600' : row.positive === true ? 'text-emerald-600' : row.positive === false ? 'text-red-500' : 'text-slate-950'}`}>
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleProcure}
                                disabled={submitting}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:active:scale-100"
                            >
                                {submitting
                                    ? <><RefreshCw size={14} className="animate-spin" /> Processing...</>
                                    : <><CheckCircle2 size={14} /> Confirm &amp; Pay Merchant</>
                                }
                            </button>
                            <button
                                onClick={() => setConfirmItem(null)}
                                disabled={submitting}
                                className="w-full py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-950 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
