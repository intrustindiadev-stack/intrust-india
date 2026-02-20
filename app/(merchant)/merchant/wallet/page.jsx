'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, RefreshCw, Loader2 } from 'lucide-react';
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
            console.log('[WalletPage] API response:', data);
            console.log('[WalletPage] Transactions count:', data.transactions?.length);
            setWallet(data.wallet);
            setTransactions(data.transactions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Get current user
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
        fetchWalletData();
    }, [fetchWalletData]);

    // Auto-refresh balance if returning from a successful payment
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">

                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                                My Wallet
                            </h1>
                            <p className="text-gray-600">Manage your balance and view transactions</p>
                        </div>
                        <button
                            onClick={fetchWalletData}
                            disabled={loading}
                            className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-500"
                            title="Refresh"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Balance Card */}
                    <div className="bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-3xl p-8 text-white shadow-xl mb-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <p className="text-blue-100 font-semibold mb-1">Available Balance</p>
                                {loading ? (
                                    <div className="h-12 w-40 bg-white/20 animate-pulse rounded-xl mt-1" />
                                ) : (
                                    <h2 className="text-4xl sm:text-5xl font-bold">
                                        ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h2>
                                )}
                            </div>
                            <button
                                onClick={() => setShowTopup(true)}
                                className="px-6 py-3 bg-white text-[#6B8FBF] font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Add Money
                            </button>
                        </div>
                    </div>

                    {/* Add Money Panel */}
                    {showTopup && user && (
                        <div className="mb-8">
                            <WalletTopup
                                user={user}
                                onSuccess={() => {
                                    setShowTopup(false);
                                    fetchWalletData();
                                }}
                                onCancel={() => setShowTopup(false)}
                            />
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Transactions */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
                            {loading && <Loader2 size={18} className="animate-spin text-gray-400" />}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-2 font-semibold ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.transaction_type === 'CREDIT'
                                                        ? <ArrowDownLeft size={16} />
                                                        : <ArrowUpRight size={16} />}
                                                    {tx.transaction_type === 'CREDIT' ? 'Credit' : 'Debit'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-900">{tx.description || tx.reference_type || '—'}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(tx.created_at).toLocaleDateString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {!loading && transactions.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                                <Wallet size={32} className="mx-auto mb-3 opacity-30" />
                                                <p>No transactions yet</p>
                                                <p className="text-sm mt-1">Add money to get started</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
