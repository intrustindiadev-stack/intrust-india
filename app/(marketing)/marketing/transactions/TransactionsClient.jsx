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

const isCreditTx = (tx) => {
    if (!tx) return false;
    if (tx.type === 'DEBIT') return false;
    if (tx.transaction_type === 'sponsorship' || tx.transaction_type === 'sponsorship_fee' || tx.transaction_type?.includes('debit')) return false;
    return tx.type === 'CREDIT' || Number(tx.amount_paise) > 0;
};

export default function TransactionsClient({ user, isMerchant, initialTransactions = [] }) {
    const searchParams = useSearchParams();
    const [filterType, setFilterType] = useState('ALL');
    const [selectedTx, setSelectedTx] = useState(null);

    const transactions = useMemo(() => initialTransactions || [], [initialTransactions]);

    const [copiedTxId, setCopiedTxId] = useState(false);

    const handleCopyTxId = (id) => {
        if (!id) return;
        navigator.clipboard.writeText(id);
        setCopiedTxId(true);
        setTimeout(() => setCopiedTxId(false), 2000);
    };

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
                        customSubtitle="Track all your marketing rewards, cashbacks, and referral earnings in real time."
                        className="flex-1 min-w-0"
                    />
                    <GuideInfoButton pageKey="/marketing/transactions" scope="marketing" className="mt-1 shrink-0" />
                </div>

                {/* Filter Pills with min-h-[44px] */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0 self-start sm:self-auto max-w-full">
                    {['ALL', 'CASHBACK', 'REWARDS', 'CAMPAIGN', 'SPONSORSHIP'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`min-h-[44px] px-4 py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center justify-center cursor-pointer ${
                                filterType === type
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            {type === 'ALL' ? 'All Transactions' : type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transactions List Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wider">
                    <span>Transaction Activity</span>
                    <span>Wallet Credit</span>
                </div>

                {filtered.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filtered.map((tx) => {
                            const isCredit = isCreditTx(tx);
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
                                    className={`w-full min-h-[64px] text-left py-3.5 px-3 sm:py-4 sm:px-4 flex items-center justify-between group rounded-2xl transition-all cursor-pointer ${
                                        isSelected 
                                            ? 'bg-blue-50/80 dark:bg-blue-950/50 ring-2 ring-blue-500/80 shadow-2xs' 
                                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2 sm:pr-4">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                            isCredit 
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                                {tx.description || (isCredit ? 'Cashback Credit' : 'Payment Debit')}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-semibold text-slate-400">
                                                    {dateStr}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">•</span>
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    {tx.type || tx.transaction_type || 'Wallet'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                        <span className={`text-base sm:text-lg md:text-xl font-black tabular-nums ${
                                            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                                        }`}>
                                            {isCredit ? '+' : '-'}₹{amount}
                                        </span>
                                        <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-8 sm:py-12 text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto">
                            <Wallet size={28} />
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                            {filterType === 'ALL' ? 'No marketing transactions yet' : `No ${filterType.toLowerCase()} transactions recorded`}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                            Play today&apos;s quiz challenge, unlock target milestones, or share product links to start earning instant wallet credits.
                        </p>
                        <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap">
                            <Link
                                href="/marketing/daily-challenge"
                                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center"
                            >
                                Play Daily Challenge
                            </Link>
                            <Link
                                href="/marketing/products"
                                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold hover:bg-slate-200 transition-all flex items-center justify-center"
                            >
                                Share Products
                            </Link>
                        </div>
                    </div>
                )}

                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs sm:text-sm text-slate-500">
                    <span>Click any transaction row to view verified receipt details.</span>
                    <Link href={walletHref} className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                        <span>Open Complete InTrust Wallet</span>
                        <ExternalLink size={14} />
                    </Link>
                </div>
            </div>

            {/* Transaction Receipt & Detail Modal */}
            {selectedTx && (
                <div 
                    onClick={() => setSelectedTx(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 cursor-default"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                    <FileText size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                        Transaction Receipt
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <p className="text-xs font-mono font-medium text-slate-400 truncate max-w-[160px]">
                                            ID: {selectedTx.id}
                                        </p>
                                        <button
                                            onClick={() => handleCopyTxId(selectedTx.id)}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                                            title="Copy Transaction ID"
                                        >
                                            {copiedTxId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Amount Highlight */}
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center space-y-1.5">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                {isCreditTx(selectedTx) ? 'Wallet Credit' : 'Wallet Debit'}
                            </span>
                            <div className={`text-3xl sm:text-4xl font-black tabular-nums ${
                                isCreditTx(selectedTx) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                            }`}>
                                {isCreditTx(selectedTx) ? '+' : '-'}₹{(Math.abs(Number(selectedTx.amount_paise || 0)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-600">
                                <CheckCircle2 size={16} />
                                <span>Verified &amp; Settled in Wallet</span>
                            </div>
                        </div>

                        {/* Metadata Rows */}
                        <div className="space-y-3 text-xs sm:text-sm">
                            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                                <span className="text-slate-400 font-semibold">Description</span>
                                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[220px] truncate">{selectedTx.description}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                                <span className="text-slate-400 font-semibold">Type</span>
                                <span className="font-mono font-bold text-blue-600">{selectedTx.type || selectedTx.transaction_type || 'MARKETING'}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                                <span className="text-slate-400 font-semibold">Date &amp; Time</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {new Date(selectedTx.created_at).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="flex-1 min-h-[44px] py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center"
                            >
                                Close
                            </button>
                            <Link
                                href={walletHref}
                                className="flex-1 min-h-[44px] py-2.5 rounded-2xl bg-blue-600 text-white font-black text-xs sm:text-sm hover:bg-blue-700 transition-all text-center shadow-md shadow-blue-500/20 flex items-center justify-center"
                            >
                                Full Wallet
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
