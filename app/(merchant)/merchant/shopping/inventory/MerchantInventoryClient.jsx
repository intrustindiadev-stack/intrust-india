'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Store,
    Plus,
    Sparkles,
    Upload,
    Download,
    MoreHorizontal,
    MoreVertical,
    Search,
    Filter,
    Check,
    X,
    Edit2,
    Copy,
    Trash2,
    ArrowUpRight,
    ArrowRight,
    Package,
    TrendingUp,
    AlertTriangle,
    IndianRupee,
    Layers,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    LayoutList,
    Lock,
    Minus,
    ShoppingBag,
    Eye,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import StoreStatusToggle from '@/components/merchant/StoreStatusToggle';

export default function MerchantInventoryClient({
    initialInventory = [],
    merchant,
    isSubscribed = false,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    totalPages = 1,
    initialSearchQuery = '',
    initialFilterType = 'all',
    initialCategory = 'all',
    initialSortBy = 'newest',
    categories = [],
    initialKpiStats = {},
    tabCounts = {},
}) {
    const router = useRouter();

    // Data state
    const [inventory, setInventory] = useState(initialInventory);
    const [kpiStats, setKpiStats] = useState(initialKpiStats);
    const [counts, setCounts] = useState(tabCounts);

    // Filters & controls state
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
    const [filterType, setFilterType] = useState(initialFilterType || 'all');
    const [categoryFilter, setCategoryFilter] = useState(initialCategory || 'all');
    const [stockFilter, setStockFilter] = useState('all'); // all | in_stock | low_stock | oos
    const [sortBy, setSortBy] = useState(initialSortBy || 'newest');
    const [viewMode, setViewMode] = useState('table'); // table | grid

    // Selection & Bulk actions
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    // Mutations & inline edits
    const [isUpdating, setIsUpdating] = useState(null);
    const [editPrices, setEditPrices] = useState({});
    const [activeMenuId, setActiveMenuId] = useState(null);

    // Destructive Confirmation Modal
    const [deleteModalItem, setDeleteModalItem] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync with incoming server props
    useEffect(() => {
        setInventory(initialInventory);
    }, [initialInventory]);

    useEffect(() => {
        setKpiStats(initialKpiStats);
    }, [initialKpiStats]);

    useEffect(() => {
        setCounts(tabCounts);
    }, [tabCounts]);

    useEffect(() => {
        setSearchQuery(initialSearchQuery || '');
    }, [initialSearchQuery]);

    useEffect(() => {
        setFilterType(initialFilterType || 'all');
    }, [initialFilterType]);

    useEffect(() => {
        setCategoryFilter(initialCategory || 'all');
    }, [initialCategory]);

    useEffect(() => {
        setSortBy(initialSortBy || 'newest');
    }, [initialSortBy]);

    // Close action menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // ── URL Synchronization Helper ─────────────────────────────────────────────
    const updateUrlParams = (updates = {}) => {
        const params = new URLSearchParams(window.location.search);

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '' || value === 'all' || (key === 'page' && value === 1)) {
                params.delete(key);
            } else {
                params.set(key, value.toString());
            }
        });

        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        router.push(newUrl);
    };

    // Debounced search query update to URL
    useEffect(() => {
        const handler = setTimeout(() => {
            const params = new URLSearchParams(window.location.search);
            const currentQ = params.get('q') || '';
            if (searchQuery !== currentQ) {
                updateUrlParams({ q: searchQuery, page: 1 });
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleFilterChange = (type) => {
        setFilterType(type);
        updateUrlParams({ filter: type, page: 1 });
    };

    const handleCategoryChange = (cat) => {
        setCategoryFilter(cat);
        updateUrlParams({ category: cat, page: 1 });
    };

    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        updateUrlParams({ sort: newSort, page: 1 });
    };

    const handlePageChange = (newPage) => {
        updateUrlParams({ page: newPage });
    };

    const handleClearAllFilters = () => {
        setSearchQuery('');
        setFilterType('all');
        setCategoryFilter('all');
        setStockFilter('all');
        setSortBy('newest');
        router.push(window.location.pathname);
    };

    // ── Client-side secondary stock filter (In Stock / Low Stock / OOS) ─────────
    const filteredInventory = useMemo(() => {
        if (stockFilter === 'all') return inventory;
        if (stockFilter === 'in_stock') {
            return inventory.filter(item => (item.stock_quantity || 0) > 5);
        }
        if (stockFilter === 'low_stock') {
            return inventory.filter(item => (item.stock_quantity || 0) > 0 && (item.stock_quantity || 0) <= 5);
        }
        if (stockFilter === 'oos') {
            return inventory.filter(item => (item.stock_quantity || 0) <= 0);
        }
        return inventory;
    }, [inventory, stockFilter]);

    // ── Checkbox Selection ────────────────────────────────────────────────────
    const allOnPageSelected = filteredInventory.length > 0 && filteredInventory.every(item => selectedIds.has(item.id));

    const toggleSelectAll = () => {
        if (allOnPageSelected) {
            setSelectedIds(new Set());
        } else {
            const next = new Set(selectedIds);
            filteredInventory.forEach(item => next.add(item.id));
            setSelectedIds(next);
        }
    };

    const toggleSelectItem = (id, e) => {
        e?.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    // ── Deterministic SKU Helper ──────────────────────────────────────────────
    const getProductSku = (item) => {
        if (item.sku) return item.sku;
        if (item.shopping_products?.sku) return item.shopping_products.sku;
        if (item.shopping_products?.hsn_code) return `HSN-${item.shopping_products.hsn_code}`;
        return `SKU-${item.id.slice(0, 6).toUpperCase()}`;
    };

    // ── Single Product Mutations ──────────────────────────────────────────────
    const handleToggleActive = async (itemId, currentStatus) => {
        setIsUpdating(itemId);
        try {
            const query = supabase
                .from('merchant_inventory')
                .update({ is_active: !currentStatus })
                .eq('id', itemId);

            if (merchant?.id) {
                query.eq('merchant_id', merchant.id);
            }

            const { error } = await query;
            if (error) throw error;

            setInventory(prev =>
                prev.map(item =>
                    item.id === itemId ? { ...item, is_active: !currentStatus } : item
                )
            );

            // Update stats
            setKpiStats(prev => ({
                ...prev,
                liveItems: Math.max(0, (prev.liveItems || 0) + (currentStatus ? -1 : 1)),
            }));
            setCounts(prev => ({
                ...prev,
                live: Math.max(0, (prev.live || 0) + (currentStatus ? -1 : 1)),
                draft: Math.max(0, (prev.draft || 0) + (currentStatus ? 1 : -1)),
            }));

            toast.success(currentStatus ? 'Unpublished from shop' : 'Published to shop!');
        } catch {
            toast.error('Failed to update visibility');
        } finally {
            setIsUpdating(null);
        }
    };

    const handleUpdateStock = async (item, newStock) => {
        if (newStock < 0 || isNaN(newStock)) return;
        if (item.is_platform_product) {
            toast.error('Platform product stock is managed via Wholesale.');
            return;
        }

        try {
            const { data, error } = await supabase.rpc('update_merchant_inventory_stock', {
                p_inventory_id: item.id,
                p_new_stock: newStock,
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            const prevItem = inventory.find(i => i.id === item.id);
            const prevStock = prevItem?.stock_quantity ?? 0;
            const stockDelta = newStock - prevStock;

            setInventory(prev =>
                prev.map(i => i.id === item.id ? { ...i, stock_quantity: newStock } : i)
            );

            // Update KPI totals
            setKpiStats(prev => ({
                ...prev,
                totalStock: Math.max(0, (prev.totalStock || 0) + stockDelta),
                outOfStock: (newStock <= 0 && prevStock > 0)
                    ? (prev.outOfStock || 0) + 1
                    : (newStock > 0 && prevStock <= 0)
                        ? Math.max(0, (prev.outOfStock || 0) - 1)
                        : (prev.outOfStock || 0),
            }));

            toast.success('Stock updated');

            // Low stock notification trigger
            if (newStock <= 5 && prevStock > 5 && merchant?.user_id) {
                const title = item.custom_title || item.shopping_products?.title || 'Product';
                supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'Low Stock Alert',
                    body: `Only ${newStock} units left for ${title}. Restock soon.`,
                    type: 'warning',
                    reference_id: item.id,
                    reference_type: 'merchant_inventory',
                }).catch(notifError => {
                    console.warn('Low stock alert notice skipped:', notifError?.message);
                });
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update stock');
        }
    };

    const handleUpdatePrice = async (itemId, newPriceRupees) => {
        const pricePaise = Math.round(parseFloat(newPriceRupees) * 100);
        if (isNaN(pricePaise) || pricePaise < 0) return;

        try {
            const query = supabase
                .from('merchant_inventory')
                .update({ retail_price_paise: pricePaise })
                .eq('id', itemId);

            if (merchant?.id) {
                query.eq('merchant_id', merchant.id);
            }

            const { error } = await query;
            if (error) throw error;

            setInventory(prev =>
                prev.map(item =>
                    item.id === itemId ? { ...item, retail_price_paise: pricePaise } : item
                )
            );
            setEditPrices(prev => ({ ...prev, [itemId]: undefined }));
            toast.success('Retail price updated');
        } catch {
            toast.error('Failed to update price');
        }
    };

    const handleDeleteProduct = async () => {
        if (!deleteModalItem) return;
        setIsDeleting(true);

        try {
            const query = supabase
                .from('merchant_inventory')
                .delete()
                .eq('id', deleteModalItem.id);

            if (merchant?.id) {
                query.eq('merchant_id', merchant.id);
            }

            const { error } = await query;
            if (error) throw error;

            setInventory(prev => prev.filter(i => i.id !== deleteModalItem.id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(deleteModalItem.id);
                return next;
            });

            // Adjust KPI
            setKpiStats(prev => ({
                ...prev,
                totalProducts: Math.max(0, (prev.totalProducts || 1) - 1),
                liveItems: deleteModalItem.is_active ? Math.max(0, (prev.liveItems || 1) - 1) : prev.liveItems,
                outOfStock: (deleteModalItem.stock_quantity <= 0) ? Math.max(0, (prev.outOfStock || 1) - 1) : prev.outOfStock,
                totalStock: Math.max(0, (prev.totalStock || 0) - (deleteModalItem.stock_quantity || 0)),
            }));

            toast.success('Product removed from catalog');
            setDeleteModalItem(null);
        } catch (err) {
            toast.error(err.message || 'Failed to remove product');
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Bulk Actions ──────────────────────────────────────────────────────────
    const handleBulkPublish = async (makeActive) => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        setBulkLoading(true);
        try {
            const query = supabase
                .from('merchant_inventory')
                .update({ is_active: makeActive })
                .in('id', ids);

            if (merchant?.id) {
                query.eq('merchant_id', merchant.id);
            }

            const { error } = await query;
            if (error) throw error;

            setInventory(prev =>
                prev.map(i => ids.includes(i.id) ? { ...i, is_active: makeActive } : i)
            );
            toast.success(makeActive ? `Published ${ids.length} products live` : `Depublished ${ids.length} products`);
            setSelectedIds(new Set());
            router.refresh();
        } catch {
            toast.error('Failed to update selected products');
        } finally {
            setBulkLoading(false);
        }
    };

    // ── Export Inventory to CSV ───────────────────────────────────────────────
    const handleExportCSV = (onlySelected = false) => {
        const itemsToExport = onlySelected && selectedIds.size > 0
            ? inventory.filter(i => selectedIds.has(i.id))
            : filteredInventory;

        if (itemsToExport.length === 0) {
            toast.error('No products to export');
            return;
        }

        const headers = ['Product Name', 'SKU', 'Category', 'Price (INR)', 'Stock', 'Status', 'Product Type', 'Wholesale Cost (INR)'];
        const rows = itemsToExport.map(item => {
            const product = item.shopping_products;
            const title = `"${(item.custom_title || product?.title || 'Untitled').replace(/"/g, '""')}"`;
            const sku = `"${getProductSku(item)}"`;
            const category = `"${(product?.category || 'General').replace(/"/g, '""')}"`;
            const price = (item.retail_price_paise / 100).toFixed(2);
            const stock = item.stock_quantity;
            const status = item.is_active ? 'Live' : 'Draft';
            const type = item.is_platform_product ? 'Platform' : 'Custom';
            const cost = item.is_platform_product && product?.wholesale_price_paise
                ? (product.wholesale_price_paise / 100).toFixed(2)
                : 'N/A';

            return [title, sku, category, price, stock, status, type, cost].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `intrust_inventory_${merchant?.slug || 'shop'}_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${itemsToExport.length} products to CSV`);
    };

    return (
        <div className="space-y-6 pb-20 sm:pb-8">
            {/* Auto Mode Banner */}
            {merchant?.auto_mode && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0a1f16] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)] flex items-center gap-4"
                >
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                        <Sparkles className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h2 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-0.5">
                            Auto Mode Active
                        </h2>
                        <p className="text-emerald-100/80 text-xs sm:text-sm font-medium">
                            Your shop is running on autopilot. Intrust AI automatically restocks low inventory and updates pricing.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* ── A. PAGE HEADER ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
                        <Store size={12} />
                        <span>Retail Management</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        My <span className="text-blue-600 dark:text-blue-500">Shop</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium max-w-lg leading-relaxed">
                        Manage your live catalog, adjust stock, and set retail prices for custom products.
                    </p>
                </div>

                {/* Right side: Store Status card on its own */}
                <div className="self-start sm:self-auto shrink-0 w-full sm:w-auto">
                    <StoreStatusToggle initialStoreData={merchant} variant="header" />
                </div>
            </div>

            {/* ── B. KPI SUMMARY CARDS (5 Cards) ────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* 1. Total Products */}
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between transition-all hover:border-blue-400/30">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                        <Store size={20} />
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            {kpiStats.totalProducts ?? totalCount}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                            Total Products
                        </div>
                    </div>
                </div>

                {/* 2. Live Items */}
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between transition-all hover:border-emerald-400/30">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            {kpiStats.liveItems ?? 0}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                            Live Items
                        </div>
                    </div>
                </div>

                {/* 3. Out of Stock */}
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between transition-all hover:border-rose-400/30">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            {kpiStats.outOfStock ?? 0}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                            Out of Stock
                        </div>
                    </div>
                </div>

                {/* 4. Total Stock */}
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between transition-all hover:border-amber-400/30">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                        <Layers size={20} />
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            {kpiStats.totalStock ?? 0}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                            Total Stock
                        </div>
                    </div>
                </div>

                {/* 5. Catalog Value (Spans full width on mobile) */}
                <div className="col-span-2 lg:col-span-1 bg-white dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between transition-all hover:border-purple-400/30">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                        <IndianRupee size={20} />
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            ₹{(kpiStats.catalogValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                            Catalog Value
                        </div>
                    </div>
                </div>
            </div>

            {/* ── C. PRIMARY & SECONDARY ACTIONS BAR ────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap flex-1">
                    {/* Primary CTA */}
                    <Link
                        href="/merchant/shopping/inventory/new"
                        className="inline-flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2c5282] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-900/10 shrink-0 flex-1 sm:flex-none"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Add Custom Product</span>
                    </Link>

                    {/* Secondary: Bulk Add */}
                    {isSubscribed ? (
                        <Link
                            href="/merchant/shopping/inventory/bulk"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs shrink-0"
                        >
                            <Sparkles size={14} className="text-amber-500" />
                            <span>Bulk Add</span>
                        </Link>
                    ) : (
                        <span
                            title="Active subscription required for bulk add"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-400 text-xs font-bold cursor-not-allowed shrink-0"
                        >
                            <Sparkles size={14} />
                            <span>Bulk Add</span>
                        </span>
                    )}

                    {/* Secondary: Import CSV */}
                    <Link
                        href="/merchant/shopping/inventory/bulk?tab=csv"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs shrink-0"
                        title="Import products via CSV"
                    >
                        <Upload size={14} className="text-blue-500" />
                        <span>Import CSV</span>
                    </Link>

                    {/* Secondary: Export */}
                    <button
                        onClick={() => handleExportCSV(false)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs shrink-0"
                        title="Export Catalog to CSV"
                    >
                        <Download size={14} className="text-slate-500" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ── D. SEARCH + FILTER TOOLBAR ────────────────────────────────── */}
            <div className="bg-white dark:bg-white/5 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search products, SKU, or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-slate-50/50 dark:bg-white/5 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Selects */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        {/* Category Dropdown */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            aria-label="Filter by category"
                            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer shrink-0"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        {/* Status Dropdown */}
                        <select
                            value={filterType}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            aria-label="Filter by status"
                            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer shrink-0"
                        >
                            <option value="all">All Status</option>
                            <option value="live">Live Only</option>
                            <option value="draft">Draft Only</option>
                            <option value="oos">Out of Stock</option>
                            <option value="low_stock">Low Stock (≤5)</option>
                            <option value="platform">Platform Products</option>
                            <option value="custom">Custom Products</option>
                        </select>

                        {/* Stock Filter Dropdown */}
                        <select
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                            aria-label="Filter by stock status"
                            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer shrink-0"
                        >
                            <option value="all">Stock Status</option>
                            <option value="in_stock">Healthy Stock (&gt;5)</option>
                            <option value="low_stock">Low Stock (1-5)</option>
                            <option value="oos">Out of Stock (0)</option>
                        </select>

                        {(searchQuery || filterType !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all') && (
                            <button
                                onClick={handleClearAllFilters}
                                className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-bold transition-colors shrink-0"
                            >
                                <X size={13} />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── D. STATUS CHIPS & VIEW SWITCH ─────────────────────────── */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-white/5">
                    {/* Status Tabs with counts */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar shrink min-w-0">
                        {[
                            { id: 'all', label: 'All', count: counts.all ?? totalCount },
                            { id: 'live', label: 'Live', count: counts.live ?? kpiStats.liveItems ?? 0 },
                            { id: 'draft', label: 'Draft', count: counts.draft ?? 0 },
                            { id: 'oos', label: 'Out of Stock', count: counts.oos ?? kpiStats.outOfStock ?? 0 },
                            { id: 'low_stock', label: 'Low Stock', count: counts.low_stock ?? 0 },
                            { id: 'platform', label: 'Platform', count: counts.platform ?? 0 },
                            { id: 'custom', label: 'Custom', count: counts.custom ?? 0 },
                        ].map(tab => {
                            const isActive = filterType === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleFilterChange(tab.id)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                                        isActive
                                            ? 'bg-[#1e3a5f] text-white shadow-sm'
                                            : 'bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Sort & View Toggle (Desktop) */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <select
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value)}
                            aria-label="Sort products"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="stock_asc">Stock: Low to High</option>
                            <option value="stock_desc">Stock: High to Low</option>
                        </select>

                        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/80 dark:border-white/10">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === 'table' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                                }`}
                                aria-label="Table View"
                            >
                                <LayoutList size={15} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                                }`}
                                aria-label="Grid View"
                            >
                                <LayoutGrid size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── E. BULK ACTIONS FLOATING TOOLBAR ──────────────────────────── */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 text-white dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 sm:gap-4 max-w-xl w-[92%]"
                    >
                        <span className="text-xs sm:text-sm font-black whitespace-nowrap text-emerald-400">
                            {selectedIds.size} selected
                        </span>

                        <div className="h-4 w-px bg-white/20" />

                        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
                            <button
                                onClick={() => handleBulkPublish(true)}
                                disabled={bulkLoading}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                            >
                                Publish Live
                            </button>
                            <button
                                onClick={() => handleBulkPublish(false)}
                                disabled={bulkLoading}
                                className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all disabled:opacity-50"
                            >
                                Depublish
                            </button>
                            <button
                                onClick={() => handleExportCSV(true)}
                                className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                            >
                                Export CSV
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                title="Clear selection"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── F. PRODUCT LIST (TABLE / CARDS / EMPTY) ────────────────────── */}
            {filteredInventory.length === 0 ? (
                /* Empty States */
                <div className="py-16 sm:py-20 text-center bg-white dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Package size={32} />
                    </div>
                    {searchQuery || filterType !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all' ? (
                        <>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                                No products found matching criteria
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-sm mx-auto font-medium mb-5">
                                {searchQuery ? `No products found matching "${searchQuery}".` : 'No products found matching the selected filter.'}
                            </p>
                            <button
                                onClick={handleClearAllFilters}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs transition-all"
                            >
                                <X size={14} />
                                Clear Filter
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                                Your catalog is empty
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-sm mx-auto font-medium mb-6">
                                Add your first custom product to get started or browse wholesale products to stock your shop.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    href="/merchant/shopping/inventory/new"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2c5282] text-white font-bold text-xs transition-all shadow-md"
                                >
                                    <Plus size={15} />
                                    Add Custom Product
                                </Link>
                                <Link
                                    href="/merchant/shopping/wholesale"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs transition-all"
                                >
                                    <ShoppingBag size={15} />
                                    Browse Wholesale
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            ) : viewMode === 'table' ? (
                /* Desktop Responsive Table View */
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    <th scope="col" className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allOnPageSelected}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            aria-label="Select all products on page"
                                        />
                                    </th>
                                    <th scope="col" className="py-3.5 px-4 font-bold">Product</th>
                                    <th scope="col" className="py-3.5 px-4 font-bold">SKU</th>
                                    <th scope="col" className="py-3.5 px-4 font-bold">Category</th>
                                    <th scope="col" className="py-3.5 px-4 font-bold">Price</th>
                                    <th scope="col" className="py-3.5 px-4 font-bold">Stock</th>
                                    <th scope="col" className="py-3.5 px-4 font-bold">Status</th>
                                    <th scope="col" className="py-3.5 px-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                                {filteredInventory.map(item => {
                                    const product = item.shopping_products;
                                    const isPlatform = item.is_platform_product;
                                    const title = item.custom_title || product?.title || 'Untitled';
                                    const description = item.custom_description || product?.description || '';
                                    const sku = getProductSku(item);
                                    const category = product?.category || 'General';
                                    const retailPaise = item.retail_price_paise;
                                    const suggestedPaise = product?.suggested_retail_price_paise;
                                    const displayPrice = isPlatform && suggestedPaise ? (suggestedPaise / 100) : (retailPaise / 100);
                                    const isSelected = selectedIds.has(item.id);
                                    const isUpdatingThis = isUpdating === item.id;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`group transition-colors ${
                                                isSelected
                                                    ? 'bg-blue-50/40 dark:bg-blue-900/10'
                                                    : 'hover:bg-slate-50/60 dark:hover:bg-white/[0.02]'
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => toggleSelectItem(item.id, e)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    aria-label={`Select ${title}`}
                                                />
                                            </td>

                                            {/* Product */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/10 overflow-hidden shrink-0 border border-slate-200/60 dark:border-white/10 flex items-center justify-center">
                                                        {product?.product_images?.[0] ? (
                                                            <img
                                                                src={product.product_images[0]}
                                                                alt={title}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <Store size={20} className="text-slate-300 dark:text-slate-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 max-w-xs lg:max-w-sm">
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate group-hover:text-blue-600 transition-colors">
                                                            {title}
                                                        </h4>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate font-medium mt-0.5">
                                                            {description || (isPlatform ? 'Wholesale sourced item' : 'Custom merchant product')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* SKU */}
                                            <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                {sku}
                                            </td>

                                            {/* Category */}
                                            <td className="py-3.5 px-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                                    {category}
                                                </span>
                                            </td>

                                            {/* Price */}
                                            <td className="py-3.5 px-4">
                                                {isPlatform ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-bold text-slate-900 dark:text-slate-100">
                                                            ₹{displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </span>
                                                        <span title="Retail price is locked for platform products">
                                                            <Lock size={12} className="text-slate-400" />
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 group/edit">
                                                        <span className="font-bold text-slate-900 dark:text-slate-100">₹</span>
                                                        <input
                                                            type="number"
                                                            aria-label={`Price for ${title}`}
                                                            value={editPrices[item.id] !== undefined ? editPrices[item.id] : (retailPaise / 100)}
                                                            onChange={(e) => setEditPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            onBlur={(e) => handleUpdatePrice(item.id, e.target.value)}
                                                            className="w-20 font-bold text-slate-900 dark:text-slate-100 bg-transparent outline-none focus:border-b-2 focus:border-blue-500 [appearance:textfield] transition-colors"
                                                        />
                                                    </div>
                                                )}
                                            </td>

                                            {/* Stock */}
                                            <td className="py-3.5 px-4">
                                                {isPlatform ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${
                                                            item.stock_quantity <= 0
                                                                ? 'text-rose-600 dark:text-rose-400'
                                                                : item.stock_quantity <= 5
                                                                    ? 'text-amber-600 dark:text-amber-400'
                                                                    : 'text-emerald-600 dark:text-emerald-400'
                                                        }`}>
                                                            {item.stock_quantity}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => handleUpdateStock(item, Math.max(0, item.stock_quantity - 1))}
                                                            aria-label={`Decrease stock for ${title}`}
                                                            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className={`font-bold min-w-6 text-center ${
                                                            item.stock_quantity <= 0
                                                                ? 'text-rose-600 dark:text-rose-400'
                                                                : item.stock_quantity <= 5
                                                                    ? 'text-amber-600 dark:text-amber-400'
                                                                    : 'text-emerald-600 dark:text-emerald-400'
                                                        }`}>
                                                            {item.stock_quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => handleUpdateStock(item, item.stock_quantity + 1)}
                                                            aria-label={`Increase stock for ${title}`}
                                                            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3.5 px-4">
                                                {item.stock_quantity <= 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20 text-xs font-bold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                        Out of Stock
                                                    </span>
                                                ) : item.stock_quantity <= 5 ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 text-xs font-bold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        Low Stock
                                                    </span>
                                                ) : item.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 text-xs font-bold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                                        Live
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 text-xs font-bold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        Draft
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 relative">
                                                    {/* Edit button (for custom products) */}
                                                    {!isPlatform && (
                                                        <Link
                                                            href={`/merchant/shopping/inventory/edit/${item.product_id}`}
                                                            aria-label={`Edit ${title}`}
                                                            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                                                            title="Edit Product"
                                                        >
                                                            <Edit2 size={14} />
                                                        </Link>
                                                    )}

                                                    {/* Restock Wholesale button (for platform products) */}
                                                    {isPlatform && (
                                                        <Link
                                                            href="/merchant/shopping/wholesale"
                                                            aria-label="Restock via Wholesale"
                                                            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                                                            title="Restock via Wholesale"
                                                        >
                                                            <ShoppingBag size={14} />
                                                        </Link>
                                                    )}

                                                    {/* More Context Menu */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                                            }}
                                                            aria-label={`More actions for ${title}`}
                                                            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                                                        >
                                                            <MoreHorizontal size={14} />
                                                        </button>

                                                        {activeMenuId === item.id && (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1 z-30 text-left"
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        handleToggleActive(item.id, item.is_active);
                                                                        setActiveMenuId(null);
                                                                    }}
                                                                    disabled={isUpdatingThis}
                                                                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                                                                >
                                                                    {item.is_active ? 'Depublish Item' : 'Publish Live'}
                                                                </button>

                                                                {item.is_active && merchant?.slug && (
                                                                    <Link
                                                                        href={`/shop/${merchant.slug}`}
                                                                        target="_blank"
                                                                        className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                                                                    >
                                                                        <span>View on Store</span>
                                                                        <ArrowUpRight size={13} className="text-slate-400" />
                                                                    </Link>
                                                                )}

                                                                <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />

                                                                <button
                                                                    onClick={() => {
                                                                        setDeleteModalItem(item);
                                                                        setActiveMenuId(null);
                                                                    }}
                                                                    className="w-full px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2"
                                                                >
                                                                    <Trash2 size={13} />
                                                                    <span>Remove from Shop</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Row List View (< 768px) */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                        {filteredInventory.map(item => {
                            const product = item.shopping_products;
                            const isPlatform = item.is_platform_product;
                            const title = item.custom_title || product?.title || 'Untitled';
                            const sku = getProductSku(item);
                            const category = product?.category || 'General';
                            const retailPaise = item.retail_price_paise;
                            const suggestedPaise = product?.suggested_retail_price_paise;
                            const displayPrice = isPlatform && suggestedPaise ? (suggestedPaise / 100) : (retailPaise / 100);

                            return (
                                <div key={item.id} className="p-4 flex items-start gap-3.5">
                                    {/* Thumbnail */}
                                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-white/10 overflow-hidden shrink-0 border border-slate-200/60 dark:border-white/10 flex items-center justify-center">
                                        {product?.product_images?.[0] ? (
                                            <img
                                                src={product.product_images[0]}
                                                alt={title}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <Store size={22} className="text-slate-300 dark:text-slate-600" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                                {title}
                                            </h4>

                                            {/* Mobile Context Menu Button */}
                                            <div className="relative shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                                    }}
                                                    aria-label={`Actions for ${title}`}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {activeMenuId === item.id && (
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1 z-30 text-left"
                                                    >
                                                        {!isPlatform && (
                                                            <Link
                                                                href={`/merchant/shopping/inventory/edit/${item.product_id}`}
                                                                className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                                                            >
                                                                <Edit2 size={13} />
                                                                <span>Edit Details</span>
                                                            </Link>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                handleToggleActive(item.id, item.is_active);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                                                        >
                                                            {item.is_active ? 'Depublish' : 'Publish Live'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDeleteModalItem(item);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={13} />
                                                            <span>Remove</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                                            {sku} · {category}
                                        </p>

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                            <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                                                ₹{displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>

                                            <div className="flex items-center gap-2">
                                                {item.stock_quantity <= 0 ? (
                                                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                        Out of Stock
                                                    </span>
                                                ) : item.is_active ? (
                                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Live
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        Draft
                                                    </span>
                                                )}

                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                    Stock: {item.stock_quantity}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Grid View (When toggled) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInventory.map(item => {
                        const product = item.shopping_products;
                        const isPlatform = item.is_platform_product;
                        const title = item.custom_title || product?.title || 'Untitled';
                        const sku = getProductSku(item);
                        const category = product?.category || 'General';
                        const retailPaise = item.retail_price_paise;
                        const suggestedPaise = product?.suggested_retail_price_paise;
                        const displayPrice = isPlatform && suggestedPaise ? (suggestedPaise / 100) : (retailPaise / 100);

                        return (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-sm flex flex-col justify-between"
                            >
                                <div>
                                    <div className="relative aspect-video rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden mb-3 flex items-center justify-center">
                                        {product?.product_images?.[0] ? (
                                            <img
                                                src={product.product_images[0]}
                                                alt={title}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <Store size={32} className="text-slate-300 dark:text-slate-600" />
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-xs">
                                                {category}
                                            </span>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate mb-0.5">
                                        {title}
                                    </h4>
                                    <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mb-3">
                                        {sku}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Price</div>
                                        <div className="text-base font-black text-slate-900 dark:text-slate-100">
                                            ₹{displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Stock</div>
                                        <div className={`text-sm font-bold ${
                                            item.stock_quantity <= 0 ? 'text-rose-600' : 'text-emerald-600'
                                        }`}>
                                            {item.stock_quantity}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── G. PAGINATION CONTROLS ────────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Showing <span className="font-bold text-slate-800 dark:text-slate-200">{(page - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount}</span> products
                    </p>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                            disabled={page <= 1}
                            aria-label="Previous page"
                            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {[...Array(totalPages)].map((_, i) => {
                            const p = i + 1;
                            // Show first page, last page, and surrounding pages
                            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                                return (
                                    <button
                                        key={p}
                                        onClick={() => handlePageChange(p)}
                                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                                            page === p
                                                ? 'bg-[#1e3a5f] text-white shadow-sm'
                                                : 'border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                );
                            }
                            if (p === page - 2 || p === page + 2) {
                                return <span key={p} className="px-1 text-slate-400 text-xs">...</span>;
                            }
                            return null;
                        })}

                        <button
                            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                            aria-label="Next page"
                            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── H. DESTRUCTIVE REMOVE CONFIRMATION MODAL ─────────────────── */}
            <AnimatePresence>
                {deleteModalItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                <AlertTriangle size={24} />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    Remove Product from Catalog?
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
                                    Are you sure you want to remove <strong className="text-slate-900 dark:text-white">&ldquo;{deleteModalItem.custom_title || deleteModalItem.shopping_products?.title}&rdquo;</strong>? This product will no longer appear on your live storefront.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    onClick={() => setDeleteModalItem(null)}
                                    disabled={isDeleting}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteProduct}
                                    disabled={isDeleting}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
                                >
                                    {isDeleting && <Loader2 size={13} className="animate-spin" />}
                                    <span>Remove Product</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
