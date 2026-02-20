'use client';

import { useState } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { Loader2, ArrowRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function WalletTopup({ user, onSuccess, onCancel }) {
    const [amount, setAmount] = useState('');
    const { initiatePayment, loading } = usePayment();

    const handleTopup = async () => {
        const value = parseInt(amount);
        if (!value || value < 100) {
            toast.error('Minimum topup amount is ₹100');
            return;
        }

        try {
            await initiatePayment({
                amount: value,
                payerName: user?.user_metadata?.full_name || user?.email || 'User',
                payerEmail: user?.email || '',
                payerMobile: user?.phone || '9999999999',
                udf1: 'WALLET_TOPUP',
                udf2: user?.id || ''
            });
            // initiatePayment redirects to Sabpaisa — if it returns, it failed
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to initiate topup');
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Add Money to Wallet</h3>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Amount Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter Amount
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">₹</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            min="100"
                            className="w-full pl-10 pr-4 py-4 text-2xl font-bold rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Minimum ₹100</p>
                </div>

                {/* Preset Amounts */}
                <div className="flex flex-wrap gap-3">
                    {PRESET_AMOUNTS.map((amt) => (
                        <button
                            key={amt}
                            onClick={() => setAmount(amt.toString())}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${amount === amt.toString()
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                        >
                            + ₹{amt.toLocaleString('en-IN')}
                        </button>
                    ))}
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleTopup}
                    disabled={loading || !amount || parseInt(amount) < 100}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                    {loading
                        ? <><Loader2 className="animate-spin" size={20} /> Processing...</>
                        : <>Proceed to Pay <ArrowRight size={20} /></>
                    }
                </button>

                <p className="text-xs text-center text-gray-400">
                    Secure payment via Sabpaisa Gateway
                </p>
            </div>
        </div>
    );
}
