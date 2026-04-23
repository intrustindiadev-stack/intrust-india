'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useWallet } from '@/hooks/useWallet';
import SabpaisaPaymentModal from '@/components/payment/SabpaisaPaymentModal';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import NFC3DCard from '@/components/nfc/NFC3DCard';

export default function MerchantNFCServicePage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const supabase = createClient();
    const { balance: walletBalance, fetchBalance } = useWallet();

    const [step, setStep] = useState(1);
    const [price, setPrice] = useState(999);
    const [gstPercent, setGstPercent] = useState(18);
    const [deliveryPrice, setDeliveryPrice] = useState(50);
    const [formData, setFormData] = useState({
        cardHolderName: '',
        phone: '',
        deliveryAddress: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [user, setUser] = useState(null);
    const [kycStatus, setKycStatus] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingOrderId, setPendingOrderId] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [hasExistingOrder, setHasExistingOrder] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                setUser(authUser);
                fetchBalance();
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('kyc_status')
                    .eq('id', authUser.id)
                    .single();
                if (profile) setKycStatus(profile.kyc_status);

                const { data: existingOrders } = await supabase
                    .from('nfc_orders')
                    .select('id')
                    .eq('user_id', authUser.id)
                    .eq('payment_status', 'paid');
                if (existingOrders && existingOrders.length > 0) {
                    setHasExistingOrder(true);
                }
            }
        };

        const fetchSettings = async () => {
            const { data } = await supabase.from('nfc_settings').select('*');
            if (data) {
                const p = data.find(s => s.key === 'card_price_paise');
                const g = data.find(s => s.key === 'nfc_gst_percentage');
                const d = data.find(s => s.key === 'nfc_delivery_price_paise');
                if (p) setPrice(parseInt(p.value) / 100);
                if (g) setGstPercent(parseInt(g.value));
                if (d) setDeliveryPrice(parseInt(d.value) / 100);
            }
        };

        init();
        fetchSettings();
    }, []);

    const gstAmount = (price * gstPercent) / 100;
    const totalAmount = price + gstAmount + deliveryPrice;
    const totalAmountPaise = Math.round(totalAmount * 100);

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
    };

    const nextStep = () => {
        if (step === 1 && (!formData.cardHolderName || !formData.phone || !formData.deliveryAddress)) return;
        setStep(s => s + 1);
    };
    const prevStep = () => setStep(s => s - 1);

    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated. Please log in.');

            const response = await fetch('/api/nfc/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    cardHolderName: formData.cardHolderName,
                    phone: formData.phone,
                    deliveryAddress: formData.deliveryAddress,
                    salePricePaise: totalAmountPaise,
                    paymentMethod
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to initialize order');

            if (paymentMethod === 'wallet') {
                setIsSuccess(true);
                toast.success("NFC Card ordered successfully via Wallet!");
            } else {
                setPendingOrderId(result.orderId);
                setShowPaymentModal(true);
            }
        } catch (err) {
            console.error('Order Error:', err);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const stepLabels = ['Delivery', 'Review', 'Payment'];

    // ─── SUCCESS SCREEN ─────────────────────────────────────────
    if (isSuccess) {
        return (
            <div className="relative min-h-[80vh] flex items-center justify-center">
                <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md mx-auto"
                >
                    <div className="w-20 h-20 bg-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto mb-6 gold-glow shadow-lg">
                        <span className="material-icons-round text-[#020617] text-4xl">verified</span>
                    </div>
                    <h2 className="font-display text-3xl font-bold text-slate-800 dark:text-white mb-2">Order Placed!</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                        Your InTrust NFC Card is being crafted. You'll receive tracking updates soon.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/merchant/dashboard" className="px-6 py-3 rounded-xl bg-[#D4AF37] text-[#020617] font-bold text-sm hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow">
                            <span className="material-icons-round text-sm">grid_view</span> Dashboard
                        </Link>
                        <button onClick={() => { setIsSuccess(false); setStep(1); setFormData({ cardHolderName: '', phone: '', deliveryAddress: '' }); setPaymentMethod(null); }} className="px-6 py-3 rounded-xl merchant-glass border border-black/5 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                            <span className="material-icons-round text-sm">replay</span> Order Another
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ─── MAIN PAGE ──────────────────────────────────────────────
    return (
        <div className="relative">
            {/* Background blurs */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2 text-slate-800 dark:text-slate-100">NFC Smart Card</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Order your premium InTrust NFC business card</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/merchant/nfc-orders" className="px-4 py-1.5 rounded-lg merchant-glass border border-black/5 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all inline-flex items-center gap-1.5">
                        <span className="material-icons-round text-sm">receipt_long</span> My Orders
                    </Link>
                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                        <span className="material-icons-round text-sm">contactless</span>
                        ₹{totalAmount.toLocaleString()} Total
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* ─── LEFT: Card Preview ────────────────────────── */}
                <div className="lg:col-span-2">
                    <div className="merchant-glass bg-white/60 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm sticky top-28">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Live Preview</p>
                        <div className="flex justify-center">
                            <NFC3DCard theme="light" />
                        </div>
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>Card Price</span><span className="font-bold text-slate-700 dark:text-slate-200">₹{price}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>GST ({gstPercent}%)</span><span className="font-bold text-slate-700 dark:text-slate-200">₹{gstAmount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>Delivery</span><span className="font-bold text-emerald-600">₹{deliveryPrice}</span>
                            </div>
                            <div className="border-t border-black/5 dark:border-white/10 pt-2 flex justify-between text-sm">
                                <span className="font-bold text-[#D4AF37]">Total</span>
                                <span className="font-bold text-slate-800 dark:text-white text-lg">₹{totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── RIGHT: Order Form ─────────────────────────── */}
                <div className="lg:col-span-3">
                    {hasExistingOrder ? (
                        <div className="merchant-glass bg-white/60 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-10 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-[#D4AF37]/10 text-[#D4AF37]">
                                <span className="material-icons-round text-3xl">check_circle</span>
                            </div>
                            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-800 dark:text-white mb-3">Card Already Ordered</h3>
                            <p className="text-sm font-medium tracking-tight text-slate-500 dark:text-slate-400 max-w-md">
                                You already have an active InTrust NFC card.
                            </p>
                        </div>
                    ) : (
                    <div>
                        {/* Stepper */}
                    <div className="flex items-center gap-2 mb-8">
                        {stepLabels.map((label, i) => {
                            const s = i + 1;
                            const isActive = step === s;
                            const isDone = step > s;
                            return (
                                <div key={s} className="flex items-center gap-2 flex-1">
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full justify-center ${
                                        isActive ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20' :
                                        isDone ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200/30' :
                                        'bg-white/50 dark:bg-white/5 text-slate-400 border border-black/5 dark:border-white/10'
                                    }`}>
                                        {isDone ? (
                                            <span className="material-icons-round text-sm">check_circle</span>
                                        ) : (
                                            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[10px]">{s}</span>
                                        )}
                                        <span className="hidden sm:inline">{label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <form
                        onSubmit={handleFormSubmit}
                        onKeyDown={(e) => { if (e.key === 'Enter' && step !== 3) e.preventDefault(); }}
                    >
                        <AnimatePresence mode="wait">
                            {/* Step 1: Logistics / Delivery */}
                            {step === 1 && (
                                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="merchant-glass bg-white/60 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
                                                <span className="material-icons-round text-[#D4AF37] text-sm align-middle mr-1">person</span>
                                                Your Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Enter your name"
                                                className="w-full px-4 py-4 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-800 dark:text-white font-semibold outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10 transition-all"
                                                value={formData.cardHolderName}
                                                onChange={(e) => updateFormData('cardHolderName', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
                                                <span className="material-icons-round text-[#D4AF37] text-sm align-middle mr-1">call</span>
                                                Contact Phone
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="+91 XXXXXXXXXX"
                                                className="w-full px-4 py-4 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-800 dark:text-white font-semibold outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10 transition-all"
                                                value={formData.phone}
                                                onChange={(e) => updateFormData('phone', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
                                                <span className="material-icons-round text-[#D4AF37] text-sm align-middle mr-1">location_on</span>
                                                Delivery Address
                                            </label>
                                            <textarea
                                                rows={3}
                                                placeholder="Full address with pincode"
                                                className="w-full px-4 py-4 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-800 dark:text-white font-semibold outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10 transition-all resize-none"
                                                value={formData.deliveryAddress}
                                                onChange={(e) => updateFormData('deliveryAddress', e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button type="button" onClick={nextStep} disabled={!formData.cardHolderName || !formData.phone || !formData.deliveryAddress} className="py-4 rounded-xl bg-[#D4AF37] text-[#020617] font-bold text-sm hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow disabled:opacity-30 disabled:cursor-not-allowed">
                                            Review Order <span className="material-icons-round text-sm">arrow_forward</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 2: Review */}
                            {step === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="merchant-glass bg-white/60 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <span className="material-icons-round text-[#D4AF37] text-sm">receipt_long</span>
                                            Order Summary
                                        </h3>

                                        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
                                            <div className="flex justify-between items-center px-4 py-3">
                                                <span className="text-xs text-slate-500">Cardholder</span>
                                                <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">{formData.cardHolderName}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3">
                                                <span className="text-xs text-slate-500">Phone</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formData.phone}</span>
                                            </div>
                                            <div className="flex justify-between items-start px-4 py-3">
                                                <span className="text-xs text-slate-500">Address</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-right max-w-[60%]">{formData.deliveryAddress}</span>
                                            </div>
                                        </div>

                                        <div className="bg-[#D4AF37]/5 rounded-xl border border-[#D4AF37]/10 p-4 space-y-2">
                                            <div className="flex justify-between text-xs"><span className="text-slate-500">Card Price</span><span className="font-bold text-slate-700 dark:text-slate-300">₹{price}</span></div>
                                            <div className="flex justify-between text-xs"><span className="text-slate-500">GST ({gstPercent}%)</span><span className="font-bold text-slate-700 dark:text-slate-300">₹{gstAmount.toFixed(0)}</span></div>
                                            <div className="flex justify-between text-xs"><span className="text-slate-500">Delivery</span><span className="font-bold text-emerald-600">₹{deliveryPrice}</span></div>
                                            <div className="border-t border-[#D4AF37]/10 pt-2 flex justify-between">
                                                <span className="text-xs font-bold text-[#D4AF37]">Total Payable</span>
                                                <span className="text-lg font-bold text-slate-800 dark:text-white">₹{totalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button type="button" onClick={prevStep} className="py-4 rounded-xl merchant-glass border border-black/5 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all">Back</button>
                                        <button type="button" onClick={nextStep} className="py-4 rounded-xl bg-[#D4AF37] text-[#020617] font-bold text-sm hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow">
                                            Proceed to Pay <span className="material-icons-round text-sm">arrow_forward</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Payment */}
                            {step === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="merchant-glass bg-white/60 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <span className="material-icons-round text-[#D4AF37] text-sm">payment</span>
                                            Select Payment Method
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button type="button" onClick={() => setPaymentMethod('wallet')}
                                                className={`p-5 rounded-xl border-2 text-left transition-all ${paymentMethod === 'wallet' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5'}`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`material-icons-round text-xl ${paymentMethod === 'wallet' ? 'text-[#D4AF37]' : 'text-slate-400'}`}>account_balance_wallet</span>
                                                    {paymentMethod === 'wallet' && <span className="material-icons-round text-[#D4AF37] text-sm">check_circle</span>}
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">InTrust Wallet</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">Bal: ₹{walletBalance ? parseFloat(walletBalance.balance).toLocaleString() : '0.00'}</p>
                                                {kycStatus !== 'verified' && (
                                                    <p className="text-[10px] text-amber-600 font-bold mt-2 flex items-center gap-1">
                                                        <span className="material-icons-round text-xs">warning</span> KYC Required
                                                    </p>
                                                )}
                                            </button>

                                            <button type="button" onClick={() => setPaymentMethod('online')}
                                                className={`p-5 rounded-xl border-2 text-left transition-all ${paymentMethod === 'online' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5'}`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`material-icons-round text-xl ${paymentMethod === 'online' ? 'text-[#D4AF37]' : 'text-slate-400'}`}>credit_card</span>
                                                    {paymentMethod === 'online' && <span className="material-icons-round text-[#D4AF37] text-sm">check_circle</span>}
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">Online Payment</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">UPI / Cards / Net Banking</p>
                                                <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                                    <span className="material-icons-round text-xs">lock</span> Secure Encryption
                                                </p>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button type="button" onClick={prevStep} className="py-4 rounded-xl merchant-glass border border-black/5 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all">Back</button>
                                        <button type="submit" disabled={isSubmitting || !paymentMethod || (paymentMethod === 'wallet' && ((walletBalance?.balance_paise || 0) < totalAmountPaise || kycStatus !== 'verified'))}
                                            className="py-4 rounded-xl bg-[#D4AF37] text-[#020617] font-bold text-sm hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <><span className="material-icons-round text-sm animate-spin">sync</span> Processing...</>
                                            ) : (
                                                <>Place Order <span className="material-icons-round text-sm">check</span></>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                    </div>
                    )}
                </div>
            </div>

            {/* Delivery Timeline Notice */}
            <div className={`mt-6 flex items-start gap-3 px-4 py-3.5 rounded-xl border ${
                isDark
                    ? 'bg-amber-500/[0.05] border-amber-500/20'
                    : 'bg-amber-50 border-amber-200'
            }`}>
                <span className={`material-icons-round text-sm mt-0.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>local_shipping</span>
                <p className={`text-[11px] font-bold leading-relaxed tracking-wide ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
                    <span className={`font-black uppercase tracking-widest ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                        Estimated Delivery:&nbsp;
                    </span>
                    Your InTrust NFC card will be dispatched within 3–5 business days and is expected to arrive at your registered delivery address within{' '}
                    <span className={`font-black ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>25 working days</span>{' '}
                    from the date of order confirmation. Delivery timelines may vary based on your location.
                </p>
            </div>

            {/* Payment Modal */}
            {user && (
                <SabpaisaPaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    amount={totalAmount}
                    user={user}
                    productInfo={{
                        id: pendingOrderId || 'nfc_generic',
                        title: `InTrust One (NFC) - for ${formData.cardHolderName}`,
                    }}
                    metadata={{
                        type: 'nfc_order',
                        orderId: pendingOrderId,
                        phone: formData.phone,
                        address: formData.deliveryAddress,
                        card_holder: formData.cardHolderName
                    }}
                    initialMethod={paymentMethod === 'wallet' ? 'intrust_wallet' : 'gateway'}
                />
            )}
        </div>
    );
}
