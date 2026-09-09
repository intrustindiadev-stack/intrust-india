'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import OverviewStats from '@/components/admin/ai-orders/OverviewStats';
import CreateOrderModal from '@/components/admin/ai-orders/CreateOrderModal';
import OrderList from '@/components/admin/ai-orders/OrderList';
import AdminAnalyticsSidebar from '@/components/admin/ai-orders/AdminAnalyticsSidebar';
import { supabase } from '@/lib/supabaseClient';
import { 
    Loader2, 
    Search, 
    Calendar, 
    Download, 
    ChevronDown, 
    List, 
    LayoutGrid, 
    RefreshCw,
    Wallet,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    ArrowUpRight,
    Mail,
    Phone
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIOrdersAdminPage() {
    const [data, setData] = useState({ orders: [], stats: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const [activeTab, setActiveTab] = useState('ALL');
    // Default to grid on mobile (< 768px), table on wider screens
    const [viewMode, setViewMode] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [dateRange, setDateRange] = useState('ALL'); // 'ALL' | 'TODAY' | '7D' | '30D' | 'THIS_MONTH'

    // Pending withdrawals inline section
    const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
    const [withdrawalProcessingId, setWithdrawalProcessingId] = useState(null);
    const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);

    const fetchOrders = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const response = await fetch('/api/admin/ai-orders');
            if (!response.ok) throw new Error('Failed to fetch AI orders');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error loading AI orders:', error);
            if (!silent) toast.error('Failed to load AI orders');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const fetchPendingWithdrawals = useCallback(async () => {
        setWithdrawalsLoading(true);
        try {
            const res = await fetch('/api/admin/ai-orders/withdrawals');
            if (!res.ok) throw new Error('Failed to fetch withdrawals');
            const result = await res.json();
            const pending = (result.withdrawals || []).filter(w => w.status === 'PENDING');
            setPendingWithdrawals(pending);
        } catch (error) {
            console.error('Error loading pending withdrawals:', error);
        } finally {
            setWithdrawalsLoading(false);
        }
    }, []);

    const handleWithdrawalAction = async (id, action) => {
        setWithdrawalProcessingId(id);
        try {
            const res = await fetch(`/api/admin/ai-orders/withdrawals/${id}/${action}`, { method: 'POST' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || `Failed to ${action} withdrawal`);
            toast.success(
                action === 'approve'
                    ? '✅ Withdrawal approved — merchant wallet credited!'
                    : '❌ Withdrawal rejected — funds refunded to vault.'
            );
            fetchPendingWithdrawals();
        } catch (error) {
            toast.error(error.message || `Error: could not ${action} withdrawal`);
        } finally {
            setWithdrawalProcessingId(null);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchPendingWithdrawals();

        // 1. Real-time Supabase postgres_changes listener for live instant updates
        const channel = supabase
            .channel('admin_ai_orders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_orders' }, () => {
                fetchOrders(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_orders_vault_transactions' }, () => {
                fetchPendingWithdrawals();
            })
            .subscribe();

        // 2. Fallback polling every 30 seconds
        const interval = setInterval(() => {
            fetchOrders(true);
            fetchPendingWithdrawals();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [fetchPendingWithdrawals]);

    const handleOrderCreated = () => {
        fetchOrders(true);
    };

    const handleOrderCompleted = () => {
        fetchOrders(true);
    };

    // Dynamic Categories derived directly from real database orders
    const dynamicCategories = useMemo(() => {
        const set = new Set([
            'Electronics', 
            'Computers', 
            'Fashion', 
            'Footwear', 
            'Personal Care', 
            'Wearables', 
            'Audio', 
            'Home & Living'
        ]);
        (data.orders || []).forEach(o => {
            if (o.category) set.add(o.category);
        });
        return Array.from(set);
    }, [data.orders]);

    // Filter orders by active tab, status, category, search query, and date range
    const filteredOrders = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return (data.orders || []).filter(order => {
            // Tab filter
            if (activeTab === 'PENDING' && order.status !== 'PENDING') return false;
            if (activeTab === 'PAYMENT_PENDING' && order.status !== 'PAYMENT_PENDING') return false;
            if (activeTab === 'ACCEPTED' && order.status !== 'ACCEPTED') return false;
            if (activeTab === 'COMPLETED' && order.status !== 'COMPLETED') return false;

            // Status dropdown filter
            if (selectedStatus !== 'ALL' && order.status !== selectedStatus) {
                return false;
            }

            // Category filter
            if (selectedCategory !== 'ALL') {
                if ((order.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
                    return false;
                }
            }

            // Date range filter
            if (dateRange !== 'ALL') {
                const orderTime = new Date(order.created_at).getTime();
                if (dateRange === 'TODAY' && orderTime < todayStart) return false;
                if (dateRange === '7D' && orderTime < sevenDaysAgo) return false;
                if (dateRange === '30D' && orderTime < thirtyDaysAgo) return false;
                if (dateRange === 'THIS_MONTH' && orderTime < monthStart) return false;
            }

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const code = (order.order_code || '').toLowerCase();
                const product = (order.product_name || '').toLowerCase();
                const merchant = (order.merchant?.business_name || '').toLowerCase();
                const contact = (order.merchant?.contact_name || '').toLowerCase();
                if (!code.includes(q) && !product.includes(q) && !merchant.includes(q) && !contact.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [data.orders, activeTab, selectedStatus, selectedCategory, searchQuery, dateRange]);

    // 100% Real Database Stats: Zero fake fallbacks
    const stats = useMemo(() => {
        const orders = data.orders || [];
        const serverStats = data.stats || {};

        return {
            total: serverStats.total ?? orders.length,
            pending: serverStats.pending ?? orders.filter(o => o.status === 'PENDING').length,
            paymentPending: serverStats.paymentPending ?? orders.filter(o => o.status === 'PAYMENT_PENDING').length,
            accepted: serverStats.accepted ?? orders.filter(o => o.status === 'ACCEPTED').length,
            completed: serverStats.completed ?? orders.filter(o => o.status === 'COMPLETED').length
        };
    }, [data]);

    const tabs = [
        { key: 'ALL', label: 'All Orders', count: stats.total },
        { key: 'PENDING', label: 'Pending', count: stats.pending },
        { key: 'PAYMENT_PENDING', label: 'Payment Pending', count: stats.paymentPending },
        { key: 'ACCEPTED', label: 'Accepted', count: stats.accepted },
        { key: 'COMPLETED', label: 'Completed', count: stats.completed },
    ];

    // Real CSV Export of live filtered orders
    const handleExport = () => {
        if (!filteredOrders || filteredOrders.length === 0) {
            toast.error('No orders available to export');
            return;
        }

        try {
            const headers = ['Order Code', 'Product Name', 'Category', 'Merchant Name', 'Business Name', 'Wholesale Price (INR)', 'Retail Price (INR)', 'Profit (INR)', 'Status', 'Created At'];
            
            const rows = filteredOrders.map(order => [
                `"${order.order_code || order.id}"`,
                `"${(order.product_name || '').replace(/"/g, '""')}"`,
                `"${order.category || 'General'}"`,
                `"${(order.merchant?.contact_name || 'Unassigned').replace(/"/g, '""')}"`,
                `"${(order.merchant?.business_name || '—').replace(/"/g, '""')}"`,
                ((order.wholesale_price_paise || 0) / 100).toFixed(2),
                ((order.retail_price_paise || 0) / 100).toFixed(2),
                ((order.profit_margin_paise || 0) / 100).toFixed(2),
                order.status,
                new Date(order.created_at).toISOString()
            ]);

            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `ai_orders_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success(`Exported ${filteredOrders.length} AI orders to CSV!`);
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export CSV');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs text-slate-400 font-medium">Loading AI Orders management dashboard...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1680px] mx-auto">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        AI Orders
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage and distribute high-demand products to merchants in real time.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Manual Refresh */}
                    <button
                        onClick={() => fetchOrders(true)}
                        disabled={isRefreshing}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                        title="Refresh data"
                        aria-label="Refresh orders data"
                    >
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                    </button>

                    {/* Vault Withdrawals Link */}
                    <Link
                        href="/admin/ai-orders/withdrawals"
                        className="relative inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-all active:scale-95"
                        title="View all withdrawals"
                    >
                        <Wallet size={14} className="text-emerald-500" />
                        <span className="hidden xs:inline">Withdrawals</span>
                        {pendingWithdrawals.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black px-1">
                                {pendingWithdrawals.length}
                            </span>
                        )}
                    </Link>

                    {/* CSV Export — icon-only on mobile */}
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-all active:scale-95"
                        title="Export CSV"
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline">Export</span>
                    </button>

                    {/* Feed New AI Order */}
                    <CreateOrderModal onCreated={handleOrderCreated} />
                </div>
            </div>

            {/* 5 KPI Summary Cards (Real Database Numbers) */}
            <OverviewStats stats={stats} />

            {/* ── Permanent Pending Withdrawals Section ──────────────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm overflow-hidden">
                {/* Section Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2.5">
                        <Wallet size={16} className="text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Pending Withdrawals</span>
                        {pendingWithdrawals.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 animate-pulse">
                                {pendingWithdrawals.length} pending
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/admin/ai-orders/withdrawals"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                            View All <ArrowUpRight size={12} />
                        </Link>
                    </div>
                </div>

                {/* Content */}
                    {withdrawalsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-xs font-medium">Loading pending withdrawals...</span>
                        </div>
                    ) : pendingWithdrawals.length === 0 ? (
                        <div className="py-12 text-center space-y-1">
                            <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All clear — no pending withdrawals!</p>
                            <p className="text-xs text-slate-400">Merchant withdrawal requests will appear here for quick action.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {pendingWithdrawals.slice(0, 5).map((req) => (
                                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    {/* Merchant Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                            {req.ai_orders_vault?.merchants?.business_name || 'Merchant Owner'}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                            {req.ai_orders_vault?.merchants?.email && (
                                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                    <Mail size={10} />
                                                    {req.ai_orders_vault.merchants.email}
                                                </span>
                                            )}
                                            {req.ai_orders_vault?.merchants?.phone && req.ai_orders_vault.merchants.phone !== '—' && (
                                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                    <Phone size={10} />
                                                    {req.ai_orders_vault.merchants.phone}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                <Clock size={10} />
                                                {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amount + Destination */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <div className="font-black text-base text-slate-900 dark:text-white">
                                                ₹{((req.amount_paise || 0) / 100).toLocaleString('en-IN')}
                                            </div>
                                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                                                <Wallet size={9} /> → InTrust Wallet
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleWithdrawalAction(req.id, 'reject')}
                                                disabled={withdrawalProcessingId === req.id}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/40 transition-all disabled:opacity-50 active:scale-95"
                                            >
                                                {withdrawalProcessingId === req.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} className="inline mr-0.5" />}
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleWithdrawalAction(req.id, 'approve')}
                                                disabled={withdrawalProcessingId === req.id}
                                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50 active:scale-95"
                                            >
                                                {withdrawalProcessingId === req.id ? (
                                                    <Loader2 size={13} className="animate-spin" />
                                                ) : (
                                                    <CheckCircle2 size={13} />
                                                )}
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            {/* Main Content: 2 Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Left Column: Tabs, Filters, Table/Grid (approx 72%) */}
                <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
                    {/* Tabs + View Switcher — responsive row */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
                        {/* Scrollable Tabs */}
                        <div className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`relative whitespace-nowrap px-2.5 sm:px-4 py-2 text-[11px] sm:text-sm font-bold transition-colors ${
                                            isActive
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {/* Shorten labels on mobile */}
                                        <span className="sm:hidden">
                                            {tab.key === 'PAYMENT_PENDING' ? `Pay (${tab.count})` : `${tab.label.split(' ')[0]} (${tab.count})`}
                                        </span>
                                        <span className="hidden sm:inline">{tab.label} ({tab.count})</span>
                                        {isActive && (
                                            <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* View Switcher — always visible */}
                        <div className="flex shrink-0 items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                                title="Table View"
                                aria-label="Table View"
                            >
                                <List size={15} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                                title="Grid / Card View"
                                aria-label="Grid View"
                            >
                                <LayoutGrid size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Search & Filter Bar — responsive grid */}
                    <div className="flex flex-col gap-2">
                        {/* Search — full width */}
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search product, order ID, merchant..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
                            />
                        </div>

                        {/* Dropdowns — 2-col on mobile, 3-col on sm+ */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {/* Status */}
                            <div className="relative">
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    aria-label="Filter by status"
                                    className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2.5 pl-3 pr-8 rounded-xl cursor-pointer focus:outline-none focus:border-blue-600 shadow-xs"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="PAYMENT_PENDING">Payment Pending</option>
                                    <option value="ACCEPTED">Accepted</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Category */}
                            <div className="relative">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    aria-label="Filter by category"
                                    className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2.5 pl-3 pr-8 rounded-xl cursor-pointer focus:outline-none focus:border-blue-600 shadow-xs"
                                >
                                    <option value="ALL">All Categories</option>
                                    {dynamicCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Date Range — spans full width row on mobile, normal col on sm+ */}
                            <div className="relative col-span-2 sm:col-span-1">
                                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    aria-label="Filter by date range"
                                    className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2.5 pl-8 pr-8 rounded-xl cursor-pointer focus:outline-none focus:border-blue-600 shadow-xs"
                                >
                                    <option value="ALL">All Time</option>
                                    <option value="TODAY">Today</option>
                                    <option value="7D">Last 7 Days</option>
                                    <option value="30D">Last 30 Days</option>
                                    <option value="THIS_MONTH">This Month</option>
                                </select>
                                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Orders List: Table or Grid View */}
                    <OrderList 
                        orders={filteredOrders} 
                        onOrderCompleted={handleOrderCompleted} 
                        activeTab={activeTab}
                        viewMode={viewMode}
                        onCreateOrderClick={() => {
                            const btn = document.getElementById('open-create-order-modal-btn');
                            if (btn) btn.click();
                        }}
                    />
                </div>

                {/* Right Column: Analytics & Live Activity Sidebar (approx 28%) */}
                <div className="xl:col-span-4 2xl:col-span-3">
                    <AdminAnalyticsSidebar 
                        categoryDistribution={data.categoryDistribution} 
                        performanceData={data.performanceData}
                        topMerchants={data.topMerchants}
                        recentActivity={data.recentActivity}
                        totalOrdersCount={stats.total} 
                    />
                </div>
            </div>
        </div>
    );
}
