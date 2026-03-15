'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, Search, Building2, Eye, IndianRupee, CreditCard, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AdminUdhariOverviewPage() {
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'enabled', 'disabled'

    const fetchUdhariData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/merchants/udhari', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to fetch settings');

            setMerchants(result.merchants || []);
        } catch (error) {
            console.error('Error fetching udhari overview:', error);
            toast.error('Failed to load store credit data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUdhariData();
    }, []);

    const filteredMerchants = merchants.filter(m => {
        const matchesSearch = m.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' ? true : filter === 'enabled' ? m.udhari_enabled : !m.udhari_enabled;
        return matchesSearch && matchesFilter;
    });

    const formatCurrency = (paise) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(paise / 100);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-[family-name:var(--font-outfit)]">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Store Credit Overview
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">
                        Monitor Store Credit settings and active requests across all merchants
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search merchant business..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-80 pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Search size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                    <button
                        onClick={fetchUdhariData}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all font-bold text-sm shadow-sm"
                    >
                        <RefreshCw size={18} strokeWidth={2.5} className={loading ? "animate-spin text-blue-500" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar gap-3 mb-8 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {['all', 'enabled', 'disabled'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold capitalize transition-all text-sm shadow-sm ${filter === f
                            ? 'bg-slate-800 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                            }`}
                    >
                        {f}
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold ${filter === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {f === 'all' ? merchants.length : merchants.filter(m => f === 'enabled' ? m.udhari_enabled : !m.udhari_enabled).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center shadow-sm">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-bold">Loading store credit data...</p>
                </div>
            ) : filteredMerchants.length > 0 ? (
                <div className="bg-white border text-center border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col items-center">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50">
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Business Name</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Credit Limit</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Activity</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Revenue</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMerchants.map((merchant) => (
                                    <tr key={merchant.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                                    {merchant.business_name?.charAt(0).toUpperCase() || 'M'}
                                                </div>
                                                <div className="font-bold text-slate-900">{merchant.business_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {merchant.udhari_enabled ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    Enabled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-500 border border-slate-200">
                                                    Disabled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-slate-900">{formatCurrency(merchant.max_credit_limit_paise)}</div>
                                            {merchant.extra_fee_paise > 0 && (
                                                <div className="text-xs text-slate-500 mt-1">+{formatCurrency(merchant.extra_fee_paise)} fee</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="text-center" title="Pending">
                                                    <div className="w-8 py-1 rounded bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">{merchant.pending_count}</div>
                                                </div>
                                                <div className="text-center" title="Approved (Unpaid)">
                                                    <div className="w-8 py-1 rounded bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">{merchant.approved_count}</div>
                                                </div>
                                                <div className="text-center" title="Completed">
                                                    <div className="w-8 py-1 rounded bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">{merchant.completed_count}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                                            {formatCurrency(merchant.total_revenue_paise)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link href={`/admin/merchants/${merchant.id}/udhari`}
                                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm font-bold text-xs"
                                            >
                                                <Eye size={14} /> Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No Store Credit data</h3>
                    <p className="text-slate-500 font-medium pb-2">Cannot find any matching merchants for "{filter}".</p>
                </div>
            )}
        </div>
    );
}
