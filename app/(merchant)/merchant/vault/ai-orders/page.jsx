'use client';

import React, { useState, useEffect } from 'react';
import { useMerchant } from '@/hooks/useMerchant';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import AIVaultOverview from '@/components/merchant/vault/AIVaultOverview';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AIVaultPage() {
    const { merchant } = useMerchant();
    const [vault, setVault] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchVaultData = async () => {
            if (!merchant) return;
            try {
                // Fetch Vault
                const { data: vaultData, error: vaultError } = await supabase
                    .from('ai_orders_vault')
                    .select('*')
                    .eq('merchant_id', merchant.id)
                    .single();

                if (vaultError && vaultError.code !== 'PGRST116') {
                    throw vaultError;
                }

                if (vaultData) {
                    setVault(vaultData);
                    // Fetch Transactions
                    const { data: txData, error: txError } = await supabase
                        .from('ai_orders_vault_transactions')
                        .select('*')
                        .eq('vault_id', vaultData.id)
                        .order('created_at', { ascending: false });

                    if (txError) throw txError;
                    setTransactions(txData);
                }
            } catch (error) {
                console.error("Vault fetch error:", error);
                toast.error('Failed to load vault data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchVaultData();
    }, [merchant, toast]);

    if (!merchant) return null;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
            <Link href="/merchant/ai-orders" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <ArrowLeft size={16} className="mr-1" />
                Back to AI Orders
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        AI Orders Vault
                        <ShieldCheck className="text-emerald-500 w-8 h-8" />
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your principal investments and profits securely.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4 animate-pulse">
                    <div className="h-40 bg-slate-100 dark:bg-white/5 rounded-2xl" />
                    <div className="h-64 bg-slate-100 dark:bg-white/5 rounded-2xl" />
                </div>
            ) : (
                <AIVaultOverview vault={vault} transactions={transactions} />
            )}
        </div>
    );
}
