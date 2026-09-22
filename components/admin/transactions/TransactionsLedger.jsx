"use client";

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
    Search, Filter, ArrowDownLeft, ArrowUpRight, CheckCircle2, 
    XCircle, Clock, RotateCcw, Download, Copy, Check, X, 
    User, CreditCard, Calendar, ShieldCheck, ChevronRight,
    ArrowUpDown, Info, ExternalLink
} from 'lucide-react';
import { generateOrderInvoice } from '@/lib/invoiceGenerator';
import { displayEmail } from '@/lib/auth';

export default function TransactionsLedger({ 
    transactions = [], 
    totalCount = 0, 
    page = 1, 
    totalPages = 1, 
    search = '', 
    statusFilter = '' 
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedTxn, setSelectedTxn] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [searchInput, setSearchInput] = useState(search);
    const [imgErrors, setImgErrors] = useState({});

    // Copy helper
    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Update query params
    const updateQuery = (updates) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([k, v]) => {
            if (v === null || v === undefined || v === '') {
                params.delete(k);
            } else {
                params.set(k, v);
            }
        });
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        updateQuery({ search: searchInput.trim(), page: 1 });
    };

    const handleClearFilters = () => {
        setSearchInput('');
        router.push(pathname);
    };

    // Invoice generator trigger
    const handleDownloadReceipt = (txn) => {
        generateOrderInvoice({
            order: {
                id: txn.clientTxnId || txn.rawId || 'TXN',
                created_at: txn.dateRaw || new Date().toISOString(),
                customer_name: txn.userName || 'Customer',
                faceValue: 0,
                paidAmount: txn.amount || 0,
                brand: txn.description || 'Transaction',
                giftcard_name: txn.description || 'Transaction',
            },
            items: [],
            seller: {
                name: 'Intrust Financial Services (India) Pvt. Ltd.',
                address: 'TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Nagar, Bhopal, MP 462026',
                phone: '18002030052',
                gstin: '23AAFC14866A1ZV',
            },
            customer: {
                name: txn.userName || 'Customer',
                phone: txn.userPhone || txn.payerMobile || '',
                address: '',
            },
            type: 'giftcard',
        });
    };

    // Status styling helper
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Success':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        Success
                    </span>
                );
            case 'Failed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={12} className="text-rose-600" />
                        Failed
                    </span>
                );
            case 'Refunded':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <RotateCcw size={12} className="text-purple-600" />
                        Refunded
                    </span>
                );
            case 'Pending':
            case 'Processing':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={12} className="text-amber-600" />
                        Pending
                    </span>
                );
        }
    };

    // Avatar initials helper
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Form */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by user, email, TXN ID or category..."
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchInput('');
                                updateQuery({ search: '', page: 1 });
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                            <X size={14} />
                        </button>
                    )}
                </form>

                {/* Filter Controls */}
                <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
                    {/* Status Select Dropdown */}
                    <div className="relative min-w-[140px] flex-1 sm:flex-none">
                        <select
                            value={statusFilter}
                            onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
                            className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                        >
                            <option value="">All Statuses</option>
                            <option value="Success">Success</option>
                            <option value="Pending">Pending</option>
                            <option value="Failed">Failed</option>
                            <option value="Refunded">Refunded</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>

                    {/* Reset Filters */}
                    {(search || statusFilter) && (
                        <button
                            onClick={handleClearFilters}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5"
                        >
                            <RotateCcw size={13} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {transactions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm p-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <CreditCard size={28} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No transactions found</h3>
                    <p className="text-slate-500 font-medium text-sm max-w-sm mx-auto mb-5">
                        {search || statusFilter
                            ? 'No records match your active search and filter criteria.'
                            : 'Transactions will appear here as users and merchants transact on the platform.'}
                    </p>
                    {(search || statusFilter) && (
                        <button
                            onClick={handleClearFilters}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-all"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* ──────────────── DESKTOP VIEW (Modern Data Table) ──────────────── */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-400 uppercase select-none">
                                    <th className="py-3.5 px-4 lg:px-6">Date & Time</th>
                                    <th className="py-3.5 px-4 lg:px-6">User / Payer</th>
                                    <th className="py-3.5 px-4 lg:px-6">Description & Ref</th>
                                    <th className="py-3.5 px-4 lg:px-6">Status</th>
                                    <th className="py-3.5 px-4 lg:px-6 text-right">Amount</th>
                                    <th className="py-3.5 px-4 lg:px-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {transactions.map((txn) => {
                                    const isCredit = txn.type === 'Credit';
                                    const hasImg = txn.userAvatar && !imgErrors[txn.rawId];

                                    return (
                                        <tr
                                            key={txn.rawId}
                                            onClick={() => setSelectedTxn(txn)}
                                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                        >
                                            {/* Date */}
                                            <td className="py-4 px-4 lg:px-6 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800 text-sm">{txn.dateFormatted}</div>
                                                <div className="text-xs text-slate-400 font-medium">{txn.timeFormatted}</div>
                                            </td>

                                            {/* User */}
                                            <td className="py-4 px-4 lg:px-6">
                                                <div className="flex items-center gap-3">
                                                    {hasImg ? (
                                                        <img
                                                            src={txn.userAvatar}
                                                            alt={txn.userName}
                                                            onError={() => setImgErrors(p => ({ ...p, [txn.rawId]: true }))}
                                                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200/80 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                                            {getInitials(txn.userName)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 max-w-[180px] lg:max-w-[220px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                                {txn.userName}
                                                            </p>
                                                            {txn.userRole && (
                                                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                                                    {txn.userRole}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400 truncate font-medium">
                                                            {displayEmail(txn.userEmail || txn.payerEmail) || txn.userPhone || txn.payerMobile || 'No contact info'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Description & Ref */}
                                            <td className="py-4 px-4 lg:px-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                            {txn.description}
                                                        </span>
                                                        {txn.paymentMode && (
                                                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                                {txn.paymentMode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-xs text-slate-400 truncate max-w-[140px]">
                                                            {txn.clientTxnId || txn.rawId}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopy(txn.clientTxnId || txn.rawId, txn.rawId);
                                                            }}
                                                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                                            title="Copy Transaction ID"
                                                        >
                                                            {copiedId === txn.rawId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-4 lg:px-6 whitespace-nowrap">
                                                {getStatusBadge(txn.status)}
                                            </td>

                                            {/* Amount */}
                                            <td className="py-4 px-4 lg:px-6 text-right whitespace-nowrap">
                                                <div className={`text-base font-extrabold ${isCredit && txn.status === 'Success' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                    {isCredit ? `+ ${txn.amountFormatted}` : `- ${txn.amountFormatted}`}
                                                </div>
                                                <div className="text-[11px] font-medium text-slate-400">
                                                    {txn.currency || 'INR'}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-4 lg:px-6 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {txn.status === 'Success' && (
                                                        <button
                                                            onClick={() => handleDownloadReceipt(txn)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                                                            title="Download Invoice / Receipt"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setSelectedTxn(txn)}
                                                        className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ──────────────── MOBILE VIEW (High-Density Flex List) ──────────────── */}
                    <div className="flex flex-col md:hidden divide-y divide-slate-100">
                        {transactions.map((txn) => {
                            const isCredit = txn.type === 'Credit';
                            const hasImg = txn.userAvatar && !imgErrors[txn.rawId];
                            const isSuccess = txn.status === 'Success';
                            const isFailed = txn.status === 'Failed';

                            return (
                                <button
                                    key={txn.rawId}
                                    onClick={() => setSelectedTxn(txn)}
                                    className="w-full text-left p-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-between gap-3 min-h-[52px]"
                                >
                                    {/* Left: Avatar & Identity */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative shrink-0">
                                            {hasImg ? (
                                                <img
                                                    src={txn.userAvatar}
                                                    alt={txn.userName}
                                                    onError={() => setImgErrors(p => ({ ...p, [txn.rawId]: true }))}
                                                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200/80"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                                    {getInitials(txn.userName)}
                                                </div>
                                            )}
                                            {/* Status indicator pip */}
                                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                                isSuccess ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-400'
                                            }`} />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-bold text-sm text-slate-900 truncate">
                                                    {txn.userName}
                                                </p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                                {txn.description} {txn.paymentMode ? `• ${txn.paymentMode}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Amount & Date */}
                                    <div className="text-right shrink-0">
                                        <div className={`text-sm font-extrabold ${isCredit && isSuccess ? 'text-emerald-600' : 'text-slate-800'}`}>
                                            {isCredit ? `+ ${txn.amountFormatted}` : `- ${txn.amountFormatted}`}
                                        </div>
                                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                                            {txn.dateFormatted}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ──────────────── PAGINATION CONTROLS ──────────────── */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:px-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">
                        Showing <span className="font-bold text-slate-900">{transactions.length}</span> of <span className="font-bold text-slate-900">{totalCount}</span> transactions
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                        <button
                            onClick={() => updateQuery({ page: Math.max(1, page - 1) })}
                            disabled={page <= 1}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${
                                page <= 1
                                    ? 'border border-slate-100 text-slate-300 pointer-events-none bg-slate-50'
                                    : 'border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 bg-white shadow-sm'
                            }`}
                        >
                            Previous
                        </button>
                        <span className="px-3 text-sm font-bold text-slate-500 whitespace-nowrap">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => updateQuery({ page: Math.min(totalPages, page + 1) })}
                            disabled={page >= totalPages}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px] flex items-center justify-center ${
                                page >= totalPages
                                    ? 'border border-slate-100 text-slate-300 pointer-events-none bg-slate-50'
                                    : 'border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 bg-white shadow-sm'
                            }`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────────── TRANSACTION DETAILS MODAL / DRAWER ──────────────── */}
            {selectedTxn && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div>
                                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                                    Transaction Details
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Full metadata and ledger records
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedTxn(null)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-sm"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="p-5 overflow-y-auto space-y-6">
                            {/* Amount & Status Hero */}
                            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Total Amount
                                    </p>
                                    <p className="text-2xl sm:text-3xl font-black text-slate-900">
                                        {selectedTxn.amountFormatted}
                                    </p>
                                </div>
                                <div>
                                    {getStatusBadge(selectedTxn.status)}
                                </div>
                            </div>

                            {/* User Information */}
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    User Profile
                                </p>
                                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-100 bg-white shadow-xs">
                                    {selectedTxn.userAvatar && !imgErrors[selectedTxn.rawId] ? (
                                        <img
                                            src={selectedTxn.userAvatar}
                                            alt={selectedTxn.userName}
                                            className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                                            {getInitials(selectedTxn.userName)}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 text-base truncate">
                                                {selectedTxn.userName}
                                            </p>
                                            {selectedTxn.userRole && (
                                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                                                    {selectedTxn.userRole}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {displayEmail(selectedTxn.userEmail || selectedTxn.payerEmail) || 'No email attached'}
                                        </p>
                                        {(selectedTxn.userPhone || selectedTxn.payerMobile) && (
                                            <p className="text-xs text-slate-400 truncate">
                                                Phone: {selectedTxn.userPhone || selectedTxn.payerMobile}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Payment Metadata Grid */}
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Payment Identifiers
                                </p>
                                <div className="grid grid-cols-1 gap-2 text-xs">
                                    {/* Client TXN ID */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-500 font-medium">Client TXN ID</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-slate-800">
                                                {selectedTxn.clientTxnId || selectedTxn.rawId}
                                            </span>
                                            <button
                                                onClick={() => handleCopy(selectedTxn.clientTxnId || selectedTxn.rawId, 'modal-client')}
                                                className="text-slate-400 hover:text-slate-700"
                                            >
                                                {copiedId === 'modal-client' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* SabPaisa TXN ID */}
                                    {selectedTxn.sabpaisaTxnId && (
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-slate-500 font-medium">Gateway TXN ID</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-slate-800">
                                                    {selectedTxn.sabpaisaTxnId}
                                                </span>
                                                <button
                                                    onClick={() => handleCopy(selectedTxn.sabpaisaTxnId, 'modal-gateway')}
                                                    className="text-slate-400 hover:text-slate-700"
                                                >
                                                    {copiedId === 'modal-gateway' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bank TXN ID */}
                                    {selectedTxn.bankTxnId && (
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-slate-500 font-medium">Bank Reference / TXN</span>
                                            <span className="font-mono font-bold text-slate-800">
                                                {selectedTxn.bankTxnId}
                                            </span>
                                        </div>
                                    )}

                                    {/* Payment Mode */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-500 font-medium">Payment Mode</span>
                                        <span className="font-bold text-slate-800">
                                            {selectedTxn.paymentMode || 'Direct Gateway'}
                                        </span>
                                    </div>

                                    {/* Category / Description */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-500 font-medium">Category</span>
                                        <span className="font-bold text-slate-800">
                                            {selectedTxn.description}
                                        </span>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-500 font-medium">Date & Time</span>
                                        <span className="font-medium text-slate-800">
                                            {selectedTxn.dateFormatted} at {selectedTxn.timeFormatted}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3">
                            {selectedTxn.status === 'Success' && (
                                <button
                                    onClick={() => handleDownloadReceipt(selectedTxn)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-sm"
                                >
                                    <Download size={15} /> Download Invoice
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedTxn(null)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
