'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Wallet2, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import WalletStatsCards from '@/components/admin/ai-grow/WalletStatsCards';
import MerchantWalletTable from '@/components/admin/ai-grow/MerchantWalletTable';
import AdjustBalanceModal from '@/components/admin/ai-grow/AdjustBalanceModal';
import WalletAuditDrawer from '@/components/admin/ai-grow/WalletAuditDrawer';

export default function AIGrowWalletsPage() {
    const supabase = createClient();

    const [wallets, setWallets] = useState([]);
    const [totalAdjustments30d, setTotalAdjustments30d] = useState(0);
    const [loading, setLoading] = useState(true);

    // Modal / Drawer state
    const [adjustTarget, setAdjustTarget] = useState(null);  // wallet object
    const [historyTarget, setHistoryTarget] = useState(null); // wallet object

    const fetchWallets = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Session expired. Please log in again.');
                return;
            }

            // Fetch wallets with merchant details
            const { data: walletsData, error: walletsErr } = await supabase
                .from('ai_grow_wallets')
                .select(`
                    id,
                    merchant_id,
                    balance,
                    currency,
                    status,
                    created_at,
                    updated_at,
                    merchant:merchants (
                        id,
                        business_name,
                        owner_name
                    )
                `)
                .order('balance', { ascending: false });

            if (walletsErr) throw new Error(walletsErr.message);
            setWallets(walletsData || []);

            // Fetch 30-day manual adjustment count
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { count, error: countErr } = await supabase
                .from('ai_grow_wallet_transactions')
                .select('id', { count: 'exact', head: true })
                .in('transaction_type', ['credit', 'debit', 'admin_adjustment'])
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (!countErr) setTotalAdjustments30d(count || 0);

        } catch (err) {
            console.error('[ai-grow/wallets] Fetch error:', err);
            toast.error(err.message || 'Failed to load wallet data.');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchWallets();
    }, [fetchWallets]);

    // After a successful adjustment, refresh wallet data
    function handleAdjustSuccess() {
        fetchWallets();
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
                        <Wallet2 size={20} className="text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
                            <span>Admin</span>
                            <ChevronRight size={12} />
                            <span>AI Grow</span>
                            <ChevronRight size={12} />
                            <span className="text-gray-600 font-medium">Investment Wallets</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Merchant Investment Wallets</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Manage and audit AI Grow investment balances across all merchants
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchWallets}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <WalletStatsCards
                wallets={wallets}
                totalAdjustments30d={totalAdjustments30d}
            />

            {/* Wallet Table */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-3 text-gray-400">
                    <RefreshCw size={24} className="animate-spin text-indigo-400" />
                    <p className="text-sm">Loading investment wallets…</p>
                </div>
            ) : (
                <MerchantWalletTable
                    wallets={wallets}
                    onAdjust={(wallet) => setAdjustTarget(wallet)}
                    onHistory={(wallet) => setHistoryTarget(wallet)}
                />
            )}

            {/* Adjust Balance Modal */}
            <AdjustBalanceModal
                isOpen={!!adjustTarget}
                merchant={adjustTarget}
                onClose={() => setAdjustTarget(null)}
                onSuccess={handleAdjustSuccess}
            />

            {/* Audit Trail Drawer */}
            <WalletAuditDrawer
                isOpen={!!historyTarget}
                merchant={historyTarget}
                onClose={() => setHistoryTarget(null)}
            />
        </div>
    );
}
