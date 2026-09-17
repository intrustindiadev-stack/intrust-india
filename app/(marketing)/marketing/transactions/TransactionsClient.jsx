'use client';

import { useState, useEffect } from 'react';
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
    FileText
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';

export default function TransactionsClient({ user, isMerchant, initialTransactions }) {
    const searchParams = useSearchParams();
    const [filterType, setFilterType] = useState('ALL');
    const [selectedTx, setSelectedTx] = useState(null);

    const transactions = initialTransactions?.length > 0 ? initialTransactions : [
        { id: 'tx1', type: 'CREDIT', amount_paise: 2500, description: 'Daily Challenge Completed Challenge', created_at: new Date(Date.now() - 3600000).toISOString(), category: 'CHALLENGE' },
        { id: 'tx2', type: 'CREDIT', amount_paise: 50000, description: 'Target Reward 25 Customers Target', created_at: new Date(Date.now() - 86400000).toISOString(), category: 'TARGET' },
        { id: 'tx3', type: 'CREDIT', amount_paise: 10000, description: 'Product Share Cashback Organic Atta', created_at: new Date(Date.now() - 172800000).toISOString(), category: 'CAMPAIGN' },
        { id: 'tx4', type: 'CREDIT', amount_paise: 20000, description: 'Challenge Reward Monsoon Wellness', created_at: new Date(Date.now() - 259200000).toISOString(), category: 'CHALLENGE' },
        { id: 'tx5', type: 'DEBIT', amount_paise: 99900, description: 'Daily Challenge Sponsorship Booking', created_at: new Date(Date.now() - 345600000).toISOString(), category: 'SPONSORSHIP' }
    ];

    // Deep link detection for ?txId=...
    useEffect(() => {
        const txId = searchParams.get('txId');
        if (txId && transactions.length > 0) {
            const match = transactions.find(t => t.id === txId || t.id.includes(txId));
            if (match) {
                setSelectedTx(match);
                setTimeout(() => {
                    const el = document.getElementById(`tx-${match.id}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 250);
            }
        }
    }, [searchParams, transactions]);

    const filtered = transactions.filter(tx => {
        if (filterType === 'ALL') return true;
        if (filterType === 'CASHBACK') return tx.type === 'CREDIT' && (tx.description?.includes('Challenge') || tx.description?.includes('Cashback'));
        if (filterType === 'REWARDS') return tx.description?.includes('Target') || tx.description?.includes('Reward');
        if (filterType === 'CAMPAIGN') return tx.description?.includes('Campaign') || tx.description?.includes('Share') || tx.description?.includes('Product');
        if (filterType === 'SPONSORSHIP') return tx.description?.includes('Sponsorship');
        return true;
    });

    const walletHref = isMerchant ? '/merchant/wallet' : '/wallet';

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header with Breadcrumbs & Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <MarketingBreadcrumbs
                    customTitle="Marketing Transactions"
                    customSubtitle="Surfaced directly from your authentic InTrust financial wallet ledger."
                />

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
                    {['ALL', 'CASHBACK', 'REWARDS', 'CAMPAIGN', 'SPONSORSHIP'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                filterType === type
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            {type === 'ALL' ? 'All Types' : type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transactions List Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    <span>Transaction Details</span>
                    <span>Amount</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filtered.map((tx) => {
                        const isCredit = tx.type === 'CREDIT';
                        const amount = (tx.amount_paise / 100).toLocaleString('en-IN');
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
                                className={`w-full text-left py-4 flex items-center justify-between group px-3 rounded-2xl transition-all ${
                                    isSelected 
                                        ? 'bg-blue-50/80 dark:bg-blue-950/50 ring-2 ring-blue-500/80 shadow-md shadow-blue-500/10' 
                                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                        isCredit 
                                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                            {tx.description}
                                        </h4>
                                        <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                                            {dateStr}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-sm sm:text-base font-black ${
                                        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                                    }`}>
                                        {isCredit ? '+' : '-'} ₹{amount}
                                    </span>
                                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Click any transaction for verified ledger details.</span>
                    <Link href={walletHref} className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                        <span>Open Complete InTrust Wallet</span>
                        <ExternalLink size={12} />
                    </Link>
                </div>
            </div>

            {/* Transaction Receipt & Detail Modal */}
            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                    selectedTx.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'
                                }`}>
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
                                {selectedTx.type === 'CREDIT' ? 'Wallet Credit' : 'Wallet Debit'}
                            </span>
                            <div className={`text-3xl font-black ${
                                selectedTx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                            }`}>
                                {selectedTx.type === 'CREDIT' ? '+' : '-'} ₹{(selectedTx.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                <span className="text-slate-400 font-semibold">Category</span>
                                <span className="font-mono font-bold text-blue-600">{selectedTx.category || 'MARKETING'}</span>
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
