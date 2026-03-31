"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    ShoppingBag, Plus, Package, TrendingUp, DollarSign,
    ChevronRight, Tags, ClipboardList, Store, Edit,
    ToggleLeft, ToggleRight, Search, Filter, Clock,
    CheckCircle2, AlertTriangle, Trash2
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

const TAB_PLATFORM = "platform";
const TAB_CUSTOM = "custom";

export default function AdminShoppingClient({ products: initialProducts, stats: initialStats, initialOrders }) {
    const [localProducts, setLocalProducts] = useState(initialProducts);
    const [localOrders, setLocalOrders] = useState(initialOrders);
    const [activeTab, setActiveTab] = useState(TAB_PLATFORM);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [stockEdits, setStockEdits] = useState({});
    const [savingStock, setSavingStock] = useState(new Set());
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // REALTIME SUBSCRIPTION
    useEffect(() => {
        const productChannel = supabase
            .channel('admin-shopping-products')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_products' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setLocalProducts(prev => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new.deleted_at) {
                        // Soft-deleted — remove from list
                        setLocalProducts(prev => prev.filter(p => p.id !== payload.new.id));
                    } else {
                        setLocalProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
                    }
                } else if (payload.eventType === 'DELETE') {
                    setLocalProducts(prev => prev.filter(p => p.id === payload.old.id));
                }
            })
            .subscribe();

        const orderChannel = supabase
            .channel('admin-shopping-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_order_groups' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setLocalOrders(prev => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setLocalOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
                } else if (payload.eventType === 'DELETE') {
                    setLocalOrders(prev => prev.filter(o => o.id === payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(productChannel);
            supabase.removeChannel(orderChannel);
        };
    }, []);

    // COMPUTED STATS (REALTIME)
    const stats = useMemo(() => {
        const products = localProducts;
        const orderStats = localOrders;

        return {
            totalProducts: products.length,
            platformProducts: products.filter(p => !p.merchant_inventory?.some(inv => inv.is_platform_product === false)).length,
            customProducts: products.filter(p => p.merchant_inventory?.some(inv => inv.is_platform_product === false)).length,
            activeProducts: products.filter(p => p.is_active).length,
            totalOrders: orderStats.length,
            pendingOrders: orderStats.filter(o => o.delivery_status === 'pending').length,
            totalRevenue: orderStats.reduce((sum, o) => sum + (o.total_amount_paise || 0), 0),
        };
    }, [localProducts, localOrders]);

    const handleAdminStockUpdate = async (productId, newStock) => {
        const parsedStock = parseInt(newStock);
        if (isNaN(parsedStock) || parsedStock < 0) return;

        setSavingStock(prev => {
            const next = new Set(prev);
            next.add(productId);
            return next;
        });

        try {
            const res = await fetch('/api/admin/shopping/products', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: productId, admin_stock: parsedStock })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update stock');
            }

            toast.success('Stock updated successfully');
            setStockEdits(prev => ({ ...prev, [productId]: parsedStock }));
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to update stock');
            setStockEdits(prev => {
                const next = { ...prev };
                delete next[productId];
                return next;
            });
        } finally {
            setSavingStock(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    const handleDeleteProduct = async (productId) => {
        setConfirmDeleteId(null);
        setDeletingId(productId);
        try {
            const res = await fetch(`/api/admin/shopping/products?id=${productId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete product');
            }
            // Optimistically remove from list (realtime will also handle it)
            setLocalProducts(prev => prev.filter(p => p.id !== productId));
            toast.success('Product deleted');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to delete product');
        } finally {
            setDeletingId(null);
        }
    };

    const platformProducts = localProducts.filter(p => !p.merchant_inventory?.some(inv => inv.is_platform_product === false));
    const customProducts = localProducts.filter(p => p.merchant_inventory?.some(inv => inv.is_platform_product === false));
    const currentProducts = activeTab === TAB_PLATFORM ? platformProducts : customProducts;

    // Get unique categories for current tab
    const categories = [...new Set(currentProducts.map(p => p.category || p.shopping_categories?.name).filter(Boolean))];

    const filtered = currentProducts.filter(p => {
        const matchesSearch = !search ||
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            (p.merchant_inventory?.find(inv => inv.is_platform_product === false)?.merchants?.business_name || "").toLowerCase().includes(search.toLowerCase());
        const cat = p.category || p.shopping_categories?.name;
        const matchesCat = categoryFilter === "all" || cat === categoryFilter;
        return matchesSearch && matchesCat;
    });

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-[#f8f9fb] min-h-screen font-[family-name:var(--font-outfit)]">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <ShoppingBag size={12} className="text-blue-600" />
                        Platform Logistics
                    </div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none">
                        Shopping <span className="text-blue-600">Service</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-base max-w-md">
                        Manage platform inventory and oversight of merchant custom products.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <Link
                        href="/admin/shopping/orders"
                        className="group flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 sm:pl-5 sm:pr-4 py-3 sm:py-3.5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <ClipboardList size={16} className="text-blue-500" />
                        <span>Orders</span>
                        {stats.pendingOrders > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black animate-pulse">
                                {stats.pendingOrders}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/admin/shopping/categories"
                        className="group flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 sm:pl-5 sm:pr-4 py-3 sm:py-3.5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <Tags size={16} />
                        <span>Cats</span>
                    </Link>
                    <Link
                        href="/admin/shopping/new"
                        className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-950 hover:bg-blue-600 text-white px-6 sm:pl-5 sm:pr-4 py-3.5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-2xl shadow-slate-950/10 active:scale-95"
                    >
                        <span>Add Product</span>
                        <div className="bg-white/10 p-1 rounded-xl group-hover:rotate-90 transition-transform">
                            <Plus size={16} />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Top Stats - Mobile Horizontal Scroll */}
            <div className="flex overflow-x-auto pb-6 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-10 hide-scrollbar snap-x snap-mandatory">
                {[
                    { label: "Total Products", value: stats.totalProducts, icon: Package, color: "text-slate-700", bg: "bg-slate-100" },
                    { label: "Platform Items", value: stats.platformProducts, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Custom Items", value: stats.customProducts, icon: Store, color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Status Active", value: stats.activeProducts, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Total Orders", value: stats.totalOrders, icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Pending Disp.", value: stats.pendingOrders, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Total Revenue", value: `₹${((stats.totalRevenue || 0) / 100).toLocaleString('en-IN')}`, icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50" },
                ].map((stat) => (
                    <div key={stat.label} className="snap-center shrink-0 w-[45vw] sm:w-auto bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 cursor-default">
                        <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                            <stat.icon size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-black text-slate-900 truncate leading-none tracking-tighter">{stat.value}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs & Search Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-[1.5rem] p-1 shadow-sm overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => { setActiveTab(TAB_PLATFORM); setCategoryFilter("all"); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === TAB_PLATFORM
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            }`}
                    >
                        <ShoppingBag size={14} /> Platform
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${activeTab === TAB_PLATFORM ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {stats.platformProducts}
                        </span>
                    </button>
                    <button
                        onClick={() => { setActiveTab(TAB_CUSTOM); setCategoryFilter("all"); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === TAB_CUSTOM
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            }`}
                    >
                        <Store size={14} /> Custom
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${activeTab === TAB_CUSTOM ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {stats.customProducts}
                        </span>
                    </button>
                </div>

                <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Find products..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-xs font-bold text-slate-900 dark:placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="w-32 px-3 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-[10px] font-black text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                    >
                        <option value="all">Category: All</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Context Banner */}
            {activeTab === TAB_CUSTOM && (
                <div className="mb-5 p-4 rounded-2xl bg-violet-50 border border-violet-200 flex items-start gap-3">
                    <Store size={16} className="text-violet-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-violet-800">Merchant Custom Products</p>
                        <p className="text-xs text-violet-600 mt-0.5">
                            These products were created by merchants directly. InTrust earns <strong>5% commission</strong> on each sale.
                            You can view and toggle their active status, but pricing is set by merchants.
                        </p>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-24 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
                        <Package className="mx-auto text-slate-100 mb-4" size={56} />
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Matrix Empty: No Products Found</p>
                    </div>
                ) : (
                    filtered.map(product => {
                        const isMerchantProduct = product.merchant_inventory?.some(inv => inv.is_platform_product === false);
                        const categoryName = product.shopping_categories?.name || product.category || "General";
                        const currentStock = stockEdits[product.id] !== undefined ? parseInt(stockEdits[product.id]) || 0 : (product.admin_stock || 0);
                        const lowStock = currentStock < 5;

                        return (
                            <div
                                key={product.id}
                                className="group relative bg-white p-4 sm:p-5 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 flex items-start gap-4 sm:gap-6"
                            >
                                {/* Image */}
                                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500 border border-slate-100">
                                    {product.product_images?.[0] ? (
                                        <img src={product.product_images[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package size={32} className="text-slate-200" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 py-1">
                                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${product.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                                            {product.is_active ? "Active" : "Draft"}
                                        </span>
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{categoryName}</span>
                                        {isMerchantProduct && (
                                            <span className="text-[8px] font-black text-violet-500 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100 uppercase tracking-wider">
                                                {product.merchant_inventory?.find(inv => inv.is_platform_product === false)?.merchants?.business_name || "Merchant"}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base sm:text-lg font-black text-slate-950 truncate tracking-tight">{product.title}</h3>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                                        {!isMerchantProduct && (
                                            <div className="hidden sm:block">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Trade Price</p>
                                                <p className="font-black text-slate-950 text-sm tracking-tighter">₹{((product.wholesale_price_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Retail</p>
                                            <p className="font-black text-blue-600 text-sm tracking-tighter">₹{((product.suggested_retail_price_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                        </div>
                                        {!isMerchantProduct && (
                                            <div className="col-span-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Inventory</p>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={stockEdits[product.id] ?? (product.admin_stock || 0)}
                                                        onChange={(e) => setStockEdits(prev => ({ ...prev, [product.id]: e.target.value }))}
                                                        onBlur={(e) => handleAdminStockUpdate(product.id, e.target.value)}
                                                        className={`w-14 px-1.5 py-1 bg-slate-50/50 border rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all ${lowStock ? "border-amber-200 text-amber-600 bg-amber-50" : "border-slate-100 text-slate-950"}`}
                                                    />
                                                    {savingStock.has(product.id) && (
                                                        <RefreshCw className="animate-spin text-blue-600" size={12} />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 shrink-0 self-center">
                                    <Link href={`/admin/shopping/edit/${product.id}`} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:bg-slate-950 hover:text-white transition-all shadow-sm">
                                        <Edit size={16} />
                                    </Link>

                                    {confirmDeleteId === product.id ? (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-sm">
                                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl space-y-6 max-w-xs w-full text-center">
                                                <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
                                                    <AlertTriangle size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black text-slate-950">Wipe Product?</h4>
                                                    <p className="text-sm text-slate-500 mt-2">This action is permanent and will remove the item from all catalogs.</p>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        className="w-full py-4 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                                                    >
                                                        Confirm Deletion
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-950 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : deletingId === product.id ? (
                                        <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                                            <RefreshCw className="animate-spin text-red-500" size={16} />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteId(product.id)}
                                            className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 hover:bg-red-50 hover:text-red-500 transition-all"
                                            title="Delete product"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
