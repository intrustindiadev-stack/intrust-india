import { Wallet, Plus } from 'lucide-react';

export default function WalletPaymentOption({ balance, requiredAmount, onPay, onTopup }) {
    const hasSufficientBalance = balance >= requiredAmount;

    return (
        <div className="w-full p-4 mb-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <Wallet className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Merchant Wallet</h3>
                        <p className="text-gray-400 text-sm">Fast, secure, one-click payment</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Current Balance</p>
                    <p className="text-xl font-bold">₹{balance?.toLocaleString('en-IN') || '0'}</p>
                </div>
            </div>

            {hasSufficientBalance ? (
                <button
                    onClick={onPay}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
                >
                    Pay ₹{requiredAmount?.toLocaleString('en-IN')} from Wallet
                </button>
            ) : (
                <div className="flex flex-col gap-3">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm flex items-center gap-2">
                        <span>Insufficient balance. You need ₹{(requiredAmount - balance).toLocaleString('en-IN')} more.</span>
                    </div>
                    <button
                        onClick={onTopup}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-white/10"
                    >
                        <Plus size={18} />
                        Add Money to Wallet
                    </button>
                </div>
            )}
        </div>
    );
}
