'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Wallet2, ChevronRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import WalletStatsCards from '@/components/admin/ai-grow/WalletStatsCards';
import MerchantWalletTable from '@/components/admin/ai-grow/MerchantWalletTable';
import AdjustBalanceModal from '@/components/admin/ai-grow/AdjustBalanceModal';
import WalletAuditDrawer from '@/components/admin/ai-grow/WalletAuditDrawer';
import PageGuideWrapper from '@/components/admin/PageGuideWrapper';

export default function AIGrowWalletsPage() {
    const supabase = createClient();

    const [wallets, setWallets] = useState([]);
    const [totalAdjustments30d, setTotalAdjustments30d] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

            // Check super_admin role
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            setIsSuperAdmin(profile?.role === 'super_admin');

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

    if (!loading && !isSuperAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50/50 font-[family-name:var(--font-outfit)]">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl text-center max-w-md w-full">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-5 sm:mb-6 shadow-inner">
                        <ShieldAlert size={28} className="text-amber-600 sm:w-8 sm:h-8" />
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 mb-3">
                        Super Admin Access Only
                    </span>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 mb-2 tracking-tight">Access Restricted</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mb-6">
                        AI Grow Wallets and manual balance adjustments can only be managed by Super Administrators.
                    </p>
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white text-xs font-black rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 w-full sm:w-auto"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shrink-0 mt-0.5 sm:mt-0">
                        <Wallet2 size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5 flex-wrap">
                            <Link href="/admin" className="hover:text-gray-600 transition-colors">Admin</Link>
                            <ChevronRight size={12} className="shrink-0 text-gray-300" />
                            <span className="text-gray-400">AI Grow</span>
                            <ChevronRight size={12} className="shrink-0 text-gray-300" />
                            <span className="text-gray-700 font-medium">Wallets</span>
                        </div>
                        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">Merchant AI Grow Wallets</h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-2 sm:line-clamp-none">
                            Manage and audit AI Grow trade capital balances across all merchants
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t border-gray-100 sm:border-0 shrink-0">
                    <PageGuideWrapper pageKey="/admin/ai-grow/wallets" />
                    <button
                        onClick={fetchWallets}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-xs disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
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
                    onAdjust={isSuperAdmin ? (wallet) => setAdjustTarget(wallet) : null}
                    onHistory={(wallet) => setHistoryTarget(wallet)}
                />
            )}

            {/* Adjust Balance Modal */}
            {isSuperAdmin && (
                <AdjustBalanceModal
                    isOpen={!!adjustTarget}
                    merchant={adjustTarget}
                    onClose={() => setAdjustTarget(null)}
                    onSuccess={handleAdjustSuccess}
                />
            )}

            {/* Audit Trail Drawer */}
            <WalletAuditDrawer
                isOpen={!!historyTarget}
                merchant={historyTarget}
                onClose={() => setHistoryTarget(null)}
            />
        </div>
    );
}
