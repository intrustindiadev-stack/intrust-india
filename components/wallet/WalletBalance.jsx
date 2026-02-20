import { useState } from 'react';
import { Plus, Wallet, History, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WalletBalance({ balance, loading }) {
    const router = useRouter();

    return (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 mb-1">
                        <Wallet size={16} /> Merchant Wallet Balance
                    </h2>
                    {loading ? (
                        <div className="h-10 w-48 bg-gray-700 animate-pulse rounded-lg mt-2"></div>
                    ) : (
                        <div className="text-4xl font-extrabold mt-1">
                            ₹{balance?.balance?.toLocaleString('en-IN') || '0.00'}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => router.push('/wallet?action=topup')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/50"
                    >
                        <Plus size={18} /> Add Money
                    </button>
                    <button
                        onClick={() => router.push('/wallet?section=history')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all backdrop-blur-sm"
                    >
                        <History size={18} /> History
                    </button>
                </div>
            </div>
        </div>
    );
}
