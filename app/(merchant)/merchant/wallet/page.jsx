import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Wallet, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
    const supabase = await createServerSupabaseClient();

    // 1. Get User & Auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Get Merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    let merchant = null;

    if (profile?.role === 'admin') {
        const { data } = await supabase
            .from('merchants')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        merchant = data;
    } else {
        const { data } = await supabase
            .from('merchants')
            .select('*')
            .eq('user_id', user.id)
            .single();
        merchant = data;
    }

    if (!merchant) {
        redirect('/merchant-apply');
    }

    // 3. Mock transactions (replace with real query when table is ready)
    const mockTransactions = [
        { id: 1, type: 'credit', amount: 500000, description: 'Initial Deposit', date: new Date().toISOString() },
        { id: 2, type: 'debit', amount: 150000, description: 'Purchase of Coupons', date: new Date(Date.now() - 86400000).toISOString() },
    ];

    const balance = (merchant.wallet_balance_paise || 0) / 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            My Wallet
                        </h1>
                        <p className="text-gray-600">Manage your balance and view transactions</p>
                    </div>

                    {/* Balance Card */}
                    <div className="bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-3xl p-8 text-white shadow-xl mb-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <p className="text-blue-100 font-semibold mb-1">Available Balance</p>
                                <h2 className="text-4xl sm:text-5xl font-bold">₹{balance.toLocaleString()}</h2>
                            </div>
                            <button className="px-6 py-3 bg-white text-[#92BCEA] font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2">
                                <Wallet size={20} />
                                Add Money
                            </button>
                        </div>
                    </div>

                    {/* Transactions */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
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
                                    {mockTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-2 font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {tx.type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                    {tx.type === 'credit' ? 'Credit' : 'Debit'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-900">{tx.description}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(tx.date).toLocaleDateString()}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {tx.type === 'credit' ? '+' : '-'}₹{(tx.amount / 100).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {mockTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                No transactions found
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
