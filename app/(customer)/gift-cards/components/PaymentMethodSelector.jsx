'use client';

import { CreditCard, Smartphone, Wallet } from 'lucide-react';

const paymentMethodsData = [
    { id: 'upi', name: 'UPI', icon: Smartphone, desc: 'PhonePe, GPay, Paytm', recommended: true },
    { id: 'card', name: 'Card', icon: CreditCard, desc: 'Credit/Debit Card', recommended: false },
    { id: 'wallet', name: 'Wallet', icon: Wallet, desc: 'Paytm, Freecharge', recommended: false },
];

export default function PaymentMethodSelector({ selectedPayment, setSelectedPayment }) {
    return (
        <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Method</label>
            <div className="space-y-2.5">
                {paymentMethodsData.map((method) => {
                    const Icon = method.icon;
                    return (
                        <button
                            key={method.id}
                            onClick={() => setSelectedPayment(method.id)}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${selectedPayment === method.id
                                    ? 'border-[#92BCEA] bg-gradient-to-r from-[#92BCEA]/5 to-[#AFB3F7]/5 shadow-lg shadow-[#92BCEA]/10'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${selectedPayment === method.id
                                    ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                <Icon size={20} />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    {method.name}
                                    {method.recommended && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                            Best
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{method.desc}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedPayment === method.id ? 'border-[#92BCEA]' : 'border-gray-300'
                                }`}>
                                {selectedPayment === method.id && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#92BCEA]" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
