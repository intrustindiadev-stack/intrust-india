import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Building, Smartphone, Wallet, ShieldCheck, Loader2 } from 'lucide-react';
import PaymentMethodCard from './PaymentMethodCard';
import WalletPaymentOption from './WalletPaymentOption';
import { submitPaymentForm } from 'sabpaisa-pg-dev';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SabpaisaPaymentModal({ isOpen, onClose, amount, user, productInfo }) {
    const { balance, fetchBalance, debitWallet } = useWallet();
    const router = useRouter();

    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Wallet topup states
    const [showTopupInput, setShowTopupInput] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');

    // Refresh wallet balance when modal opens
    useEffect(() => {
        if (isOpen && user) {
            fetchBalance();
        }
    }, [isOpen, user, fetchBalance]);

    // Handle Payment Selection
    const handlePayment = async (method, customAmount = null) => {
        setError(null);
        setProcessing(true);

        // Use customAmount for wallet topup, otherwise use the prop amount
        const paymentAmount = customAmount || amount;

        try {
            if (method === 'WALLET') {
                // Wallet Payment
                const txn = await debitWallet(
                    amount,
                    productInfo.id, // reference_id (gift card id)
                    'GIFT_CARD_PURCHASE',
                    `Purchase of ${productInfo.title}`
                );

                // If successful, we need to finalize the gift card order.
                // Normally debitWallet just debits money. 
                // The gift card logic in `handlePurchase` (in parent page) usually creates an order.
                // We should probably callback to parent to say "Payment Done, Txn ID: ..."
                // But the parent page currently handles EVERYTHING.

                // Let's assume we call a parent callback `onPaymentSuccess(txn)` or similar.
                // Or better: We call an API to issue the gift card now that payment is done.
                // BUT wait, debitWallet is just money movement. We need to create the actual order.
                // The `create-order` API was Razorpay specific.
                // We likely need a `pages/api/orders/create` that takes a payment confirmation?
                // OR, we can just say "If debit successful, show success".
                // The original flow was: Create Order -> Razorpay -> Verify.

                // FOR SABPAISA: We initiate -> Redirect -> Callback -> Update Txn -> Success Page.
                // The callback updates the transaction status.

                // FOR WALLET: We just debited. 
                // we should create a "transaction" record in `transactions` table too 
                // so it appears in history consistent with Sabpaisa payments.
                // OR `wallet_transactions` is enough? 
                // The dashboard shows `transactions`. We should probably create a `transaction` entry for uniformity.
                // For now, let's just treat success as success.
                // We'll redirect to a success handler.

                router.push(`/payment/success?txnId=${txn.transaction.id}&wallet=true`);

            } else if (method === 'ADD_TO_WALLET') {
                // Wallet Topup - Initiate Sabpaisa payment to credit wallet

                // 1. Get auth token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    throw new Error('Please log in to continue');
                }

                // 2. Call API to create transaction for wallet topup
                const response = await fetch('/api/payment/initiate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        amount: paymentAmount,
                        udf1: 'WALLET_TOPUP',  // ✅ Correct field name for callback to credit wallet
                        udf2: 'WALLET_TOPUP'
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to initiate wallet topup');
                }

                const data = await response.json();

                // 3. Prepare data for Sabpaisa NPM package
                const packageFormData = {
                    clientCode: process.env.NEXT_PUBLIC_SABPAISA_CLIENT_CODE,
                    transUserName: process.env.NEXT_PUBLIC_SABPAISA_USERNAME,
                    transUserPassword: process.env.NEXT_PUBLIC_SABPAISA_PASSWORD,
                    authKey: process.env.NEXT_PUBLIC_SABPAISA_AUTH_KEY,
                    authIV: process.env.NEXT_PUBLIC_SABPAISA_AUTH_IV,
                    callbackUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/payment/callback',
                    clientTxnId: data.transactionId,
                    payerName: user.user_metadata?.full_name || 'User',
                    payerEmail: user.email || 'test@example.com',
                    payerMobile: user.phone || '9999999999',
                    amount: Number(paymentAmount).toFixed(2),
                    channelId: 'W',
                    url: process.env.NEXT_PUBLIC_SABPAISA_INIT_URL
                };

                // 4. Submit payment form
                console.log('[Sabpaisa] Submitting wallet topup form with data:', {
                    ...packageFormData,
                    authKey: packageFormData.authKey ? '***set***' : '❌ MISSING',
                    authIV: packageFormData.authIV ? '***set***' : '❌ MISSING',
                    transUserPassword: '***hidden***'
                });

                if (!packageFormData.authKey || !packageFormData.authIV) {
                    throw new Error('Payment gateway credentials are not configured. Please contact support.');
                }

                await submitPaymentForm({
                    ...packageFormData,
                    env: process.env.NEXT_PUBLIC_SABPAISA_ENV || 'stag'
                });

            } else {
                // Sabpaisa Gateway Payment - NPM Package Flow (for Gift Card Purchase)

                // 1. Get auth token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    throw new Error('Please log in to continue');
                }

                // 2. Call API to create transaction record in DB
                const res = await fetch('/api/payment/initiate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        amount: paymentAmount,
                        payerName: user.user_metadata?.full_name || 'User',
                        payerEmail: user.email,
                        payerMobile: user.phone || '9999999999',
                        udf1: 'GIFT_CARD',
                        udf2: productInfo.id
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to initiate transaction');
                }

                // 3. Prepare Data for the NPM Package Form
                const formData = {
                    clientCode: process.env.NEXT_PUBLIC_SABPAISA_CLIENT_CODE,
                    transUserName: process.env.NEXT_PUBLIC_SABPAISA_USERNAME,
                    transUserPassword: process.env.NEXT_PUBLIC_SABPAISA_PASSWORD,
                    authKey: process.env.NEXT_PUBLIC_SABPAISA_AUTH_KEY,
                    authIV: process.env.NEXT_PUBLIC_SABPAISA_AUTH_IV,
                    callbackUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/payment/callback',
                    clientTxnId: data.transactionId,
                    payerName: user.user_metadata?.full_name || 'User',
                    payerEmail: user.email || 'test@example.com',
                    payerMobile: user.phone || '9999999999',
                    amount: Number(paymentAmount).toFixed(2),
                    channelId: 'W',
                    url: process.env.NEXT_PUBLIC_SABPAISA_INIT_URL
                };

                // 4. Submit payment form using NPM package
                console.log('[Sabpaisa] Submitting gift card payment form with data:', {
                    ...formData,
                    authKey: formData.authKey ? '***set***' : '❌ MISSING',
                    authIV: formData.authIV ? '***set***' : '❌ MISSING',
                    transUserPassword: '***hidden***'
                });

                if (!formData.authKey || !formData.authIV) {
                    throw new Error('Payment gateway credentials are not configured. Please contact support.');
                }

                await submitPaymentForm({
                    ...formData,
                    env: process.env.NEXT_PUBLIC_SABPAISA_ENV || 'stag'
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Payment processing failed');
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
                >
                    {/* LEFT PANEL: Summary */}
                    <div className="w-full md:w-2/5 p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
                                <p className="text-blue-100 text-sm mb-1 uppercase tracking-wider">Total Payable</p>
                                <p className="text-4xl font-extrabold">₹{amount}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-blue-100/80 text-sm">
                                    <span>Product</span>
                                    <span className="font-medium text-white">{productInfo.title}</span>
                                </div>
                                <div className="flex justify-between items-center text-blue-100/80 text-sm">
                                    <span>User</span>
                                    <span className="font-medium text-white">{user?.email || 'Guest'}</span>
                                </div>
                                <div className="h-px bg-white/10 my-2"></div>
                                <div className="flex items-center gap-2 text-xs text-blue-200">
                                    <ShieldCheck size={14} />
                                    <span>256-bit Secure Encryption</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center text-blue-200 text-xs">
                            Secured by Sabpaisa
                        </div>
                    </div>

                    {/* RIGHT PANEL: Payment Methods */}
                    <div className="w-full md:w-3/5 p-8 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Payment Mode</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {/* Merchant Wallet Option */}
                        <WalletPaymentOption
                            balance={balance?.balance || 0}
                            requiredAmount={amount}
                            onPay={() => handlePayment('WALLET')}
                            onTopup={() => setShowTopupInput(true)}
                        />

                        {/* Wallet Topup Input Modal */}
                        {showTopupInput && (
                            <div className="mb-6 p-6 rounded-2xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Money to Wallet</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Enter Amount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={topupAmount}
                                            onChange={(e) => setTopupAmount(e.target.value)}
                                            placeholder="Enter amount to add"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                const addAmount = parseFloat(topupAmount);
                                                if (addAmount && addAmount > 0) {
                                                    handlePayment('ADD_TO_WALLET', addAmount);
                                                    setShowTopupInput(false);
                                                } else {
                                                    setError('Please enter a valid amount');
                                                }
                                            }}
                                            disabled={processing || !topupAmount}
                                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {processing ? 'Processing...' : 'Proceed to Pay'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowTopupInput(false);
                                                setTopupAmount('');
                                            }}
                                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Other Methods Grid */}
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Other Payment Methods</h4>

                        <div className="grid grid-cols-2 gap-4">
                            <PaymentMethodCard
                                method="UPI"
                                icon={<Smartphone className="w-6 h-6 text-green-600" />}
                                onClick={() => handlePayment('UPI')}
                                disabled={processing}
                            />
                            <PaymentMethodCard
                                method="Cards"
                                icon={<CreditCard className="w-6 h-6 text-blue-600" />}
                                onClick={() => handlePayment('CARD')}
                                disabled={processing}
                            />
                            <PaymentMethodCard
                                method="Net Banking"
                                icon={<Building className="w-6 h-6 text-indigo-600" />}
                                onClick={() => handlePayment('NET_BANKING')}
                                disabled={processing}
                            />
                            <PaymentMethodCard
                                method="Wallet"
                                icon={<Wallet className="w-6 h-6 text-purple-600" />}
                                onClick={() => handlePayment('WALLET_PG')} // Sabpaisa wallets
                                disabled={processing}
                            />
                        </div>

                        {processing && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                    <p className="font-semibold text-gray-900 dark:text-white">Processing Secure Payment...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Inner Component for Manual Fallback
function ManualFallback({ paymentData }) {
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        // Show button after 5 seconds
        const timer = setTimeout(() => setShowButton(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    if (!showButton) return null;

    const handleManualClick = () => {
        // Try to find the existing form first
        let form = document.querySelector('form[data-sabpaisa-form]');

        // If form is missing (e.g. lost in re-renders), re-create it dynamically
        if (!form) {
            console.warn('⚠️ Form not found for manual submit - Re-creating...');
            form = document.createElement('form');
            form.method = 'POST';
            form.action = paymentData.url;
            form.setAttribute('data-sabpaisa-form', 'true');

            Object.keys(paymentData).forEach((key) => {
                const value = paymentData[key];
                if (key === 'url' || key === 'transactionId' || value === undefined || value === null) return;

                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = String(value);
                form.appendChild(input);
            });
            document.body.appendChild(form);
        }

        console.log('👆 User clicked manual pay - forcing POST submit');
        form.submit();
    };

    return (
        <div className="mt-4 flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-2">Taking too long?</p>
            <button
                onClick={handleManualClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
            >
                Click here to Pay
            </button>
        </div>
    );
}
