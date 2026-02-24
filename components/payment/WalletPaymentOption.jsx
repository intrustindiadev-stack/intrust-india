import { Wallet, Plus, ChevronRight, ShieldCheck } from 'lucide-react';

export default function WalletPaymentOption({ balance, requiredAmount, onPay, onTopup }) {
    const hasSufficientBalance = balance >= requiredAmount;
    const shortfall = requiredAmount - balance;

    return (
        <div className="w-full mb-6 rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
            {/* Dark gradient header */}
            <div className="px-5 py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-slate-900">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
                            <Wallet className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base leading-tight">Wallet</h3>
                            <p className="text-gray-400 text-xs mt-0.5">Fast, secure, one-click payment</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Current Balance</p>
                        <p className="text-xl font-extrabold text-white leading-tight">
                            ₹{balance?.toLocaleString('en-IN') || '0.00'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action area */}
            <div className="px-5 py-4 bg-gradient-to-br from-gray-900 to-gray-950">
                {hasSufficientBalance ? (
                    <button
                        onClick={onPay}
                        className="
                            w-full py-3.5 rounded-xl font-bold text-sm text-white
                            bg-gradient-to-r from-indigo-500 to-indigo-700
                            hover:from-indigo-400 hover:to-indigo-600
                            shadow-lg shadow-indigo-900/40
                            transition-all duration-200 hover:-translate-y-0.5
                            flex items-center justify-center gap-2
                        "
                    >
                        Pay ₹{requiredAmount?.toLocaleString('en-IN')} from Wallet
                        <ChevronRight size={16} />
                    </button>
                ) : (
                    <div className="space-y-3">
                        {/* Insufficient balance warning */}
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
                            <span className="text-red-300 text-xs font-medium">
                                Insufficient balance. You need <span className="font-bold text-red-200">₹{shortfall.toLocaleString('en-IN')}</span> more.
                            </span>
                        </div>

                        {/* Topup button */}
                        <button
                            onClick={onTopup}
                            className="
                                w-full py-3.5 rounded-xl font-bold text-sm
                                bg-white/5 hover:bg-white/10
                                border border-white/10 hover:border-white/20
                                text-white transition-all duration-200
                                flex items-center justify-center gap-2
                            "
                        >
                            <Plus size={16} />
                            Add Money to Wallet
                        </button>
                    </div>
                )}

                {/* Security badge */}
                <div className="flex items-center justify-center gap-1.5 mt-3 text-gray-600">
                    <ShieldCheck size={11} />
                    <span className="text-[10px] font-medium tracking-wide">End-to-end encrypted</span>
                </div>
            </div>
        </div>
    );
}
