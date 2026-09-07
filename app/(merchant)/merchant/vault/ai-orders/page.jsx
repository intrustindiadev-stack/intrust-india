'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMerchant } from '@/hooks/useMerchant';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import AIVaultOverview from '@/components/merchant/vault/AIVaultOverview';
import { ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';

export default function AIVaultPage() {
    const { merchant } = useMerchant();
    const [vault, setVault] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [summaryStats, setSummaryStats] = useState({ 
        principalReturned: 0, 
        completedCount: 0,
        totalInvested: 0
    });
    const [activeOrdersStats, setActiveOrdersStats] = useState({
        count: 0,
        totalAmount: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchVaultData = async () => {
            if (!merchant) return;
            try {
                const merchantUserId = merchant.user_id || merchant.id;

                // 1. Fetch Vault
                const { data: vaultData, error: vaultError } = await supabase
                    .from('ai_orders_vault')
                    .select('*')
                    .eq('merchant_id', merchantUserId)
                    .maybeSingle();

                if (vaultError) throw vaultError;

                // 2. Fetch all orders for this merchant
                const { data: allOrders, error: ordersError } = await supabase
                    .from('ai_orders')
                    .select('id, order_code, wholesale_price_paise, profit_margin_paise, status')
                    .eq('merchant_id', merchantUserId);

                if (ordersError) throw ordersError;

                const completed = (allOrders || []).filter(o => o.status === 'COMPLETED');
                const active = (allOrders || []).filter(o => o.status === 'ACCEPTED');

                const totalPrincipalPaise = completed.reduce((acc, curr) => acc + Number(curr.wholesale_price_paise || 0), 0);
                const activePaise = active.reduce((acc, curr) => acc + Number(curr.wholesale_price_paise || 0), 0);
                const allInvestedPaise = (allOrders || []).reduce((acc, curr) => acc + Number(curr.wholesale_price_paise || 0), 0);

                setSummaryStats({
                    principalReturned: totalPrincipalPaise / 100,
                    completedCount: completed.length,
                    totalInvested: allInvestedPaise / 100
                });

                setActiveOrdersStats({
                    count: active.length,
                    totalAmount: activePaise / 100
                });

                // Create a lookup for order codes
                const orderCodeMap = {};
                (allOrders || []).forEach(o => {
                    orderCodeMap[o.id] = o.order_code || `AI-${o.id.slice(0, 4)}`;
                });

                if (vaultData) {
                    setVault(vaultData);
                    // 3. Fetch Transactions
                    const { data: txData, error: txError } = await supabase
                        .from('ai_orders_vault_transactions')
                        .select('*')
                        .eq('vault_id', vaultData.id)
                        .order('created_at', { ascending: false });

                    if (txError) throw txError;

                    const enrichedTx = (txData || []).map(tx => ({
                        ...tx,
                        order_code: orderCodeMap[tx.reference_order_id] || (tx.reference_order_id ? `#AI-${tx.reference_order_id.slice(0, 4)}` : '—')
                    }));

                    setTransactions(enrichedTx);
                } else {
                    setVault({ balance_paise: 0, total_profit_paise: 0 });
                    setTransactions([]);
                }
            } catch (error) {
                console.error("Vault fetch error:", error);
                toast.error('Failed to load vault data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchVaultData();
    }, [merchant]);

    if (!merchant) return null;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between">
                <Link 
                    href="/merchant/ai-orders" 
                    className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={14} className="mr-1.5" />
                    Back to AI Orders
                </Link>

                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck size={16} /> InTrust Escrow Guaranteed
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-6 animate-pulse">
                    <div className="h-10 w-64 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-36 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        <div className="lg:col-span-7 h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                        <div className="lg:col-span-5 h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                    </div>
                </div>
            ) : (
                <AIVaultOverview 
                    vault={vault} 
                    transactions={transactions} 
                    summaryStats={summaryStats}
                    activeOrdersStats={activeOrdersStats}
                />
            )}
        </div>
    );
}
