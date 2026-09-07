'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIOrdersAdminPage() {
    const [data, setData] = useState({ orders: [], stats: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const [activeTab, setActiveTab] = useState('ALL');
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [dateRange, setDateRange] = useState('ALL'); // 'ALL' | 'TODAY' | '7D' | '30D' | 'THIS_MONTH'

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

    useEffect(() => {
        fetchOrders();

        // 1. Real-time Supabase postgres_changes listener for live instant updates
        const channel = supabase
            .channel('admin_ai_orders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_orders' }, () => {
                fetchOrders(true);
            })
            .subscribe();

        // 2. Fallback polling every 30 seconds
        const interval = setInterval(() => fetchOrders(true), 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        AI Orders
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage and distribute high-demand products to merchants in real time.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Manual Refresh Button with Animation */}
                    <button
                        onClick={() => fetchOrders(true)}
                        disabled={isRefreshing}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                        title="Refresh data"
                        aria-label="Refresh orders data"
                    >
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                    </button>

                    {/* Real CSV Export Button */}
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95"
                    >
                        <Download size={15} />
                        <span>Export CSV</span>
                    </button>

                    {/* Feed New AI Order Modal Trigger */}
                    <CreateOrderModal onCreated={handleOrderCreated} />
                </div>
            </div>

            {/* 5 KPI Summary Cards (Real Database Numbers) */}
            <OverviewStats stats={stats} />

            {/* Main Content: 2 Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Left Column: Tabs, Filters, Table/Grid (approx 72%) */}
                <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
                    {/* Tabs and View Switcher */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`relative whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-colors ${
                                            isActive
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <span>{tab.label} ({tab.count})</span>
                                        {isActive && (
                                            <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* View Switchers */}
                        <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
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
                                <List size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                                title="Grid View"
                                aria-label="Grid View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Search & Dynamic Filter Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Search Input */}
                        <div className="sm:col-span-5 relative">
                            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by product, order ID, merchant..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 shadow-xs"
                            />
                        </div>

                        {/* Status Dropdown */}
                        <div className="sm:col-span-2 relative">
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                aria-label="Filter by status"
                                className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl cursor-pointer focus:outline-hidden focus:border-blue-600 shadow-xs"
                            >
                                <option value="ALL">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="PAYMENT_PENDING">Payment Pending</option>
                                <option value="ACCEPTED">Accepted</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Dynamic Category Dropdown */}
                        <div className="sm:col-span-2 relative">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                aria-label="Filter by category"
                                className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl cursor-pointer focus:outline-hidden focus:border-blue-600 shadow-xs"
                            >
                                <option value="ALL">All Categories</option>
                                {dynamicCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Dynamic Date Range Filter */}
                        <div className="sm:col-span-3 relative">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                aria-label="Filter by date range"
                                className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2 pl-8 pr-8 rounded-xl cursor-pointer focus:outline-hidden focus:border-blue-600 shadow-xs"
                            >
                                <option value="ALL">All Time</option>
                                <option value="TODAY">Today</option>
                                <option value="7D">Last 7 Days</option>
                                <option value="30D">Last 30 Days</option>
                                <option value="THIS_MONTH">This Month</option>
                            </select>
                            <Calendar size={13} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
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
