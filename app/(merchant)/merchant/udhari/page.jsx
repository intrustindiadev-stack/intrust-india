'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Clock,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    X,
    ChevronRight,
    Search,
    Loader2,
    ShoppingBag,
    Send,
    Users,
    ArrowUpRight,
    Calendar,
    RefreshCw,
    SlidersHorizontal,
    Phone,
    HelpCircle,
    Info,
    AlertTriangle,
    Tag,
    UserCheck,
    Coins,
    TrendingUp,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function MerchantUdhariPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // Primary State
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'active' | 'customers' | 'history'
    const [requests, setRequests] = useState([]);
    const [kpis, setKpis] = useState({
        totalOutstandingPaise: 0,
        overdueAmountPaise: 0,
        dueSoonAmountPaise: 0,
        collectedAmountPaise: 0,
        pendingCount: 0,
        awaitingCount: 0,
        overdueCount: 0,
        activeDebtorsCount: 0,
        todayCollectedPaise: 0,
        todayCreditPaise: 0,
    });
    const [customerAccounts, setCustomerAccounts] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'shop_order' | 'gift_card'
    const [riskFilter, setRiskFilter] = useState('all'); // 'all' | 'overdue' | 'due_soon' | 'current'
    const [selectedCustomerFilter, setSelectedCustomerFilter] = useState(null);

    // Action & Modal state
    const [processingId, setProcessingId] = useState(null);
    const [remindingId, setRemindingId] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedApproveRequest, setSelectedApproveRequest] = useState(null);
    const [approveDurationDays, setApproveDurationDays] = useState(15);
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [selectedDenyRequest, setSelectedDenyRequest] = useState(null);
    const [denyNote, setDenyNote] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            fetchUdhariData();
        }
    }, [user, authLoading, router]);

    async function fetchUdhariData() {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const url = new URL('/api/udhari/list', window.location.origin);
            url.searchParams.append('role', 'merchant');

            const res = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load store credit workspace');

            setRequests(data.requests || []);
            if (data.kpis) setKpis(data.kpis);
            if (data.customerAccounts) setCustomerAccounts(data.customerAccounts);
            if (data.settings) setSettings(data.settings);

        } catch (err) {
            console.error('Error fetching udhari:', err);
            const msg = err instanceof Error ? err.message : 'Failed to load store credit requests';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    // Modal Triggers
    const handleOpenApproveModal = (req) => {
        setSelectedApproveRequest(req);
        setApproveDurationDays(req.duration_days || 15);
        setShowApproveModal(true);
    };

    const handleOpenDenyModal = (req) => {
        setSelectedDenyRequest(req);
        setDenyNote('');
        setShowDenyModal(true);
    };

    // Modal Actions
    const handleApproveConfirm = async () => {
        if (!selectedApproveRequest) return;
        const req = selectedApproveRequest;
        setProcessingId(req.id);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/udhari/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    requestId: req.id,
                    action: 'approve',
                    durationDays: approveDurationDays,
                    disclaimerAccepted: true
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to approve request');

            toast.success(data.message || 'Request approved successfully!');
            setShowApproveModal(false);
            setSelectedApproveRequest(null);
            await fetchUdhariData();
        } catch (err) {
            toast.error(err.message || 'Failed to approve request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDenyConfirm = async () => {
        if (!selectedDenyRequest) return;
        const req = selectedDenyRequest;
        setProcessingId(req.id);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/udhari/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    requestId: req.id,
                    action: 'deny',
                    merchantNote: denyNote.trim() || 'Credit request denied by merchant.'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to deny request');

            toast.success('Request denied successfully.');
            setShowDenyModal(false);
            setSelectedDenyRequest(null);
            setDenyNote('');
            await fetchUdhariData();
        } catch (err) {
            toast.error(err.message || 'Failed to deny request');
        } finally {
            setProcessingId(null);
        }
    };

    // On-demand Merchant Reminder
    const handleSendReminder = async (requestId) => {
        setRemindingId(requestId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/udhari/reminders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ requestId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send reminder');

            toast.success('Payment reminder sent to customer via WhatsApp & in-app!');
            
            // Optimistic local update so cooldown triggers immediately
            setRequests(prev => prev.map(r => {
                if (r.id === requestId) {
                    return {
                        ...r,
                        reminder: {
                            lastSentAt: new Date().toISOString(),
                            totalCount: (r.reminder?.totalCount || 0) + 1
                        }
                    };
                }
                return r;
            }));

        } catch (err) {
            toast.error(err.message || 'Failed to send reminder');
        } finally {
            setRemindingId(null);
        }
    };

    // Filtered lists computation
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            // Tab filtering
            if (activeTab === 'pending' && req.status !== 'pending') return false;
            if (activeTab === 'active' && req.status !== 'approved') return false;
            if (activeTab === 'history' && !['completed', 'denied', 'expired', 'cancelled'].includes(req.status)) return false;

            // Source Filter
            if (sourceFilter !== 'all' && req.source_type !== sourceFilter) return false;

            // Risk Filter (Awaiting tab only)
            if (activeTab === 'active' && riskFilter !== 'all') {
                if (riskFilter === 'overdue' && !req.isOverdue) return false;
                if (riskFilter === 'due_soon' && !req.isDueSoon) return false;
                if (riskFilter === 'current' && (req.isOverdue || req.isDueSoon)) return false;
            }

            // Customer Specific Filter
            if (selectedCustomerFilter && req.customer_id !== selectedCustomerFilter) return false;

            // Text search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = req.customer?.full_name?.toLowerCase().includes(q);
                const matchPhone = (req.customer?.phone || '').includes(q);
                const matchOrder = req.shopping_order_group_id?.toLowerCase().includes(q);
                const matchTitle = (req.coupon?.title || req.coupon?.brand || '').toLowerCase().includes(q);
                const matchId = req.id.toLowerCase().includes(q);
                if (!matchName && !matchPhone && !matchOrder && !matchTitle && !matchId) return false;
            }

            return true;
        });
    }, [requests, activeTab, sourceFilter, riskFilter, selectedCustomerFilter, searchQuery]);

    const filteredCustomers = useMemo(() => {
        return customerAccounts.filter(c => {
            if (riskFilter !== 'all') {
                if (riskFilter === 'overdue' && c.riskStatus !== 'overdue') return false;
                if (riskFilter === 'due_soon' && c.riskStatus !== 'due_soon') return false;
                if (riskFilter === 'current' && c.riskStatus !== 'current') return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = c.customerName.toLowerCase().includes(q);
                const matchPhone = (c.phone || '').includes(q);
                if (!matchName && !matchPhone) return false;
            }
            return true;
        });
    }, [customerAccounts, riskFilter, searchQuery]);

    if (authLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                <p className="text-sm font-medium text-slate-500">Loading store credit workspace...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-28 font-outfit text-slate-900 dark:text-slate-100">
            
            {/* 1. Header Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#0e1726] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-[#D4AF37] flex items-center justify-center shrink-0 border border-amber-500/20 shadow-inner">
                        <span className="material-icons-round text-3xl">credit_score</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                Store Credit & Udhari
                            </h1>
                            {settings && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                                    settings.udhari_enabled
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${settings.udhari_enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    {settings.udhari_enabled ? 'Active' : 'Disabled'}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Manage customer credit limits, approve deferred orders, and track receivables.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <button
                        onClick={fetchUdhariData}
                        disabled={loading}
                        aria-label="Refresh Udhari data"
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                        title="Refresh data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin text-[#D4AF37]' : ''} />
                    </button>
                    <Link
                        href="/merchant/settings/udhari"
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-[0.98]"
                    >
                        <SlidersHorizontal size={16} />
                        Credit Rules & Limit
                    </Link>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm flex items-center justify-between font-bold shadow-sm">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={fetchUdhariData}
                        className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs transition-colors flex items-center gap-1.5 font-bold"
                    >
                        <RefreshCw size={14} />
                        Retry
                    </button>
                </div>
            )}

            {/* 2. Executive KPI Dashboard Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Outstanding */}
                <div className="bg-white dark:bg-[#0e1726] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        <span>Total Outstanding</span>
                        <Coins size={16} className="text-[#D4AF37]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        ₹{(kpis.totalOutstandingPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                        <Users size={13} className="text-slate-400" />
                        <span>{kpis.activeDebtorsCount} {kpis.activeDebtorsCount === 1 ? 'customer' : 'customers'} currently owe</span>
                    </div>
                </div>

                {/* Overdue Receivables */}
                <div className={`bg-white dark:bg-[#0e1726] p-5 rounded-3xl border shadow-sm relative overflow-hidden group ${
                    kpis.overdueAmountPaise > 0 
                        ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/20' 
                        : 'border-slate-200/80 dark:border-slate-800'
                }`}>
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        <span className={kpis.overdueAmountPaise > 0 ? 'text-rose-600 dark:text-rose-400' : ''}>Overdue</span>
                        <AlertTriangle size={16} className={kpis.overdueAmountPaise > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black ${kpis.overdueAmountPaise > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        ₹{(kpis.overdueAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            kpis.overdueCount > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                            {kpis.overdueCount} {kpis.overdueCount === 1 ? 'case' : 'cases'} past due
                        </span>
                    </div>
                </div>

                {/* Due Soon */}
                <div className="bg-white dark:bg-[#0e1726] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        <span>Due Next 72 Hours</span>
                        <Clock size={16} className="text-amber-500" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        ₹{(kpis.dueSoonAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">Upcoming collections</span>
                    </div>
                </div>

                {/* Total Collected */}
                <div className="bg-white dark:bg-[#0e1726] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        <span>Total Recovered</span>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        ₹{(kpis.collectedAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                        <TrendingUp size={13} className="text-emerald-500" />
                        <span>₹{(kpis.todayCollectedPaise / 100).toFixed(2)} received today</span>
                    </div>
                </div>
            </div>

            {/* 3. Operational Navigation Tabs & Filter Bar */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    {/* Workspace Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        {[
                            { id: 'pending', label: 'Action Required', count: kpis.pendingCount, alert: kpis.pendingCount > 0 },
                            { id: 'active', label: 'Awaiting Payment', count: kpis.awaitingCount, alert: kpis.overdueCount > 0 },
                            { id: 'customers', label: 'Customer Accounts', count: customerAccounts.length },
                            { id: 'history', label: 'History' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedCustomerFilter(null);
                                }}
                                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-[1.02]'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        activeTab === tab.id
                                            ? 'bg-amber-400 text-slate-950'
                                            : tab.alert
                                                ? 'bg-rose-500 text-white'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Active Customer Filter Pill (if drilled down from accounts) */}
                    {selectedCustomerFilter && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-[#D4AF37] border border-amber-500/20 text-xs font-bold">
                            <span>Filtering by customer</span>
                            <button
                                onClick={() => setSelectedCustomerFilter(null)}
                                className="p-0.5 hover:bg-amber-500/20 rounded-full"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Search & Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Search box */}
                    <div className="sm:col-span-6 md:col-span-7 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={activeTab === 'customers' ? "Search customer name or phone..." : "Search by customer, order #, or title..."}
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 font-medium transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Source Filter */}
                    {activeTab !== 'customers' && (
                        <div className="sm:col-span-3 md:col-span-3">
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-2xl bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                            >
                                <option value="all">All Sources</option>
                                <option value="shop_order">Shop Orders</option>
                                <option value="gift_card">Gift Cards</option>
                            </select>
                        </div>
                    )}

                    {/* Risk Filter (for Awaiting & Customers) */}
                    {(activeTab === 'active' || activeTab === 'customers') && (
                        <div className="sm:col-span-3 md:col-span-2">
                            <select
                                value={riskFilter}
                                onChange={(e) => setRiskFilter(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-2xl bg-white dark:bg-[#0e1726] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                            >
                                <option value="all">All Risk Levels</option>
                                <option value="overdue">🚨 Overdue Only</option>
                                <option value="due_soon">⏰ Due Soon</option>
                                <option value="current">✅ Current / Normal</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Tab Content Views */}
            <div className="space-y-4">
                {loading ? (
                    /* Loading Skeletons */
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-5 bg-white dark:bg-[#0e1726] rounded-3xl border border-slate-200/80 dark:border-slate-800 animate-pulse flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl shrink-0" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                                        <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded" />
                                    </div>
                                </div>
                                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : activeTab === 'customers' ? (
                    /* Tab 3: Customer Debtors Directory */
                    <CustomerAccountsView
                        customers={filteredCustomers}
                        onSelectCustomer={(cid) => {
                            setSelectedCustomerFilter(cid);
                            setActiveTab('active');
                        }}
                    />
                ) : filteredRequests.length === 0 ? (
                    /* Contextual Empty States */
                    <EmptyState activeTab={activeTab} searchQuery={searchQuery} />
                ) : (
                    /* Request Cards (Pending, Awaiting, History) */
                    <div className="space-y-3">
                        <AnimatePresence>
                            {filteredRequests.map(req => (
                                <UdhariRequestCard
                                    key={req.id}
                                    req={req}
                                    activeTab={activeTab}
                                    processingId={processingId}
                                    remindingId={remindingId}
                                    onApprove={handleOpenApproveModal}
                                    onDeny={handleOpenDenyModal}
                                    onSendReminder={handleSendReminder}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Approve Modal with Duration Selection */}
            <AnimatePresence>
                {showApproveModal && selectedApproveRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-white dark:bg-[#0e1726] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
                            
                            <button
                                onClick={() => setShowApproveModal(false)}
                                aria-label="Close approve modal"
                                className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-[#D4AF37] flex items-center justify-center mb-4">
                                    <ShieldCheck size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                    Approve Store Credit
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                    Review repayment duration and credit terms before accepting
                                </p>
                            </div>

                            <div className="space-y-4 mb-6">
                                {/* Credit Overview */}
                                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase text-slate-400">Customer</p>
                                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                                            {selectedApproveRequest.customer?.full_name || 'Guest User'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold uppercase text-slate-400">Principal Due</p>
                                        <p className="font-black text-lg text-[#D4AF37]">
                                            ₹{(selectedApproveRequest.amount_paise / 100).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {/* Repayment Duration Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Repayment Duration (Days)
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[5, 10, 15].map(days => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => setApproveDurationDays(days)}
                                                className={`py-2.5 rounded-xl font-black text-xs transition-all border ${
                                                    approveDurationDays === days
                                                        ? 'bg-amber-500/10 border-[#D4AF37] text-[#D4AF37] shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {days} Days
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Compliance Risk Box */}
                                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                                    <AlertCircle size={16} className="text-[#D4AF37] shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-900 dark:text-amber-300 font-medium leading-relaxed">
                                        Intrust India acts as the ledger record-keeper. You, the merchant, bear the full credit risk of non-payment by the customer.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={handleApproveConfirm}
                                    disabled={processingId === selectedApproveRequest.id}
                                    className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:scale-[1.01] active:scale-[0.98] transition-all text-xs tracking-wider uppercase flex justify-center items-center shadow-lg disabled:opacity-50"
                                >
                                    {processingId === selectedApproveRequest.id ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        `ACCEPT RISK & APPROVE (${approveDurationDays} DAYS)`
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowApproveModal(false)}
                                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Deny Modal with Reason Note */}
            <AnimatePresence>
                {showDenyModal && selectedDenyRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-white dark:bg-[#0e1726] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative"
                        >
                            <button
                                onClick={() => setShowDenyModal(false)}
                                aria-label="Close deny modal"
                                className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                                    <X size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                    Deny Credit Request
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                    Please specify a reason so the customer understands why credit was denied.
                                </p>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {[
                                        "Credit limit reached",
                                        "Pending past dues",
                                        "High risk profile",
                                        "Stock unavailable"
                                    ].map(chip => (
                                        <button
                                            key={chip}
                                            type="button"
                                            onClick={() => setDenyNote(chip)}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={denyNote}
                                    onChange={(e) => setDenyNote(e.target.value)}
                                    placeholder="Enter reason for rejection..."
                                    rows={3}
                                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs focus:ring-2 focus:ring-rose-500/50 outline-none font-medium"
                                />
                            </div>

                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={handleDenyConfirm}
                                    disabled={processingId === selectedDenyRequest.id}
                                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all text-xs tracking-wider uppercase flex justify-center items-center shadow-lg shadow-rose-600/20 disabled:opacity-50"
                                >
                                    {processingId === selectedDenyRequest.id ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        'CONFIRM REJECTION'
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowDenyModal(false)}
                                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    Go Back
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Card Component: Single Udhari Request Card
// ---------------------------------------------------------------------------
function UdhariRequestCard({ req, activeTab, processingId, remindingId, onApprove, onDeny, onSendReminder }) {
    const isShopOrder = req.source_type === 'shop_order';
    const amountRupees = (req.amount_paise / 100).toFixed(2);

    // Days remaining or overdue computation
    const dueDateObj = req.due_date ? new Date(req.due_date) : null;
    const now = new Date();
    const daysDiff = dueDateObj ? Math.ceil((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    // 24h reminder cooldown check
    const lastReminderSentAt = req.reminder?.lastSentAt ? new Date(req.reminder.lastSentAt) : null;
    const reminderCooldownActive = lastReminderSentAt && (now.getTime() - lastReminderSentAt.getTime()) < (24 * 60 * 60 * 1000);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`p-5 rounded-3xl bg-white dark:bg-[#0e1726] border transition-all shadow-sm ${
                req.isOverdue
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/10'
                    : req.isDueSoon
                        ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/10'
                        : 'border-slate-200/80 dark:border-slate-800'
            }`}
        >
            <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
                
                {/* 1. Customer & Trust Profile */}
                <div className="flex items-start gap-3.5 min-w-[280px]">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center font-black text-lg shrink-0 border border-[#D4AF37]/20">
                        {req.customer?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                {req.customer?.full_name || 'Guest User'}
                            </h3>
                            {req.customer?.kyc_status === 'verified' && (
                                <span title="Verified KYC">
                                    <ShieldCheck size={15} className="text-emerald-500" />
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <Phone size={12} />
                            <span>{req.customer?.phone || 'No phone'}</span>
                            {req.isOverdue && (
                                <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded">
                                    Unmasked (Overdue)
                                </span>
                            )}
                        </div>

                        {/* Customer Trust Metrics */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                Age: {req.customerStats?.accountAgeDays || 0}d
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                Paid Orders: {req.customerStats?.purchaseCount || 0}
                            </span>
                            {req.customerStats?.defaultCount > 0 ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    {req.customerStats.defaultCount} Defaults
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                    0 Defaults
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Order / Item Info */}
                <div className="flex-1 space-y-1 lg:border-l lg:border-slate-100 dark:lg:border-slate-800/80 lg:pl-5">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isShopOrder ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                        }`}>
                            {isShopOrder ? 'Shop Product' : 'Gift Card'}
                        </span>
                        <span className="text-xs text-slate-400">
                            Requested {new Date(req.created_at).toLocaleDateString()}
                        </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {isShopOrder ? (
                            req.shopping_order_group?.shopping_order_items?.length > 0 ? (
                                req.shopping_order_group.shopping_order_items.map(i => `${i.quantity}x ${i.shopping_products?.title || 'Product'}`).join(', ')
                            ) : (
                                `Order #${req.shopping_order_group_id?.slice(0, 8).toUpperCase()}`
                            )
                        ) : (
                            req.coupon?.title || req.coupon?.brand || 'Gift Card'
                        )}
                    </div>

                    {req.customer_note && (
                        <p className="text-xs italic text-slate-500 dark:text-slate-400 line-clamp-1">
                            &ldquo;{req.customer_note}&rdquo;
                        </p>
                    )}
                </div>

                {/* 3. Financial Amount & Due Date Status */}
                <div className="text-left lg:text-right min-w-[150px] lg:border-l lg:border-slate-100 dark:lg:border-slate-800/80 lg:pl-5">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Amount Due</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        ₹{amountRupees}
                    </p>

                    {dueDateObj && (
                        <div className="mt-1">
                            {req.isOverdue ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400">
                                    <AlertTriangle size={12} />
                                    Overdue by {Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? 'day' : 'days'}
                                </span>
                            ) : req.isDueSoon ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400">
                                    <Clock size={12} />
                                    Due in {daysDiff} {daysDiff === 1 ? 'day' : 'days'}
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Due: {dueDateObj.toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* 4. Action Queue Controls */}
                <div className="w-full lg:w-48 shrink-0 flex flex-col gap-2 pt-2 lg:pt-0 lg:border-l lg:border-slate-100 dark:lg:border-slate-800/80 lg:pl-5">
                    {activeTab === 'pending' && (
                        <>
                            <button
                                onClick={() => onApprove(req)}
                                disabled={processingId === req.id || req.customerStats?.defaultCount > 0}
                                className="w-full py-2 px-3 bg-[#D4AF37] hover:bg-[#c9a227] text-slate-950 font-black rounded-xl text-xs transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Approve Credit
                            </button>
                            <button
                                onClick={() => onDeny(req)}
                                disabled={processingId === req.id}
                                className="w-full py-2 px-3 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 font-bold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-40"
                            >
                                Deny Request
                            </button>
                            {req.customerStats?.defaultCount > 0 && (
                                <p className="text-[10px] text-rose-500 font-bold text-center">
                                    Disabled: past default history
                                </p>
                            )}
                        </>
                    )}

                    {activeTab === 'active' && (
                        <>
                            <button
                                onClick={() => onSendReminder(req.id)}
                                disabled={remindingId === req.id || reminderCooldownActive}
                                className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    reminderCooldownActive
                                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                                        : req.isOverdue
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
                                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800'
                                }`}
                            >
                                {remindingId === req.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Send size={13} />
                                )}
                                {reminderCooldownActive ? 'Reminded Today' : 'Send Reminder'}
                            </button>
                            {req.reminder?.lastSentAt && (
                                <p className="text-[10px] text-slate-400 text-center font-medium">
                                    Last sent {new Date(req.reminder.lastSentAt).toLocaleDateString()}
                                </p>
                            )}
                        </>
                    )}

                    {activeTab === 'history' && (
                        <div className={`py-2 px-3 rounded-xl text-center text-xs font-black uppercase tracking-wider border ${
                            req.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                                : req.status === 'denied'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                            {req.status}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ---------------------------------------------------------------------------
// Customer Accounts Ledger View
// ---------------------------------------------------------------------------
function CustomerAccountsView({ customers, onSelectCustomer }) {
    if (customers.length === 0) {
        return (
            <div className="bg-white dark:bg-[#0e1726] rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
                <Users size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Customer Debtors</h3>
                <p className="text-xs text-slate-500 mt-1">There are currently no active customer credit records matching this filter.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map(c => (
                <div
                    key={c.customerId}
                    className={`p-5 rounded-3xl bg-white dark:bg-[#0e1726] border transition-all shadow-sm flex flex-col justify-between ${
                        c.riskStatus === 'overdue'
                            ? 'border-rose-300 dark:border-rose-900/60'
                            : c.riskStatus === 'due_soon'
                                ? 'border-amber-300 dark:border-amber-900/60'
                                : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                >
                    <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                        {c.customerName}
                                    </h4>
                                    {c.kycStatus === 'verified' && (
                                        <ShieldCheck size={14} className="text-emerald-500" />
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {c.phoneRevealed || c.phoneMasked || 'No phone'}
                                </p>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                c.riskStatus === 'overdue'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                    : c.riskStatus === 'due_soon'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }`}>
                                {c.riskStatus === 'overdue' ? 'Overdue' : c.riskStatus === 'due_soon' ? 'Due Soon' : 'Current'}
                            </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 space-y-2 mb-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Total Outstanding</span>
                                <span className="font-black text-slate-900 dark:text-white">
                                    ₹{(c.totalOutstandingPaise / 100).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Active Credits</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {c.activeCreditsCount} {c.overdueCreditsCount > 0 && `(${c.overdueCreditsCount} overdue)`}
                                </span>
                            </div>
                            {c.earliestDueDate && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Earliest Due</span>
                                    <span className="font-bold text-[#D4AF37]">
                                        {new Date(c.earliestDueDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => onSelectCustomer(c.customerId)}
                        className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                        <span>View Active Debts</span>
                        <ChevronRight size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Contextual Empty State Component
// ---------------------------------------------------------------------------
function EmptyState({ activeTab, searchQuery }) {
    if (searchQuery) {
        return (
            <div className="p-12 text-center bg-white dark:bg-[#0e1726] rounded-3xl border border-slate-200 dark:border-slate-800">
                <Search size={44} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">No Results Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                    No store credit records matched your search query &ldquo;{searchQuery}&rdquo;.
                </p>
            </div>
        );
    }

    const messages = {
        pending: {
            title: "No Pending Credit Requests",
            sub: "When customers request deferred store credit or shop checkout with credit, they will appear here for review."
        },
        active: {
            title: "No Payments Currently Awaiting",
            sub: "All approved credit requests have either been paid or you have no active credits outstanding."
        },
        history: {
            title: "No Credit History Yet",
            sub: "Past completed, denied, and expired store credit requests will be archived here."
        }
    };

    const current = messages[activeTab] || {
        title: "No Records",
        sub: "You're all caught up for this view."
    };

    return (
        <div className="p-12 text-center bg-white dark:bg-[#0e1726] rounded-3xl border border-slate-200 dark:border-slate-800">
            <Clock size={44} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{current.title}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{current.sub}</p>
        </div>
    );
}
