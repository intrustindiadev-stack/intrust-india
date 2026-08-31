'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, History, PenSquare } from 'lucide-react';
import { WALLET_STATUS_COLORS } from '@/types/ai-grow';

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
    const colors = WALLET_STATUS_COLORS[status] || WALLET_STATUS_COLORS.active;
    const labels = { active: 'Active', frozen: 'Frozen', suspended: 'Suspended' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {labels[status] || status}
        </span>
    );
}

const STATUS_FILTERS = ['all', 'active', 'frozen', 'suspended'];

export default function MerchantWalletTable({ wallets = [], onAdjust, onHistory }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortField, setSortField] = useState('balance');
    const [sortDir, setSortDir] = useState('desc');

    const filtered = useMemo(() => {
        return wallets
            .filter(w => {
                const q = search.toLowerCase();
                const matchSearch = !q ||
                    w.merchant?.business_name?.toLowerCase().includes(q) ||
                    w.merchant?.email?.toLowerCase().includes(q) ||
                    w.merchant?.owner_name?.toLowerCase().includes(q) ||
                    w.merchant_id?.toLowerCase().includes(q);
                const matchStatus = statusFilter === 'all' || w.status === statusFilter;
                return matchSearch && matchStatus;
            })
            .sort((a, b) => {
                let valA = sortField === 'balance' ? parseFloat(a.balance || 0) : new Date(a.updated_at);
                let valB = sortField === 'balance' ? parseFloat(b.balance || 0) : new Date(b.updated_at);
                return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
            });
    }, [wallets, search, statusFilter, sortField, sortDir]);

    function toggleSort(field) {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-[#EAEFF4] shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or merchant ID…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={15} className="text-gray-400" />
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {STATUS_FILTERS.map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                                    statusFilter === s
                                        ? 'bg-white text-gray-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-50 bg-gray-50/50">
                            <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Merchant
                            </th>
                            <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => toggleSort('balance')}
                                    className="flex items-center gap-1 hover:text-gray-800 transition-colors"
                                >
                                    Investment Balance
                                    <ArrowUpDown size={12} className={sortField === 'balance' ? 'text-indigo-500' : ''} />
                                </button>
                            </th>
                            <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <button
                                    onClick={() => toggleSort('updated_at')}
                                    className="flex items-center gap-1 hover:text-gray-800 transition-colors"
                                >
                                    Last Updated
                                    <ArrowUpDown size={12} className={sortField === 'updated_at' ? 'text-indigo-500' : ''} />
                                </button>
                            </th>
                            <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                                    {search || statusFilter !== 'all'
                                        ? 'No wallets match your filters.'
                                        : 'No AI Grow wallets found.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map(wallet => (
                                <tr key={wallet.id} className="hover:bg-gray-50/50 transition-colors group">
                                    {/* Merchant Info */}
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {wallet.merchant?.business_name || '—'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {wallet.merchant?.owner_name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {wallet.merchant?.email}
                                            </p>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-4">
                                        <StatusBadge status={wallet.status} />
                                    </td>

                                    {/* Balance */}
                                    <td className="px-4 py-4">
                                        <span className="font-mono tabular-nums text-sm font-semibold text-gray-900">
                                            {formatCurrency(wallet.balance)}
                                        </span>
                                        <span className="ml-1 text-xs text-gray-400">{wallet.currency || 'INR'}</span>
                                    </td>

                                    {/* Last Updated */}
                                    <td className="px-4 py-4 text-sm text-gray-500">
                                        {formatRelativeTime(wallet.updated_at)}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onAdjust(wallet)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow"
                                            >
                                                <PenSquare size={13} />
                                                Adjust
                                            </button>
                                            <button
                                                onClick={() => onHistory(wallet)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                <History size={13} />
                                                History
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer count */}
            {filtered.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50">
                    <p className="text-xs text-gray-400">
                        Showing {filtered.length} of {wallets.length} merchants
                    </p>
                </div>
            )}
        </div>
    );
}
