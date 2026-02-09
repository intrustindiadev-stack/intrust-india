'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownLeft,
    Plus,
    Download,
    Loader2,
    AlertCircle,
    Calendar,
    Filter
} from 'lucide-react';

export default function MerchantWalletPage() {
    const [loading, setLoading] = useState(true);
    const [merchantProfile, setMerchantProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [filter, setFilter] = useState('all'); // all, purchase, sale, commission

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get merchant profile
            const { data: merchant, error: merchantError } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (merchantError) throw merchantError;
            setMerchantProfile(merchant);

            // Get transactions
            const { data: txns, error: txnsError } = await supabase
                .from('merchant_transactions')
                .select('*')
                .eq('merchant_id', merchant.id)
                .order('created_at', { ascending: false });

            if (txnsError) throw txnsError;
            setTransactions(txns || []);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(txn => {
        if (filter === 'all') return true;
        return txn.transaction_type === filter;
    });

    const stats = {
        balance: (merchantProfile?.wallet_balance_paise || 0) / 100,
        totalCommission: (merchantProfile?.total_commission_paid_paise || 0) / 100,
        totalPurchases: transactions.filter(t => t.transaction_type === 'purchase').length,
        totalSales: transactions.filter(t => t.transaction_type === 'sale').length,
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Wallet
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">Manage your balance and view transaction history</p>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 mb-6 sm:mb-8 text-white">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-white/80 text-sm sm:text-base mb-2">Available Balance</p>
                            <h2 className="text-4xl sm:text-5xl font-bold">₹{stats.balance.toLocaleString()}</h2>
                        </div>
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Wallet className="text-white" size={24} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                        <div>
                            <p className="text-white/70 text-xs sm:text-sm mb-1">Total Purchases</p>
                            <p className="text-xl sm:text-2xl font-bold">{stats.totalPurchases}</p>
                        </div>
                        <div>
                            <p className="text-white/70 text-xs sm:text-sm mb-1">Total Sales</p>
                            <p className="text-xl sm:text-2xl font-bold">{stats.totalSales}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button className="flex-1 px-4 sm:px-6 py-3 bg-white text-[#92BCEA] font-bold rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                            <Plus size={20} />
                            <span className="hidden sm:inline">Add Money</span>
                            <span className="sm:hidden">Top Up</span>
                        </button>
                        <button className="flex-1 px-4 sm:px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/30 transition-all flex items-center justify-center gap-2">
                            <Download size={20} />
                            <span className="hidden sm:inline">Download Statement</span>
                            <span className="sm:hidden">Statement</span>
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-sm">
                                <TrendingUp className="text-white" size={20} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                            ₹{transactions
                                .filter(t => t.transaction_type === 'sale')
                                .reduce((sum, t) => sum + (t.amount_paise || 0), 0) / 100}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Total Revenue</div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-sm">
                                <TrendingDown className="text-white" size={20} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                            ₹{transactions
                                .filter(t => t.transaction_type === 'purchase')
                                .reduce((sum, t) => sum + Math.abs(t.amount_paise || 0), 0) / 100}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Total Spent</div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                                <ArrowUpRight className="text-white" size={20} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                            ₹{stats.totalCommission.toLocaleString()}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Commission Paid</div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>

                            {/* Filter Buttons */}
                            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                                {['all', 'purchase', 'sale'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setFilter(type)}
                                        className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${filter === type
                                                ? 'bg-[#92BCEA] text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Transactions List */}
                    <div className="divide-y divide-gray-200">
                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-12 sm:py-16">
                                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600">No transactions yet</p>
                            </div>
                        ) : (
                            filteredTransactions.map((txn) => {
                                const amount = txn.amount_paise / 100;
                                const commission = (txn.commission_paise || 0) / 100;
                                const isCredit = txn.transaction_type === 'sale';

                                return (
                                    <div key={txn.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-green-100' : 'bg-red-100'
                                                    }`}>
                                                    {isCredit ? (
                                                        <ArrowDownLeft className="text-green-600" size={20} />
                                                    ) : (
                                                        <ArrowUpRight className="text-red-600" size={20} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 mb-1 truncate">
                                                        {txn.description || txn.transaction_type}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {new Date(txn.created_at).toLocaleDateString('en-IN')}
                                                        </span>
                                                        {commission > 0 && (
                                                            <span className="text-orange-600">
                                                                • Fee: ₹{commission.toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-lg sm:text-xl font-bold ${isCredit ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {isCredit ? '+' : '-'}₹{Math.abs(amount).toLocaleString()}
                                                </p>
                                                <p className="text-xs sm:text-sm text-gray-500">
                                                    Balance: ₹{(txn.balance_after_paise / 100).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
