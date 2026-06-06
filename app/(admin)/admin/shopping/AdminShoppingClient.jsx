"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    ShoppingBag, Plus, Package, PackageX, TrendingUp, DollarSign,
    ChevronRight, Tags, ClipboardList, Store, Edit,
    ToggleLeft, ToggleRight, Search, Filter, Clock,
    CheckCircle2, AlertTriangle, Trash2, ShieldCheck, RefreshCw, FileSpreadsheet, X, ArrowDownToLine
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { isInventoryRowOOS, OOS_LABEL } from '@/lib/shopping/stock';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';
import BulkProductUpload from '@/components/admin/shopping/BulkProductUpload';
import Pagination from '@/components/search/Pagination';

const TAB_PLATFORM = "platform";
const TAB_CUSTOM = "custom";

export default function AdminShoppingClient({
    initialProducts,
    totalCount: initialTotalCount,
    stats: initialStats,
    merchantCounts: initialMerchantCounts,
    pendingApprovals: initialPendingApprovals = 0,
    merchants = [],
    categories = []
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const initialTab = searchParams.get('tab') === TAB_CUSTOM ? TAB_CUSTOM : TAB_PLATFORM;
    const initialMerchant = searchParams.get('merchant') || "all";

    const [localProducts, setLocalProducts] = useState(initialProducts);
    const [stats, setStats] = useState(initialStats);
    const [merchantCounts, setMerchantCounts] = useState(initialMerchantCounts);
    const [pendingApprovals, setPendingApprovals] = useState(initialPendingApprovals);
    
    const [activeTab, setActiveTab] = useState(initialTab);
    const [selectedMerchant, setSelectedMerchant] = useState(initialMerchant);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [oosOnly, setOosOnly] = useState(false);
    const [stockEdits, setStockEdits] = useState({});
    const [savingStock, setSavingStock] = useState(new Set());
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

    // PAGINATION STATE
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [loading, setLoading] = useState(false);

    // DEBOUNCE SEARCH INPUT
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    // Reset page to 1 when debouncedSearch changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // FETCH PRODUCTS FUNCTION
    const fetchProducts = async (currentPage, currentTab, currentSearch, currentCategory, currentOosOnly, currentMerchant) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                tab: currentTab,
                search: currentSearch,
                category: currentCategory,
                oosOnly: currentOosOnly ? "true" : "false",
                merchantId: currentMerchant,
                page: currentPage.toString(),
                pageSize: pageSize.toString()
            });

            const res = await fetch(`/api/admin/shopping/products?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch products");
            
            const data = await res.json();
            setLocalProducts(data.products || []);
            setTotalCount(data.totalCount || 0);
        } catch (err) {
            console.error("Error fetching products:", err);
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    // RE-FETCH ALL COUNTS AND STATS
    const refreshStatsAndCounts = async () => {
        try {
            const { data: statsData, error: statsError } = await supabase.rpc("get_admin_shopping_stats");
            if (statsError) throw statsError;
            if (statsData && statsData.length > 0) {
                const dbStats = statsData[0];
                setStats({
                    totalProducts: Number(dbStats.total_products || 0),
                    platformProducts: Number(dbStats.platform_products || 0),
                    customProducts: Number(dbStats.custom_products || 0),
                    activeProducts: Number(dbStats.active_products || 0),
                    totalOrders: Number(dbStats.total_orders || 0),
                    pendingOrders: Number(dbStats.pending_orders || 0),
                    totalRevenue: Number(dbStats.total_revenue || 0),
                });
                setPendingApprovals(Number(dbStats.pending_approvals || 0));
            }

            const { data: countsData, error: countsError } = await supabase.rpc("get_admin_merchant_custom_counts");
            if (countsError) throw countsError;
            if (countsData) {
                const mappedCounts = {};
                countsData.forEach(row => {
                    mappedCounts[row.merchant_id] = Number(row.custom_count || 0);
                });
                setMerchantCounts(mappedCounts);
            }
        } catch (err) {
            console.error("Error refreshing stats/counts:", err);
        }
    };

    // Store active filters/page in a ref for realtime callbacks
    const activeFiltersRef = React.useRef({ page, activeTab, debouncedSearch, categoryFilter, oosOnly, selectedMerchant });
    useEffect(() => {
        activeFiltersRef.current = { page, activeTab, debouncedSearch, categoryFilter, oosOnly, selectedMerchant };
    }, [page, activeTab, debouncedSearch, categoryFilter, oosOnly, selectedMerchant]);

    const refreshCurrentPage = () => {
        const { page, activeTab, debouncedSearch, categoryFilter, oosOnly, selectedMerchant } = activeFiltersRef.current;
        fetchProducts(page, activeTab, debouncedSearch, categoryFilter, oosOnly, selectedMerchant);
    };

    // REALTIME SUBSCRIPTION
    useEffect(() => {
        const productChannel = supabase
            .channel("admin-shopping-products")
            .on("postgres_changes", { event: "*", schema: "public", table: "shopping_products" }, (payload) => {
                refreshStatsAndCounts();
                refreshCurrentPage();
            })
            .subscribe();

        const orderChannel = supabase
            .channel("admin-shopping-orders")
            .on("postgres_changes", { event: "*", schema: "public", table: "shopping_order_groups" }, (payload) => {
                refreshStatsAndCounts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(productChannel);
            supabase.removeChannel(orderChannel);
        };
    }, []);

    // TRIGGER FETCH ON FILTER / PAGE CHANGES
    const isFirstMount = React.useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        fetchProducts(page, activeTab, debouncedSearch, categoryFilter, oosOnly, selectedMerchant);
    }, [activeTab, debouncedSearch, categoryFilter, oosOnly, selectedMerchant, page]);

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

    const newProductLink = activeTab === TAB_CUSTOM && selectedMerchant !== "all" 
        ? `/admin/shopping/new?merchant=${selectedMerchant}` 
        : `/admin/shopping/new`;

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
                        href="/admin/shopping/approvals"
                        className="group flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 sm:pl-5 sm:pr-4 py-3 sm:py-3.5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <ShieldCheck size={16} className={pendingApprovals > 0 ? "text-amber-500" : "text-slate-400"} />
                        <span>Approvals</span>
                        {pendingApprovals > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black animate-pulse">
                                {pendingApprovals}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/admin/shopping/procurement"
                        className="group flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 sm:pl-5 sm:pr-4 py-3 sm:py-3.5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <ArrowDownToLine size={16} className="text-indigo-500" />
                        <span>Procure</span>
                    </Link>
                    <Link
                        href="/admin/shopping/procurement/history"
                        className="group flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 sm:pl-5 sm:pr-4 py-3 sm:py-3.5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <Clock size={16} className="text-indigo-500" />
                        <span>Hist.</span>
                    </Link>
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
                    {activeTab === TAB_PLATFORM && (
                        <Link
                            href="/admin/shopping/new"
                            className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-950 hover:bg-blue-600 text-white px-6 sm:pl-5 sm:pr-4 py-3.5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-2xl shadow-slate-950/10 active:scale-95"
                        >
                            <span>Add Platform Product</span>
                            <div className="bg-white/10 p-1 rounded-xl group-hover:rotate-90 transition-transform">
                                <Plus size={16} />
                            </div>
                        </Link>
                    )}
                    {activeTab === TAB_PLATFORM && (
                        <button
                            onClick={() => setBulkUploadOpen(true)}
                            className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 sm:pr-4 py-3.5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-2xl shadow-emerald-600/20 active:scale-95"
                        >
                            <FileSpreadsheet size={16} />
                            <span>Bulk Upload Platform</span>
                        </button>
                    )}
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
                        onClick={() => { setActiveTab(TAB_PLATFORM); setCategoryFilter("all"); setPage(1); }}
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
                        onClick={() => { setActiveTab(TAB_CUSTOM); setCategoryFilter("all"); setPage(1); }}
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

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 w-full">
                    <div className="relative flex-1 min-w-[200px] w-full">
                        {loading ? (
                            <RefreshCw size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" />
                        ) : (
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        )}
                        <input
                            type="text"
                            placeholder="Find products..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-xs font-bold text-slate-900 dark:placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
                        {activeTab === TAB_CUSTOM && merchants.length > 0 && (
                            <select
                                value={selectedMerchant}
                                onChange={e => { setSelectedMerchant(e.target.value); setPage(1); }}
                                className="shrink-0 w-36 sm:w-48 px-3 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-[10px] font-black text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-violet-500/10 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Merchants</option>
                                {merchants.map(m => <option key={m.id} value={m.id}>{m.business_name}</option>)}
                            </select>
                        )}
                        <select
                            value={categoryFilter}
                            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                            className="shrink-0 w-28 sm:w-32 px-3 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-[10px] font-black text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">Category: All</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button
                            onClick={() => { setOosOnly(!oosOnly); setPage(1); }}
                            className={`shrink-0 flex items-center justify-center gap-1.5 rounded-[1.2rem] px-3 py-3 font-black text-[10px] uppercase tracking-widest transition-all ${
                                oosOnly
                                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                                    : "bg-white border border-slate-200 text-slate-500"
                            }`}
                        >
                            <PackageX size={12} className={oosOnly ? "text-white" : "text-slate-400"} />
                            <span className="hidden sm:inline">{OOS_LABEL} Only</span>
                            <span className="sm:hidden">OOS</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Context Banner */}
            {activeTab === TAB_CUSTOM && selectedMerchant === "all" && (
                <div className="mb-5 p-4 rounded-2xl bg-violet-50 border border-violet-200 flex items-start gap-3">
                    <Store size={16} className="text-violet-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-violet-800">Merchant Custom Products</p>
                        <p className="text-xs text-violet-600 mt-0.5">
                            Select a merchant to view and manage their custom inventory. InTrust earns <strong>5% commission</strong> on each sale.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === TAB_CUSTOM && selectedMerchant !== "all" && (
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                        onClick={() => { setSelectedMerchant("all"); setPage(1); }}
                        className="flex items-center gap-2 px-4 py-2 w-fit bg-white border border-slate-200 rounded-[1rem] text-xs font-black text-slate-700 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <ChevronRight size={14} className="rotate-180" />
                        Back to Merchants
                    </button>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-100 text-[10px] font-black text-violet-600 uppercase tracking-widest hidden md:block">
                            {merchants.find(m => m.id === selectedMerchant)?.business_name || "Merchant"}
                        </div>
                        <Link
                            href={`/admin/shopping/new?merchant=${selectedMerchant}`}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-[1rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-sm shadow-violet-600/20 active:scale-95"
                        >
                            <Plus size={14} />
                            <span className="hidden sm:inline">Add Custom Product</span>
                            <span className="sm:hidden">Add</span>
                        </Link>
                        <button
                            onClick={() => setBulkUploadOpen(true)}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
                        >
                            <FileSpreadsheet size={14} />
                            <span className="hidden sm:inline">Bulk Upload Custom</span>
                            <span className="sm:hidden">Bulk</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {activeTab === TAB_CUSTOM && selectedMerchant === "all" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {merchants.length === 0 ? (
                        <div className="col-span-full py-24 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
                            <Store className="mx-auto text-slate-100 mb-4" size={56} />
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">No Merchants Found</p>
                        </div>
                    ) : (
                        merchants.filter(m => !search || m.business_name.toLowerCase().includes(search.toLowerCase())).map(merchant => {
                            const productCount = merchantCounts[merchant.id] || 0;
                            return (
                                <div
                                    key={merchant.id}
                                    onClick={() => setSelectedMerchant(merchant.id)}
                                    className="group cursor-pointer bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-100 transition-all duration-300 flex flex-col items-center text-center gap-3"
                                >
                                    <div className="w-16 h-16 rounded-[1.2rem] bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-violet-100">
                                        <Store size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 truncate tracking-tight px-2">{merchant.business_name}</h3>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${merchant.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                {merchant.status}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">
                                                {productCount} Items
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {localProducts.length === 0 ? (
                        <div className="col-span-full py-24 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
                            <Package className="mx-auto text-slate-100 mb-4" size={56} />
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Matrix Empty: No Products Found</p>
                        </div>
                    ) : (
                        localProducts.map(product => {
                        const isMerchantProduct = product.merchant_inventory?.some(inv => inv.is_platform_product === false);
                        const categoryName = product.shopping_categories?.name || product.category || "General";
                        const currentStock = stockEdits[product.id] !== undefined ? parseInt(stockEdits[product.id]) || 0 : (product.admin_stock || 0);
                        const lowStock = currentStock < 5;
                        const isOOS = !isMerchantProduct
                            ? currentStock <= 0
                            : product.merchant_inventory?.every(inv => isInventoryRowOOS(inv));

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
                                        {isOOS && <OutOfStockBadge variant="soft" size="sm" />}
                                        {isMerchantProduct && product.approval_status === 'pending_approval' ? (
                                            <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-amber-50 text-amber-600 border-amber-100">
                                                Pending Admin
                                            </span>
                                        ) : isMerchantProduct && product.approval_status === 'rejected' ? (
                                            <div className="group relative">
                                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-red-50 text-red-600 border-red-100 cursor-help">
                                                    Rejected
                                                </span>
                                                <div className="absolute hidden group-hover:block bottom-full left-0 mb-2 w-48 bg-slate-950 text-white text-[10px] p-2 rounded-xl z-20 shadow-xl border border-slate-800">
                                                    {product.rejection_reason || "No reason specified"}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${product.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                                                {product.is_active ? "Active" : "Draft"}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{categoryName}</span>
                                        {isMerchantProduct && (
                                            <span className="text-[8px] font-black text-violet-500 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100 uppercase tracking-wider max-w-[100px] sm:max-w-[150px] truncate">
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
                                        <div className={`${!isMerchantProduct ? 'border-l border-dashed border-slate-200 pl-3' : ''}`}>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">HSN</p>
                                            <p className="font-black text-slate-950 text-sm tracking-tighter">{product.hsn_code || '—'}</p>
                                        </div>
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
            )}

            {/* Pagination Controls — shared component, mobile-safe */}
            {!(activeTab === TAB_CUSTOM && selectedMerchant === "all") && totalCount > pageSize && (
                <div className="mt-8 pb-6">
                    <Pagination
                        page={page}
                        totalPages={Math.ceil(totalCount / pageSize)}
                        onPageChange={(newPage) => setPage(newPage)}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        className="[--border-color:theme(colors.slate.200)] [--text-secondary:theme(colors.slate.500)] [--text-primary:theme(colors.slate.800)]"
                    />
                </div>
            )}

            {/* ── Bulk Upload Slide-Over ──────────────────────────────────── */}
            {bulkUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                        onClick={() => setBulkUploadOpen(false)}
                    />
                    {/* Panel */}
                    <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <FileSpreadsheet size={16} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Admin Panel</p>
                                    <p className="text-sm font-black text-slate-900 leading-none">CSV Bulk Upload</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setBulkUploadOpen(false)}
                                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <BulkProductUpload
                            merchantId={activeTab === TAB_CUSTOM && selectedMerchant !== "all" ? selectedMerchant : null}
                            onSuccess={() => {
                                setBulkUploadOpen(false);
                                router.refresh();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
