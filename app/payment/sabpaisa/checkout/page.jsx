'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, CheckCircle2, XCircle, Loader2, CreditCard, Smartphone, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

function SabpaisaCheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const txnId = searchParams.get('txnId');
    const amountPaise = searchParams.get('amount');
    const callbackUrl = searchParams.get('callback') || '/api/merchant/ai-orders/sabpaisa-webhook';

    const [selectedMethod, setSelectedMethod] = useState('upi');
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'failed' | null

    const amountRupees = amountPaise ? (parseInt(amountPaise, 10) / 100) : 0;

    const handlePayment = async (payStatus) => {
        setIsProcessing(true);
        try {
            const res = await fetch(callbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txnId,
                    status: payStatus
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Payment gateway simulation failed');
            }

            if (payStatus === 'SUCCESS') {
                setStatus('success');
                toast.success('Payment completed successfully!');
                setTimeout(() => {
                    router.push('/merchant/ai-orders');
                }, 1500);
            } else {
                setStatus('failed');
                toast.error('Payment cancelled');
                setTimeout(() => {
                    router.push('/merchant/ai-orders');
                }, 1500);
            }
        } catch (err) {
            toast.error(err.message || 'Transaction failed');
            setIsProcessing(false);
        }
    };

    if (!txnId) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 text-center border border-slate-200 dark:border-slate-800">
                    <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invalid Payment Session</h2>
                    <p className="text-sm text-slate-500 mt-2">No transaction ID was provided for this checkout request.</p>
                    <button
                        onClick={() => router.push('/merchant/ai-orders')}
                        className="mt-6 w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm"
                    >
                        Return to AI Orders
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 text-white relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="font-black text-xl tracking-wider">SabPaisa</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/20">Secure PG</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-blue-200 font-medium">
                            <ShieldCheck size={16} className="text-emerald-400" /> 256-bit SSL
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-blue-200 uppercase font-bold tracking-wider">Total Payable</p>
                        <h1 className="text-3xl font-black mt-1">₹{amountRupees.toLocaleString('en-IN')}</h1>
                        <p className="text-[11px] text-blue-200/80 font-mono mt-1">TXN: {txnId}</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {status === 'success' ? (
                        <div className="text-center py-8 space-y-3">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Payment Received!</h3>
                            <p className="text-sm text-slate-500">Order successfully accepted. Redirecting you to AI Orders...</p>
                        </div>
                    ) : status === 'failed' ? (
                        <div className="text-center py-8 space-y-3">
                            <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Payment Cancelled</h3>
                            <p className="text-sm text-slate-500">Order has been released back to pending. Redirecting...</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-3">
                                    Select Payment Method
                                </label>
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMethod('upi')}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${selectedMethod === 'upi' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                                                <Smartphone size={20} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-bold">UPI / QR Code</div>
                                                <div className="text-xs text-slate-400">Google Pay, PhonePe, Paytm</div>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'upi' ? 'border-blue-600' : 'border-slate-300'}`}>
                                            {selectedMethod === 'upi' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedMethod('card')}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${selectedMethod === 'card' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center">
                                                <CreditCard size={20} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-bold">Credit / Debit Card</div>
                                                <div className="text-xs text-slate-400">Visa, Mastercard, RuPay</div>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'card' ? 'border-blue-600' : 'border-slate-300'}`}>
                                            {selectedMethod === 'card' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedMethod('netbanking')}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${selectedMethod === 'netbanking' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                                                <Building2 size={20} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-bold">Net Banking</div>
                                                <div className="text-xs text-slate-400">All major Indian banks</div>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'netbanking' ? 'border-blue-600' : 'border-slate-300'}`}>
                                            {selectedMethod === 'netbanking' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={() => handlePayment('SUCCESS')}
                                    disabled={isProcessing}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" /> Processing Payment...
                                        </>
                                    ) : (
                                        <>
                                            Pay ₹{amountRupees.toLocaleString('en-IN')} Now
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => handlePayment('FAILED')}
                                    disabled={isProcessing}
                                    className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-bold text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                                >
                                    <ArrowLeft size={16} /> Cancel & Return
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/80 p-4 border-t border-slate-100 dark:border-slate-800/60 text-center text-xs text-slate-400">
                    Protected by SabPaisa Payment Gateway. Funds are credited directly to escrow.
                </div>
            </div>
        </div>
    );
}

export default function SabpaisaCheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <SabpaisaCheckoutContent />
        </Suspense>
    );
}
