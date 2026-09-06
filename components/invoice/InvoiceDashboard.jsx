'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, 
    Filter, 
    Eye, 
    FileText, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Calendar, 
    Receipt, 
    DollarSign,
    X,
    Loader2,
    Download,
    BarChart3,
    TrendingUp,
    Send,
    RefreshCw,
    ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function InvoiceDashboard({ basePath = '/admin' }) {
    const router = useRouter();
    const [invoices, setInvoices] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    
    // Tab Mode: 'INVOICES' | 'ANALYTICS'
    const [activeTab, setActiveTab] = useState('INVOICES');
    const [analytics, setAnalytics] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [status, setStatus] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    // F-05: Request sequence ref to prevent out-of-order stale race responses
    const requestSeqRef = useRef(0);

    // F-05 & F-08: 300ms debounce for search input and automatic page reset to 1
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    const fetchInvoices = async () => {
        const currentSeq = ++requestSeqRef.current;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: debouncedSearch,
                status,
                fromDate,
                toDate
            });
            const res = await fetch(`/api/invoices/management?${queryParams.toString()}`);
            const data = await res.json();
            
            // F-05: Discard stale response if a newer request was dispatched
            if (currentSeq !== requestSeqRef.current) {
                return;
            }

            if (res.ok && data.success) {
                setInvoices(data.invoices || []);
                if (data.summary) {
                    setSummary(data.summary);
                }
                setTotalPages(data.pagination?.totalPages || 1);
            } else {
                toast.error(data.error || 'Failed to fetch invoices');
            }
        } catch (error) {
            if (currentSeq === requestSeqRef.current) {
                console.error('Error fetching invoices:', error);
                toast.error('Failed to load invoices');
            }
        } finally {
            if (currentSeq === requestSeqRef.current) {
                setLoading(false);
            }
        }
    };

    const fetchAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const res = await fetch('/api/invoices/management/analytics');
            const data = await res.json();
            if (res.ok && data.success) {
                setAnalytics(data);
            } else {
                toast.error(data.error || 'Failed to load analytics');
            }
        } catch (err) {
            console.error('Analytics fetch error:', err);
            toast.error('Failed to load analytics');
        } finally {
            setLoadingAnalytics(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [page, debouncedSearch, status, fromDate, toDate]);

    useEffect(() => {
        if (activeTab === 'ANALYTICS' && !analytics) {
            fetchAnalytics();
        }
    }, [activeTab]);

    const handleSearch = (e) => {
        e.preventDefault();
        setDebouncedSearch(search);
        setPage(1);
    };

    const clearFilters = () => {
        setSearch('');
        setDebouncedSearch('');
        setStatus('');
        setFromDate('');
        setToDate('');
        setPage(1);
    };

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            const queryParams = new URLSearchParams({
                search: debouncedSearch,
                status,
                fromDate,
                toDate
            });
            const res = await fetch(`/api/invoices/management/export?${queryParams.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to export invoices');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Invoices exported successfully');
        } catch (err) {
            console.error('Export error:', err);
            toast.error(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    const fmt = (valPaise) => ((valPaise || 0) / 100).toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    // F-06: Format date-only strings strictly by parts to avoid timezone shifting
    const formatCalendarDate = (dateStr) => {
        if (!dateStr) return '—';
        const cleanDate = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
            const dayFormatted = String(day).padStart(2, '0');
            const monthFormatted = monthNames[monthIndex] || parts[1];
            return `${dayFormatted} ${monthFormatted} ${year}`;
        }
        return dateStr;
    };

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'PAID':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Paid
                    </span>
                );
            case 'PARTIALLY_PAID':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock size={12} className="text-amber-600" /> Partial
                    </span>
                );
            case 'CANCELLED':
            case 'VOID':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        <AlertCircle size={12} className="text-red-600" /> {status}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <Clock size={12} className="text-blue-600" /> Issued
                    </span>
                );
        }
    };

    const hasActiveFilters = search || status || fromDate || toDate;

    const quickFilters = [
        { label: 'All', value: '' },
        { label: 'Pending', value: 'ISSUED' },
        { label: 'Partial', value: 'PARTIALLY_PAID' },
        { label: 'Paid in Full', value: 'PAID' },
        { label: 'Cancelled', value: 'CANCELLED' }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Invoice Operations</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Track, reconcile, analyze, and manage customer invoice payments.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={handleExportCsv}
                        disabled={exporting}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-all font-bold text-xs sm:text-sm shadow-sm active:scale-95 disabled:opacity-50"
                        title="Download CSV export of currently filtered invoices"
                    >
                        {exporting ? <Loader2 size={16} className="animate-spin text-[#1e3a5f]" /> : <Download size={16} className="text-[#1e3a5f]" />}
                        <span>Export CSV</span>
                    </button>
                    <Link 
                        href={`${basePath}/invoice/create`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#0f2447] text-white rounded-xl transition-all font-bold text-xs sm:text-sm shadow-md shadow-[#1e3a5f]/20 active:scale-95"
                    >
                        <FileText size={16} />
                        Create New Invoice
                    </Link>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 gap-6">
                <button
                    onClick={() => setActiveTab('INVOICES')}
                    className={`pb-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'INVOICES' ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Receipt size={16} />
                    Invoice Registry
                </button>
                <button
                    onClick={() => setActiveTab('ANALYTICS')}
                    className={`pb-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'ANALYTICS' ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <BarChart3 size={16} />
                    Aging & Financial Analytics
                </button>
            </div>

            {/* Tab 1: INVOICE REGISTRY */}
            {activeTab === 'INVOICES' && (
                <>
                    {/* Summary KPI Cards */}
                    {summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoices</span>
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1e3a5f] flex items-center justify-center">
                                        <Receipt size={16} />
                                    </div>
                                </div>
                                <p className="text-2xl font-black text-slate-900 mt-2">{summary.totalInvoices}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">All created invoices in scope</p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Collected</span>
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <CheckCircle2 size={16} />
                                    </div>
                                </div>
                                <p className="text-2xl font-black text-emerald-600 mt-2">₹{fmt(summary.paidAmountPaise)}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{summary.paidCount} fully paid</p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Due</span>
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Clock size={16} />
                                    </div>
                                </div>
                                <p className="text-2xl font-black text-[#1e3a5f] mt-2">₹{fmt(summary.outstandingAmountPaise)}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{summary.outstandingCount} pending settlement</p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled / Void</span>
                                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                                        <AlertCircle size={16} />
                                    </div>
                                </div>
                                <p className="text-2xl font-black text-red-600 mt-2">{summary.cancelledCount}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Invoices marked invalid</p>
                            </div>
                        </div>
                    )}

                    {/* Filter and Table Container */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Filters Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
                            {/* Quick Filter Pills */}
                            <div className="flex flex-wrap items-center gap-2 pb-1">
                                {quickFilters.map(qf => (
                                    <button
                                        key={qf.value}
                                        onClick={() => { setStatus(qf.value); setPage(1); }}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            status === qf.value 
                                                ? 'bg-[#1e3a5f] text-white shadow-sm' 
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {qf.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                                {/* Search Bar */}
                                <form onSubmit={handleSearch} className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                                        <input
                                            type="text"
                                            placeholder="Search by invoice #, customer name, email..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f] outline-none transition-all text-xs sm:text-sm font-medium"
                                        />
                                    </div>
                                </form>

                                {/* Dropdown & Date Filters */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            value={status}
                                            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                                            className="py-2 px-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f] outline-none transition-all text-xs font-semibold text-slate-700"
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="ISSUED">Issued (Pending)</option>
                                            <option value="PARTIALLY_PAID">Partially Paid</option>
                                            <option value="PAID">Paid in Full</option>
                                            <option value="CANCELLED">Cancelled</option>
                                            <option value="VOID">Void</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2 py-1">
                                        <span className="text-[11px] font-bold text-slate-400">From:</span>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                                            className="py-1 px-1.5 bg-transparent outline-none text-xs text-slate-700 font-medium"
                                        />
                                        <span className="text-[11px] font-bold text-slate-400">To:</span>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                                            className="py-1 px-1.5 bg-transparent outline-none text-xs text-slate-700 font-medium"
                                        />
                                    </div>

                                    {hasActiveFilters && (
                                        <button
                                            onClick={clearFilters}
                                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors text-xs flex items-center gap-1 font-semibold"
                                            title="Clear all filters"
                                        >
                                            <X size={14} /> Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Desktop View Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                        <th className="py-3.5 px-4">Invoice #</th>
                                        <th className="py-3.5 px-4">Date</th>
                                        <th className="py-3.5 px-4">Customer</th>
                                        <th className="py-3.5 px-4">Total Amount</th>
                                        <th className="py-3.5 px-4">Paid Amount</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-slate-400">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="animate-spin text-[#1e3a5f]" size={18} />
                                                    <span className="font-semibold text-xs">Loading invoices...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-slate-400">
                                                No invoices found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        invoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                                                    {inv.invoice_number}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                                    {formatCalendarDate(inv.invoice_date)}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-800">{inv.customer_snapshot?.name || 'Customer'}</div>
                                                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{inv.customer_snapshot?.email || '—'}</div>
                                                </td>
                                                <td className="py-3.5 px-4 font-bold text-slate-800">
                                                    ₹{fmt(inv.grand_total_paise)}
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-emerald-600">
                                                    {inv.amount_paid_paise > 0 ? `₹${fmt(inv.amount_paid_paise)}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <StatusBadge status={inv.status} />
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <Link 
                                                        href={`${basePath}/invoice/${inv.id}`}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        <Eye size={13} />
                                                        <span>Workspace</span>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View Card Stack */}
                        <div className="block sm:hidden divide-y divide-slate-100 p-4">
                            {loading ? (
                                <div className="p-8 text-center text-slate-400">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin text-[#1e3a5f]" size={18} />
                                        <span className="font-semibold text-xs">Loading invoices...</span>
                                    </div>
                                </div>
                            ) : invoices.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    No invoices found matching your criteria.
                                </div>
                            ) : (
                                invoices.map((inv) => (
                                    <div key={inv.id} className="pt-3.5 pb-3.5 first:pt-0 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Link href={`${basePath}/invoice/${inv.id}`} className="font-mono font-bold text-xs text-[#1e3a5f]">
                                                    {inv.invoice_number}
                                                </Link>
                                                <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                                                    {inv.customer_snapshot?.name || 'Customer'}
                                                </div>
                                            </div>
                                            <StatusBadge status={inv.status} />
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-[11px] text-slate-400">
                                                {formatCalendarDate(inv.invoice_date)}
                                            </span>
                                            <div className="text-right">
                                                <span className="font-black text-slate-900">₹{fmt(inv.grand_total_paise)}</span>
                                                {inv.amount_paid_paise > 0 && (
                                                    <span className="block text-[10px] text-emerald-600 font-bold">
                                                        Paid: ₹{fmt(inv.amount_paid_paise)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pt-1 flex justify-end">
                                            <Link 
                                                href={`${basePath}/invoice/${inv.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold"
                                            >
                                                <Eye size={12} /> View Workspace
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-medium">
                                    Page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages}</span>
                                </span>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                                        title="Previous page"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                                        title="Next page"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Tab 2: AGING & FINANCIAL ANALYTICS */}
            {activeTab === 'ANALYTICS' && (
                <div className="space-y-6">
                    {loadingAnalytics ? (
                        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
                            <Loader2 className="animate-spin text-[#1e3a5f] mx-auto mb-3" size={24} />
                            <p className="text-sm font-bold text-slate-700">Calculating Accounts Receivable Aging & Financial Analytics...</p>
                            <p className="text-xs text-slate-400 mt-1">Aggregating real-time balances, settlement days, and notification delivery health</p>
                        </div>
                    ) : analytics ? (
                        <>
                            {/* Accounts Receivable Aging Analysis */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Clock size={18} className="text-[#1e3a5f]" />
                                            Accounts Receivable (AR) Aging Analysis
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Delinquency schedule of unpaid customer balances categorized by days past invoice due date.
                                        </p>
                                    </div>
                                    <button
                                        onClick={fetchAnalytics}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                        title="Refresh analytics data"
                                    >
                                        <RefreshCw size={12} /> Refresh
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                                    {/* Current */}
                                    <div className="p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50/40">
                                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Current / Not Due</span>
                                        <p className="text-xl font-black text-emerald-700 mt-2">₹{fmt(analytics.aging?.current?.amount_paise)}</p>
                                        <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 block">{analytics.aging?.current?.count || 0} Invoices</span>
                                    </div>

                                    {/* 1 - 30 Days */}
                                    <div className="p-4 rounded-xl border-2 border-amber-100 bg-amber-50/40">
                                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">1–30 Days Overdue</span>
                                        <p className="text-xl font-black text-amber-700 mt-2">₹{fmt(analytics.aging?.overdue_1_30?.amount_paise)}</p>
                                        <span className="text-[11px] font-semibold text-amber-600 mt-0.5 block">{analytics.aging?.overdue_1_30?.count || 0} Invoices</span>
                                    </div>

                                    {/* 31 - 60 Days */}
                                    <div className="p-4 rounded-xl border-2 border-orange-100 bg-orange-50/40">
                                        <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider block">31–60 Days Overdue</span>
                                        <p className="text-xl font-black text-orange-700 mt-2">₹{fmt(analytics.aging?.overdue_31_60?.amount_paise)}</p>
                                        <span className="text-[11px] font-semibold text-orange-600 mt-0.5 block">{analytics.aging?.overdue_31_60?.count || 0} Invoices</span>
                                    </div>

                                    {/* 61 - 90 Days */}
                                    <div className="p-4 rounded-xl border-2 border-rose-100 bg-rose-50/40">
                                        <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">61–90 Days Overdue</span>
                                        <p className="text-xl font-black text-rose-700 mt-2">₹{fmt(analytics.aging?.overdue_61_90?.amount_paise)}</p>
                                        <span className="text-[11px] font-semibold text-rose-600 mt-0.5 block">{analytics.aging?.overdue_61_90?.count || 0} Invoices</span>
                                    </div>

                                    {/* 90+ Days */}
                                    <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/50">
                                        <span className="text-[11px] font-bold text-red-900 uppercase tracking-wider block">90+ Days (Default Risk)</span>
                                        <p className="text-xl font-black text-red-700 mt-2">₹{fmt(analytics.aging?.overdue_90_plus?.amount_paise)}</p>
                                        <span className="text-[11px] font-semibold text-red-600 mt-0.5 block">{analytics.aging?.overdue_90_plus?.count || 0} Invoices</span>
                                    </div>
                                </div>
                            </div>

                            {/* Collection Velocity & Settlement KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <TrendingUp size={16} className="text-emerald-600" />
                                        Collection Velocity & Efficiency
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block">Collection Rate</span>
                                            <p className="text-2xl font-black text-emerald-600 mt-1">
                                                {analytics.collection?.collection_rate_percent}%
                                            </p>
                                            <span className="text-[11px] text-slate-400 mt-0.5 block">Total collected / invoiced</span>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block">Avg Days to Settle</span>
                                            <p className="text-2xl font-black text-[#1e3a5f] mt-1">
                                                {analytics.collection?.avg_days_to_settle} <span className="text-sm font-semibold text-slate-500">days</span>
                                            </p>
                                            <span className="text-[11px] text-slate-400 mt-0.5 block">DSO proxy on settled deals</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 space-y-2 text-xs text-slate-600">
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span>Total Invoiced (Gross)</span>
                                            <span className="font-bold text-slate-800">₹{fmt(analytics.collection?.total_invoiced_paise)}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span>Total Cash Collected</span>
                                            <span className="font-bold text-emerald-600">₹{fmt(analytics.collection?.total_collected_paise)}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span>Outstanding Balance Due</span>
                                            <span className="font-bold text-[#1e3a5f]">₹{fmt(analytics.collection?.total_outstanding_paise)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Notification Delivery Health */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <ShieldCheck size={16} className="text-blue-600" />
                                        Notification Delivery Reliability
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block">Delivery Success Rate</span>
                                            <p className="text-2xl font-black text-emerald-600 mt-1">
                                                {analytics.notifications?.delivery_rate_percent}%
                                            </p>
                                            <span className="text-[11px] text-slate-400 mt-0.5 block">{analytics.notifications?.sent || 0} Sent Successfully</span>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block">Delivery Failures</span>
                                            <p className={`text-2xl font-black mt-1 ${analytics.notifications?.failed > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                                {analytics.notifications?.failed || 0}
                                            </p>
                                            <span className="text-[11px] text-slate-400 mt-0.5 block">{analytics.notifications?.skipped || 0} Skipped (No contact)</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 space-y-2 text-xs text-slate-600">
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span>Email Deliveries</span>
                                            <span className="font-bold text-slate-800">{analytics.notifications?.by_channel?.EMAIL || 0}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span>WhatsApp Dispatches</span>
                                            <span className="font-bold text-slate-800">{analytics.notifications?.by_channel?.WHATSAPP || 0}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span>Total Notification Dispatches</span>
                                            <span className="font-bold text-slate-800">{analytics.notifications?.total || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center text-slate-400 text-xs">
                            No analytics data available yet.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
