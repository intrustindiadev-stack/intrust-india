'use client';

import React, { useState, useEffect } from 'react';
import { History, ChevronLeft, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { RewardSettingCard } from './RewardSettingCard';

export function RewardConfigurationHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchHistory = async (pageNum) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/rewards/history?page=${pageNum}&limit=20`, { cache: 'no-store' });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to fetch history');
            
            setHistory(data.history || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setPage(pageNum);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory(1);
    }, []);

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <RewardSettingCard
            icon={History}
            title="Audit History"
            description="Track changes made to reward configurations over time"
            iconBgClass="bg-slate-50 dark:bg-slate-800"
            iconTextClass="text-slate-600 dark:text-slate-300"
        >
            {loading && history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-slate-400 mb-4" />
                    <p className="text-slate-500 font-medium">Loading audit history...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl text-center border border-red-100 dark:border-red-900/30">
                    <p className="font-bold mb-2">Error loading history</p>
                    <p className="text-sm mb-4">{error}</p>
                    <button onClick={() => fetchHistory(page)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Retry</button>
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    No configuration changes recorded yet.
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map((record) => (
                        <div key={record.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-mono">
                                            {record.config_key}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {record.user_profiles?.full_name || record.user_profiles?.email || 'Unknown Admin'}
                                    </span>
                                    •
                                    <span>{formatDate(record.changed_at)}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 items-stretch bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                <div className="flex-1 overflow-x-auto hide-scrollbar">
                                    <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Previous Value</p>
                                    <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                                        {record.old_value !== null ? JSON.stringify(record.old_value, null, 2) : 'null'}
                                    </pre>
                                </div>
                                <div className="hidden sm:flex items-center text-slate-300 dark:text-slate-600">
                                    <ArrowRight size={20} />
                                </div>
                                <div className="flex-1 overflow-x-auto hide-scrollbar">
                                    <p className="text-xs font-bold text-emerald-500 mb-1 uppercase tracking-wider">New Value</p>
                                    <pre className="text-xs text-slate-900 dark:text-white font-mono font-medium">
                                        {JSON.stringify(record.new_value, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                            <span className="text-sm text-slate-500">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchHistory(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => fetchHistory(page + 1)}
                                    disabled={page === totalPages || loading}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </RewardSettingCard>
    );
}
