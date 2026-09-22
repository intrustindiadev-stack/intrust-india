'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
    Wallet, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Filter, 
    Trophy, 
    Gift, 
    Send, 
    Calendar,
    ChevronRight,
    ExternalLink,
    X,
    CheckCircle2,
    Copy,
    FileText,
    Sparkles,
    ShoppingBag
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import GuideInfoButton from '@/components/common/GuideInfoButton';

export default function TransactionsClient({ user, isMerchant, initialTransactions = [] }) {
    const searchParams = useSearchParams();
    const [filterType, setFilterType] = useState('ALL');
    const [selectedTx, setSelectedTx] = useState(null);

    const transactions = useMemo(() => initialTransactions || [], [initialTransactions]);

    // Deep link detection for ?txId=... (deferred to avoid cascading renders)
    useEffect(() => {
        const txId = searchParams.get('txId');
        if (!txId || transactions.length === 0) return;
        const match = transactions.find(t => t.id === txId || t.id.includes(txId));
        if (match) {
            const timer = setTimeout(() => {
                setSelectedTx(match);
                const el = document.getElementById(`tx-${match.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [searchParams, transactions]);

    // Close open modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectedTx(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filtered = useMemo(() => {
        return transactions.filter(tx => {
            const desc = (tx.description || '').toLowerCase();
            const type = (tx.type || tx.transaction_type || '').toUpperCase();
            if (filterType === 'ALL') return true;
            if (filterType === 'CASHBACK') {
                return type.includes('CREDIT') || desc.includes('challenge') || desc.includes('cashback') || desc.includes('streak');
            }
            if (filterType === 'REWARDS') {
                return desc.includes('target') || desc.includes('reward') || desc.includes('milestone');
            }
            if (filterType === 'CAMPAIGN') {
                return desc.includes('campaign') || desc.includes('share') || desc.includes('product');
            }
            if (filterType === 'SPONSORSHIP') {
                return desc.includes('sponsor') || type.includes('SPONSOR');
            }
            return true;
        });
    }, [transactions, filterType]);

    const walletHref = isMerchant ? '/merchant/wallet' : '/wallet';

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn">
            {/* Header with Breadcrumbs, guide & Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                    <MarketingBreadcrumbs
                        customTitle="Marketing Transactions"
                        customSubtitle="Surfaced directly from your authentic InTrust financial wallet ledger."
                        className="flex-1 min-w-0"
                    />
                    <GuideInfoButton pageKey="/marketing/transactions" scope="marketing" className="mt-1 shrink-0" />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0 self-start sm:self-auto max-w-full">
                    {['ALL', 'CASHBACK', 'REWARDS', 'CAMPAIGN', 'SPONSORSHIP'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                filterType === type
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            {type === 'ALL' ? 'All Types' : type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transactions List Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    <span>Transaction Details</span>
                    <span>Amount</span>
                </div>

                {filtered.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filtered.map((tx) => {
                            const isCredit = tx.type === 'CREDIT' || (Number(tx.amount_paise) > 0 && !tx.transaction_type?.includes('debit') && tx.transaction_type !== 'sponsorship_fee');
                            const amount = (Math.abs(Number(tx.amount_paise || 0)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                            const isSelected = selectedTx?.id === tx.id || searchParams.get('txId') === tx.id;
                            const dateStr = new Date(tx.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            return (
                                <button
                                    key={tx.id}
                                    id={`tx-${tx.id}`}
                                    onClick={() => setSelectedTx(tx)}
                                    className={`w-full text-left py-3 px-2 sm:py-3.5 sm:px-3 flex items-center justify-between group rounded-xl sm:rounded-2xl transition-all ${
                                        isSelected 
                                            ? 'bg-blue-50/80 dark:bg-blue-950/50 ring-2 ring-blue-500/80 shadow-2xs' 
                                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-2 sm:pr-4">
                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                                            isCredit 
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {isCredit ? <ArrowDownLeft size={16} className="sm:w-5 sm:h-5" /> : <ArrowUpRight size={16} className="sm:w-5 sm:h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                                {tx.description || (isCredit ? 'Cashback Credit' : 'Payment Debit')}
                                            </h4>
                                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block mt-0.5">
                                                {dateStr}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                        <span className={`text-xs sm:text-sm md:text-base font-black ${
                                            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                                        }`}>
                                            {isCredit ? '+' : '-'} ₹{amount}
                                        </span>
                                        <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-8 sm:py-12 text-center space-y-2.5 sm:space-y-3">
                        <Wallet size={32} className="text-slate-300 dark:text-slate-600 mx-auto" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                            {filterType === 'ALL' ? 'No marketing transactions yet' : `No ${filterType.toLowerCase()} transactions recorded`}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto">
                            Complete daily quiz challenges, unlock target milestones, or share product links to start earning instant wallet credits.
                        </p>
                        <div className="pt-2 flex items-center justify-center gap-2">
                            <Link
                                href="/marketing/daily-challenge"
                                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs"
                            >
                                Play Daily Challenge
                            </Link>
                            <Link
                                href="/marketing/products"
                                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-all"
                            >
                                Share Products
                            </Link>
                        </div>
                    </div>
                )}

                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] sm:text-xs text-slate-500">
                    <span>Click any transaction for verified ledger details.</span>
                    <Link href={walletHref} className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                        <span>Open Complete InTrust Wallet</span>
                        <ExternalLink size={11} />
                    </Link>
                </div>
            </div>

            {/* Transaction Receipt & Detail Modal */}
            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        Transaction Receipt
                                    </h3>
                                    <p className="text-[10px] font-mono text-slate-400">
                                        ID: {selectedTx.id}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Amount Highlight */}
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {selectedTx.type === 'CREDIT' || Number(selectedTx.amount_paise) > 0 ? 'Wallet Credit' : 'Wallet Debit'}
                            </span>
                            <div className={`text-3xl font-black ${
                                selectedTx.type === 'CREDIT' || Number(selectedTx.amount_paise) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                            }`}>
                                {(selectedTx.type === 'CREDIT' || Number(selectedTx.amount_paise) > 0) ? '+' : '-'} ₹{(Math.abs(Number(selectedTx.amount_paise || 0)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-600">
                                <CheckCircle2 size={13} />
                                <span>Verified & Settled in Wallet</span>
                            </div>
                        </div>

                        {/* Metadata Rows */}
                        <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                                <span className="text-slate-400 font-semibold">Description</span>
                                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[200px] truncate">{selectedTx.description}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                                <span className="text-slate-400 font-semibold">Type</span>
                                <span className="font-mono font-bold text-blue-600">{selectedTx.type || selectedTx.transaction_type || 'MARKETING'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                                <span className="text-slate-400 font-semibold">Date & Time</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {new Date(selectedTx.created_at).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2">
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="flex-1 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all"
                            >
                                Close
                            </button>
                            <Link
                                href={walletHref}
                                className="flex-1 py-2.5 rounded-2xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 transition-all text-center shadow-md shadow-blue-500/20"
                            >
                                View in Full Wallet
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
