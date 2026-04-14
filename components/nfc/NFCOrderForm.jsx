'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, ArrowRight, Phone, MapPin,
    Layers, Truck, Info, Star, Box, AlertCircle, CreditCard, Wallet as WalletIcon, Loader2, ShieldCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useWallet } from '@/hooks/useWallet';
import SabpaisaPaymentModal from '@/components/payment/SabpaisaPaymentModal';
import { toast } from 'react-hot-toast';

export default function NFCOrderForm({ setIsSuccess }) {
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
        window.scrollTo({ top: document.getElementById('nfc-order-section').offsetTop - 100, behavior: 'smooth' });
    };

    const prevStep = () => setStep(s => s - 1);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!user) { toast.error('Please sign in to continue.'); return; }
        if (!paymentMethod) { toast.error('Select a payment method.'); return; }
        setIsSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { toast.error('Session expired.'); setIsSubmitting(false); return; }

            const res = await fetch('/api/nfc/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    cardHolderName: formData.cardHolderName,
                    phone: formData.phone,
                    deliveryAddress: formData.deliveryAddress,
                    salePricePaise: totalAmountPaise,
                    paymentMethod,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Order failed');
                setIsSubmitting(false);
                return;
            }

            if (paymentMethod === 'wallet') {
                toast.success('Order placed! Paid via InTrust Wallet.');
                fetchBalance();
                if (setIsSuccess) setIsSuccess(true);
            } else {
                setPendingOrderId(data.orderId);
                setShowPaymentModal(true);
            }
        } catch (err) {
            toast.error('Something went wrong.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const stepLabels = ['Delivery', 'Review', 'Payment'];

    return (
        <div className={`w-full rounded-2xl border transition-all duration-500 p-6 sm:p-10 relative overflow-visible ${isDark
            ? "bg-[#111318] border-white/[0.06]"
            : "bg-white border-slate-200/80 shadow-lg shadow-slate-100"
            }`}>

            <div className="relative z-10">
                {/* Stepper */}
                <div className="flex items-center justify-between mb-10 px-2">
                    {stepLabels.map((label, i) => {
                        const s = i + 1;
                        const isActive = step === s;
                        const isComplete = step > s;
                        return (
                            <div key={s} className="flex items-center flex-1 last:flex-none">
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                                        isComplete ? "bg-blue-600 text-white" :
                                        isActive ? "bg-blue-600 text-white ring-4 ring-blue-600/20" :
                                        isDark ? "bg-white/[0.04] text-white/25 border border-white/[0.06]" : "bg-slate-100 text-slate-400 border border-slate-200"
                                    }`}>
                                        {isComplete ? <Check size={14} strokeWidth={3} /> : s}
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block ${
                                        isActive ? 'text-blue-600' :
                                        isComplete ? (isDark ? 'text-white/50' : 'text-slate-500') :
                                        isDark ? 'text-white/20' : 'text-slate-400'
                                    }`}>{label}</span>
                                </div>
                                {s < 3 && (
                                    <div className={`flex-1 h-[1.5px] mx-3 rounded-full transition-colors duration-300 ${
                                        step > s ? "bg-blue-600" : isDark ? "bg-white/[0.05]" : "bg-slate-200"
                                    }`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                <form
                    onSubmit={handleFormSubmit}
                    onKeyDown={(e) => { if (e.key === 'Enter' && step !== 3) e.preventDefault(); }}
                    className="relative z-10"
                >
                    <AnimatePresence mode="wait">
                        {/* Step 1 — Delivery */}
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6">
                                <div>
                                    <h3 className={`text-lg font-black uppercase tracking-tight italic mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Delivery Details</h3>
                                    <p className={`text-sm font-medium tracking-tight mb-5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Where should we deliver your Digital Business Card?</p>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Enter your name"
                                                className={`w-full h-14 px-5 rounded-xl outline-none transition-all text-sm font-black tracking-tight ${isDark
                                                    ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:bg-white/[0.06]"
                                                    : "bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                                                }`}
                                                value={formData.cardHolderName}
                                                onChange={(e) => updateFormData('cardHolderName', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="relative">
                                            <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                                            <input
                                                type="tel"
                                                placeholder="Phone number"
                                                className={`w-full h-14 pl-11 pr-5 rounded-xl outline-none transition-all text-sm font-black tracking-tight ${isDark
                                                    ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:bg-white/[0.06]"
                                                    : "bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                                                }`}
                                                value={formData.phone}
                                                onChange={(e) => updateFormData('phone', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="relative">
                                            <MapPin size={16} className={`absolute left-4 top-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                                            <textarea
                                                rows={3}
                                                placeholder="Full delivery address with pincode"
                                                className={`w-full pl-11 pr-5 py-4 rounded-xl outline-none transition-all text-sm font-bold tracking-tight resize-none ${isDark
                                                    ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:bg-white/[0.06]"
                                                    : "bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                                                }`}
                                                value={formData.deliveryAddress}
                                                onChange={(e) => updateFormData('deliveryAddress', e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <button type="button" onClick={nextStep} disabled={!formData.cardHolderName || !formData.phone || !formData.deliveryAddress} className="h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Review <ArrowRight size={16} /></button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2 — Review */}
                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6">
                                <div>
                                    <h3 className={`text-lg font-black uppercase tracking-tight italic mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Order Summary</h3>
                                    <p className={`text-sm font-medium tracking-tight mb-5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Review your order before proceeding to payment.</p>
                                </div>

                                {/* Order Details */}
                                <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                                    {/* Card Info */}
                                    <div className={`px-5 py-4 flex items-center justify-between ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                                        <div>
                                            <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Card for</p>
                                            <p className={`text-base font-black tracking-tight italic ${isDark ? 'text-white' : 'text-slate-900'}`}>{formData.cardHolderName}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>InTrust NFC</div>
                                    </div>

                                    {/* Price Breakdown */}
                                    <div className="px-5 py-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className={`text-sm font-medium tracking-tight ${isDark ? 'text-white/50' : 'text-slate-600'}`}>Card Price</span>
                                            <span className={`text-sm font-black italic ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{price}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-sm font-medium tracking-tight ${isDark ? 'text-white/50' : 'text-slate-600'}`}>GST ({gstPercent}%)</span>
                                            <span className={`text-sm font-black italic ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{gstAmount.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-sm font-medium tracking-tight ${isDark ? 'text-white/50' : 'text-slate-600'}`}>Delivery</span>
                                            <span className={`text-sm font-black italic ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{deliveryPrice}</span>
                                        </div>
                                        <div className={`border-t pt-3 flex justify-between items-center ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                                            <span className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Total</span>
                                            <span className="text-xl font-black italic text-blue-600">₹{totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={prevStep} className={`h-14 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-colors ${isDark ? "bg-white/[0.04] text-white/50 border-white/[0.06] hover:bg-white/[0.08]" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}>Back</button>
                                    <button type="button" onClick={nextStep} className="h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">Checkout <ArrowRight size={16} /></button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3 — Payment */}
                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6">
                                <div>
                                    <h3 className={`text-lg font-black uppercase tracking-tight italic mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Payment Method</h3>
                                    <p className={`text-sm font-medium tracking-tight mb-5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Choose how you'd like to pay ₹{totalAmount.toLocaleString()}</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Wallet Option */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={`p-5 rounded-xl border-2 text-left transition-all ${paymentMethod === 'wallet'
                                            ? 'border-blue-600 bg-blue-600/[0.05]'
                                            : isDark ? 'border-white/[0.06] bg-white/[0.02] hover:border-white/10' : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <WalletIcon size={20} className={paymentMethod === 'wallet' ? 'text-blue-600' : isDark ? 'text-white/30' : 'text-slate-400'} />
                                            {paymentMethod === 'wallet' && <Check className="text-blue-600" size={16} strokeWidth={3} />}
                                        </div>
                                        <p className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>InTrust Wallet</p>
                                        <p className={`text-xs font-bold tracking-tight ${isDark ? 'text-white/35' : 'text-slate-500'}`}>Bal: ₹{walletBalance ? parseFloat(walletBalance.balance).toLocaleString() : '0.00'}</p>
                                        {kycStatus !== 'verified' && (
                                            <p className="text-[9px] text-amber-500 font-black uppercase tracking-wider mt-2 flex items-center gap-1"><AlertCircle size={10} /> KYC Required</p>
                                        )}
                                    </button>

                                    {/* Online Option */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('online')}
                                        className={`p-5 rounded-xl border-2 text-left transition-all ${paymentMethod === 'online'
                                            ? 'border-blue-600 bg-blue-600/[0.05]'
                                            : isDark ? 'border-white/[0.06] bg-white/[0.02] hover:border-white/10' : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <CreditCard size={20} className={paymentMethod === 'online' ? 'text-blue-600' : isDark ? 'text-white/30' : 'text-slate-400'} />
                                            {paymentMethod === 'online' && <Check className="text-blue-600" size={16} strokeWidth={3} />}
                                        </div>
                                        <p className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Online Payment</p>
                                        <p className={`text-xs font-bold tracking-tight ${isDark ? 'text-white/35' : 'text-slate-500'}`}>UPI / Cards / Net Banking</p>
                                        <p className="text-[9px] text-blue-500 font-black uppercase tracking-wider mt-2 flex items-center gap-1"><ShieldCheck size={10} /> Secure Encryption</p>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={prevStep} className={`h-14 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-colors ${isDark ? "bg-white/[0.04] text-white/50 border-white/[0.06] hover:bg-white/[0.08]" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}>Back</button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !paymentMethod || (paymentMethod === 'wallet' && ((walletBalance?.balance_paise || 0) < totalAmountPaise || kycStatus !== 'verified'))}
                                        className="h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <>Place Order <Check size={16} strokeWidth={3} /></>}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>

                {/* Delivery Timeline Notice */}
                <div className={`mt-6 flex items-start gap-3 px-4 py-3.5 rounded-xl border ${
                    isDark
                        ? 'bg-amber-500/[0.05] border-amber-500/20 text-amber-400/80'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                    <Truck size={15} className={`mt-0.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <p className="text-[11px] font-bold leading-relaxed tracking-wide">
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
        </div>
    );
}
