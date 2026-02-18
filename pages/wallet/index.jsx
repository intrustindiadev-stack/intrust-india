import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import WalletBalance from '@/components/wallet/WalletBalance';
import WalletTopup from '@/components/wallet/WalletTopup';
import WalletTransactionList from '@/components/wallet/WalletTransactionList';
import { Loader2 } from 'lucide-react';

export default function WalletPage() {
    const { user, loading: authLoading } = useAuth();
    const { balance, loading: walletLoading, transactions, transactionsLoading, fetchTransactions } = useWallet();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Determine active section based on URL query param
    const section = searchParams.get('section') || 'dashboard';
    const action = searchParams.get('action');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (user) {
            fetchTransactions();
        }
    }, [user, fetchTransactions]);

    if (authLoading || walletLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <Navbar />

            <div className="pt-24 px-6 max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Wallet</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your balance and transactions</p>
                </header>

                {/* Balace Card */}
                <WalletBalance balance={balance} loading={walletLoading} />

                {/* Main Content Area */}
                <div className="grid md:grid-cols-3 gap-8 items-start">

                    {/* Left Column: Actions / Topup */}
                    <div className="md:col-span-1 space-y-6">
                        {/* Always show Topup if action=topup OR on desktop as sidebar */}
                        <div className={`${action === 'topup' ? 'block' : 'hidden md:block'}`}>
                            <WalletTopup user={user} />
                        </div>
                    </div>

                    {/* Right Column: History */}
                    <div className="md:col-span-2">
                        <WalletTransactionList transactions={transactions.transactions} loading={transactionsLoading} />
                    </div>
                </div>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
