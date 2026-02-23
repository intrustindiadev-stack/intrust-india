'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import WalletTopup from '@/components/wallet/WalletTopup';
import { useSearchParams } from 'next/navigation';

export default function WalletPage() {
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTopup, setShowTopup] = useState(false);
    const [user, setUser] = useState(null);
    const searchParams = useSearchParams();

    const fetchWalletData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Not authenticated');
                return;
            }

            const res = await fetch('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch wallet data');
            const data = await res.json();
            setWallet(data.wallet);
            setTransactions(data.transactions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
        fetchWalletData();
    }, [fetchWalletData]);

    useEffect(() => {
        const action = searchParams.get('action');
        const topup = searchParams.get('topup');
        if (action === 'topup') {
            setShowTopup(true);
        }
        if (topup === 'success') {
            fetchWalletData();
        }
    }, [searchParams, fetchWalletData]);

    const balance = wallet?.balance ?? 0;

    return (
        <div className="relative">
            {/* Background embellishments */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 mt-6 gap-4">
                <div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">My Wallet</h1>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Manage your balance and view transaction history</p>
                </div>
                <button
                    onClick={fetchWalletData}
                    disabled={loading}
                    className="p-3 bg-white/40 dark:bg-white/5 merchant-glass hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors border border-black/5 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white group flex items-center shadow-sm"
                    title="Refresh"
                >
                    <span className={`material-icons-round text-lg ${loading ? 'animate-spin text-[#D4AF37]' : 'group-hover:text-[#D4AF37] transition-colors'}`}>refresh</span>
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center space-x-2 font-bold shadow-sm">
                    <span className="material-icons-round">error_outline</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Balance Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#D4AF37]/10 to-transparent dark:from-[#D4AF37]/20 dark:to-transparent border border-[#D4AF37]/20 rounded-3xl p-8 mb-8 shadow-xl">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none dark:opacity-20"></div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-6">
                    <div>
                        <div className="flex items-center space-x-2 text-[#D4AF37] mb-2">
                            <span className="material-icons-round text-xl">account_balance_wallet</span>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Available Balance</span>
                        </div>
                        {loading ? (
                            <div className="h-14 w-48 bg-black/5 dark:bg-white/10 animate-pulse rounded-xl" />
                        ) : (
                            <h2 className="text-5xl sm:text-6xl font-display font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                                ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        )}
                    </div>
                    <button
                        onClick={() => setShowTopup(true)}
                        className="w-full sm:w-auto px-8 py-4 bg-[#D4AF37] text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow"
                    >
                        <span className="material-icons-round text-lg">add_circle</span>
                        Add Money
                    </button>
                </div>
            </div>

            {/* Add Money Panel */}
            {showTopup && user && (
                <div className="mb-8 merchant-glass p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl relative overflow-hidden bg-white/40 dark:bg-black/5">
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={() => setShowTopup(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 transition-colors">
                            <span className="material-icons-round text-sm">close</span>
                        </button>
                    </div>
                    <div className="w-full">
                        <WalletTopup
                            user={user}
                            onSuccess={() => {
                                setShowTopup(false);
                                fetchWalletData();
                            }}
                            onCancel={() => setShowTopup(false)}
                        />
                    </div>
                </div>
            )}

            {/* Transactions */}
            <div className="merchant-glass rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                    <h3 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <span className="material-icons-round text-[#D4AF37] mr-3">history</span>
                        Recent Transactions
                    </h3>
                    {loading && <span className="material-icons-round animate-spin text-slate-400 dark:text-slate-500">autorenew</span>}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-black/5 dark:border-white/5">
                                <th className="px-8 py-5">Type</th>
                                <th className="px-8 py-5">Description</th>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5 text-right flex-1">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5">
                                        <div className={`flex items-center space-x-2 font-bold ${tx.transaction_type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.transaction_type === 'CREDIT' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                                                <span className="material-icons-round text-sm">{tx.transaction_type === 'CREDIT' ? 'south_west' : 'north_east'}</span>
                                            </div>
                                            <span>{tx.transaction_type === 'CREDIT' ? 'Credit' : 'Debit'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-slate-700 dark:text-slate-200 font-semibold">{tx.description || tx.reference_type || 'Wallet Transaction'}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                            {new Date(tx.created_at).toLocaleDateString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`text-right font-bold text-lg ${tx.transaction_type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && transactions.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-8 py-16 text-center">
                                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="material-icons-round text-slate-400 dark:text-slate-500 text-3xl">account_balance_wallet</span>
                                        </div>
                                        <p className="text-slate-800 dark:text-slate-300 font-bold mb-1">No transactions yet</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-500">Add money to get started</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
