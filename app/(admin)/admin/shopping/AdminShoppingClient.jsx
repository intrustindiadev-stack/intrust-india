"use client";

import React, { useState } from "react";
import {
    ShoppingBag, Plus, Package, TrendingUp, DollarSign,
    ChevronRight, Tags, ClipboardList, Store, Edit,
    ToggleLeft, ToggleRight, Search, Filter, Clock,
    CheckCircle2, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

const TAB_PLATFORM = "platform";
const TAB_CUSTOM = "custom";

export default function AdminShoppingClient({ products, stats }) {
    const [activeTab, setActiveTab] = useState(TAB_PLATFORM);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [stockEdits, setStockEdits] = useState({});
    const [savingStock, setSavingStock] = useState(new Set());

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

    const platformProducts = products.filter(p => !p.merchant_inventory?.some(inv => inv.is_platform_product === false));
    const customProducts = products.filter(p => p.merchant_inventory?.some(inv => inv.is_platform_product === false));
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
                <div className="flex items-center gap-3 flex-wrap">
                    <Link
                        href="/admin/shopping/orders"
                        className="group flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 pl-5 pr-4 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <ClipboardList size={16} className="text-blue-500" />
                        <span>Manage Orders</span>
                        {stats.pendingOrders > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black">
                                {stats.pendingOrders} pending
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/admin/shopping/categories"
                        className="group flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 pl-5 pr-4 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <Tags size={16} />
                        <span>Categories</span>
                    </Link>
                    <Link
                        href="/admin/shopping/new"
                        className="group flex items-center gap-2 bg-slate-950 hover:bg-blue-600 text-white pl-5 pr-4 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-slate-950/10 active:scale-95"
                    >
                        <span>Add Product</span>
                        <div className="bg-white/10 p-1 rounded-xl group-hover:rotate-90 transition-transform">
                            <Plus size={16} />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
                {[
                    { label: "Total Products", value: stats.totalProducts, icon: Package, color: "text-slate-700", bg: "bg-slate-100" },
                    { label: "Platform Products", value: stats.platformProducts, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Custom Products", value: stats.customProducts, icon: Store, color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Active", value: stats.activeProducts, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Total Orders", value: stats.totalOrders, icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Pending Orders", value: stats.pendingOrders, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Revenue", value: `₹${((stats.totalRevenue || 0)/100).toLocaleString('en-IN')}`, icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                            <stat.icon size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-black text-slate-900 truncate leading-none">{stat.value}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-1.5 flex gap-1 shadow-sm">
                    <button
                        onClick={() => { setActiveTab(TAB_PLATFORM); setCategoryFilter("all"); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                            activeTab === TAB_PLATFORM
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                    >
                        <ShoppingBag size={14} /> Platform Products
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${activeTab === TAB_PLATFORM ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {stats.platformProducts}
                        </span>
                    </button>
                    <button
                        onClick={() => { setActiveTab(TAB_CUSTOM); setCategoryFilter("all"); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                            activeTab === TAB_CUSTOM
                                ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                    >
                        <Store size={14} /> Merchant Custom
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${activeTab === TAB_CUSTOM ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {stats.customProducts}
                        </span>
                    </button>
                </div>

                {/* Search + Category Filter */}
                <div className="relative ml-auto">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-52"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none"
                >
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-24 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                        <Package className="mx-auto text-slate-100 mb-4" size={56} />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No products found</p>
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
                                className="group bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-xl hover:shadow-blue-600/5 transition-all flex items-center gap-5"
                            >
                                {/* Image */}
                                <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 group-hover:bg-slate-100 transition-colors">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package size={28} className="text-slate-200" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${product.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                            {product.is_active ? "Active" : "Draft"}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{categoryName}</span>
                                        {isMerchantProduct && (
                                            <span className="text-[9px] font-black text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                                                {product.merchant_inventory?.find(inv => inv.is_platform_product === false)?.merchants?.business_name || "Merchant"}
                                            </span>
                                        )}
                                        {product.gst_percentage > 0 && (
                                            <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                                                GST {product.gst_percentage}%
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-black text-slate-900 truncate tracking-tight">{product.title}</h3>
                                    <div className="flex items-center gap-4 mt-2">
                                        {!isMerchantProduct && (
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supply Price</p>
                                                <p className="font-black text-slate-900 text-sm">₹{((product.wholesale_price_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retail Price</p>
                                            <p className="font-black text-slate-900 text-sm">₹{((product.suggested_retail_price_paise || 0) / 100).toLocaleString("en-IN")}</p>
                                        </div>
                                        {!isMerchantProduct && (
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <input 
                                                        type="number"
                                                        value={stockEdits[product.id] ?? (product.admin_stock || 0)}
                                                        onChange={(e) => setStockEdits(prev => ({ ...prev, [product.id]: e.target.value }))}
                                                        onBlur={(e) => handleAdminStockUpdate(product.id, e.target.value)}
                                                        className={`w-16 px-2 py-1 bg-slate-50 border rounded-lg text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${lowStock ? "border-amber-200 text-amber-600 bg-amber-50/50" : "border-slate-200 text-slate-900"}`}
                                                    />
                                                    {savingStock.has(product.id) && (
                                                        <div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
                                                    )}
                                                    {lowStock && !savingStock.has(product.id) && <AlertTriangle size={14} className="text-amber-500" />}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Link href={`/admin/shopping/edit/${product.id}`} className="p-2.5 rounded-full bg-slate-50 text-slate-300 hover:bg-blue-600 hover:text-white transition-all shrink-0">
                                    <Edit size={14} />
                                </Link>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
