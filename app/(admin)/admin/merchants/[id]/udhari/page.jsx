'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, RefreshCw, Search, Calendar, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AdminMerchantUdhariDetailPage({ params }) {
    const { id: merchantId } = use(params);
    const [merchant, setMerchant] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const fetchMerchantDetails = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/merchants/${merchantId}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setMerchant(data.merchant);
            }
        } catch (err) {
            console.error('Error fetching merchant details:', err);
        }
    };

    const fetchUdhariRequests = async (page = 1, status = activeTab) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch(`/api/admin/merchants/${merchantId}/udhari?page=${page}&limit=20&status=${status}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to fetch requests');

            setRequests(result.requests || []);
            setPagination(result.pagination || { page: 1, limit: 20, total: 0 });
        } catch (error) {
            console.error('Error fetching udhari requests:', error);
            toast.error('Failed to load store credit requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMerchantDetails();
    }, [merchantId]);

    useEffect(() => {
        fetchUdhariRequests(1, activeTab);
    }, [merchantId, activeTab]);

    const formatCurrency = (paise) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(paise / 100);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            pending: 'bg-amber-50 text-amber-600 border-amber-200',
            approved: 'bg-blue-50 text-blue-600 border-blue-200',
            completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            expired: 'bg-slate-100 text-slate-500 border-slate-200',
            cancelled: 'bg-red-50 text-red-600 border-red-200',
        };
        const icons = {
            pending: <Clock size={12} className="mr-1" />,
            approved: <CheckCircle size={12} className="mr-1" />,
            completed: <CheckCircle size={12} className="mr-1" />,
            expired: <XCircle size={12} className="mr-1" />,
            cancelled: <XCircle size={12} className="mr-1" />
        };
        
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${styles[status] || styles.pending} uppercase tracking-tight`}>
                {icons[status]}
                {status}
            </span>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-[family-name:var(--font-outfit)]">
            {/* Header & Back Link */}
            <div className="mb-6">
                <Link href="/admin/merchants/udhari" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4">
                    <ArrowLeft size={16} /> Back to Store Credit Overview
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Store Credit Details
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 font-medium">
                            {merchant?.business_name ? `Viewing requests for ${merchant.business_name}` : 'Loading merchant data...'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Merchant Details Card */}
            {merchant && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-100 shadow-sm">
                            {merchant.business_name?.charAt(0).toUpperCase() || 'M'}
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900">{merchant.business_name}</h2>
                            <div className="text-sm font-bold text-slate-500 flex items-center gap-3 mt-1">
                                <span>{merchant.owner_name}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span>{merchant.phone}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                        <Link href={`/admin/merchants/${merchantId}/udhari-settings`}
                            className="flex items-center gap-2 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-bold text-sm"
                        >
                            <CreditCard size={16} /> Edit Settings
                        </Link>
                    </div>
                </div>
            )}

            {/* Tabbed Interface */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200">
                    <div className="flex overflow-x-auto hide-scrollbar">
                        {['pending', 'approved', 'completed', 'expired', 'cancelled'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 shrink-0 px-6 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                                    activeTab === tab 
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Filter by customer name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-80 pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Search size={16} strokeWidth={2.5} />
                            </div>
                        </div>
                        <button
                            onClick={() => fetchUdhariRequests(pagination.page, activeTab)}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-all font-bold text-sm shadow-sm"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin text-blue-500" : ""} />
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500 font-bold">Loading requests...</p>
                        </div>
                    ) : requests.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="px-4 py-3 text-xs font-extrabold text-slate-500 uppercase">Customer</th>
                                        <th className="px-4 py-3 text-xs font-extrabold text-slate-500 uppercase">Coupon</th>
                                        <th className="px-4 py-3 text-xs font-extrabold text-slate-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-xs font-extrabold text-slate-500 uppercase">Dates</th>
                                        <th className="px-4 py-3 text-xs font-extrabold text-slate-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requests.filter(r => r.customer_name.toLowerCase().includes(searchTerm.toLowerCase())).map((request) => (
                                        <tr key={request.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-900">{request.customer_name}</div>
                                                <div className="text-xs text-slate-500 font-medium">{request.customer_email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-900 max-w-[150px] truncate" title={request.coupon_title}>{request.coupon_title}</div>
                                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{request.coupon_brand}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-extrabold text-slate-900">{formatCurrency(request.amount_paise)}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <span className="text-slate-500"><span className="font-bold text-slate-900">Req:</span> {formatDate(request.requested_at)}</span>
                                                    {request.due_date && <span className="text-amber-600"><span className="font-bold">Due:</span> {formatDate(request.due_date)}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={request.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-900 mb-1">No {activeTab} requests</h3>
                            <p className="text-sm text-slate-500 font-medium">There are currently no store credit requests in this status.</p>
                        </div>
                    )}
                    
                    {/* Pagination */}
                    {!loading && pagination.total > pagination.limit && (
                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="text-sm font-bold text-slate-500">
                                Showing <span className="text-slate-900">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900">{pagination.total}</span> requests
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchUdhariRequests(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => fetchUdhariRequests(pagination.page + 1)}
                                    disabled={pagination.page * pagination.limit >= pagination.total}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
