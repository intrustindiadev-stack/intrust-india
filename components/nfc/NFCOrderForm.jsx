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

export default function NFCOrderForm({ onPreviewUpdate, setIsSuccess }) {
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
        setFormData(prev => {
            const next = { ...prev, [field]: value.toUpperCase() };
            if (onPreviewUpdate) onPreviewUpdate(next);
            return next;
        });
    };

    const nextStep = () => {
        if (step === 1 && !formData.cardHolderName) return;
        if (step === 2 && (!formData.phone || !formData.deliveryAddress)) return;
        setStep(s => s + 1);
        window.scrollTo({ top: document.getElementById('nfc-order-section').offsetTop - 100, behavior: 'smooth' });
    };

    const prevStep = () => setStep(s => s - 1);

    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated. Please log in.');

            // 1. Create the Pending Order
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
                // Wallet payment already handled on backend if successful
                setIsSuccess(true);
                toast.success("Identity Forge Complete. Wallet Synchronized.");
            } else {
                // Online Payment requires SabPaisa Modal
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

    return (
        <div className={`w-full rounded-[32px] sm:rounded-[48px] border transition-all duration-700 p-6 sm:p-12 relative overflow-visible ${isDark
            ? "bg-[#0a0c11]/80 backdrop-blur-3xl border-white/5 shadow-2xl"
            : "bg-white border-slate-200 shadow-xl shadow-slate-200/50"
            }`}>

            {/* Full Focus Ordering Wizard */}
            <div className="relative z-10">
                {/* Stepper Logic */}
                <div className="flex items-center justify-center gap-4 sm:gap-6 mb-12">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className="flex items-center gap-4 sm:gap-6">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-[10px] sm:text-[14px] font-black transition-all duration-700 ${step >= s
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                : isDark ? "bg-white/5 text-white/20 border border-white/5" : "bg-slate-100 text-slate-400 border border-slate-200"
                                }`}>
                                {step > s ? <Check size={18} strokeWidth={4} /> : s}
                            </div>
                            {s < 4 && <div className={`w-8 sm:w-12 h-[2.5px] rounded-full transition-colors duration-700 ${step > s ? "bg-blue-500" : isDark ? "bg-white/5" : "bg-slate-100"}`} />}
                        </div>
                    ))}
                </div>

                <form onSubmit={handleFormSubmit} className="relative z-10">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                                <div className="space-y-6 text-center sm:text-left">
                                    <label className={`block text-[11px] font-black uppercase tracking-[0.6em] mb-4 text-blue-500`}>1. Configuration</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            placeholder="HOLDER NAME"
                                            className={`w-full h-20 pl-8 pr-16 rounded-2xl outline-none transition-all font-black text-xl uppercase tracking-widest placeholder:text-slate-300/30 ${isDark ? "bg-black/40 border border-white/10 text-white focus:border-blue-500/50" : "bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-500"}`}
                                            value={formData.cardHolderName}
                                            onChange={(e) => updateFormData('cardHolderName', e.target.value)}
                                            required
                                            maxLength={18}
                                        />
                                        <div className={`absolute right-8 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/10' : 'text-slate-200'}`}>
                                            <Layers size={24} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                                        <Star size={12} className="text-blue-500" />
                                        <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest italic">Laser-Engraved Typography</span>
                                    </div>
                                </div>
                                <button type="button" onClick={nextStep} disabled={!formData.cardHolderName} className="w-full h-20 rounded-2xl bg-blue-600 text-white font-black text-[12px] uppercase tracking-[0.5em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-20">
                                    CONTINUE <ArrowRight size={20} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                                <div className="space-y-8">
                                    <label className={`block text-[11px] font-black uppercase tracking-[0.6em] text-blue-500`}>2. Logistics</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            placeholder="VERIFIED PHONE"
                                            className={`w-full h-20 pl-8 pr-16 rounded-2xl outline-none transition-all font-black text-xl tracking-tighter ${isDark ? "bg-black/40 border border-white/10 text-white focus:border-blue-500/50" : "bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-500"}`}
                                            value={formData.phone}
                                            onChange={(e) => updateFormData('phone', e.target.value)}
                                            required
                                        />
                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20"><Phone size={24} /></div>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            rows={3}
                                            placeholder="SECURE DELIVERY ADDRESS + PINCODE"
                                            className={`w-full p-8 rounded-3xl outline-none transition-all font-black text-[13px] tracking-widest leading-loose resize-none ${isDark ? "bg-black/40 border border-white/10 text-white focus:border-blue-500/50" : "bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-500"}`}
                                            value={formData.deliveryAddress}
                                            onChange={(e) => updateFormData('deliveryAddress', e.target.value)}
                                            required
                                        />
                                        <div className="absolute right-8 top-8 opacity-20"><MapPin size={24} /></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={prevStep} className={`h-20 rounded-2xl font-black text-[11px] uppercase tracking-widest border transition-all ${isDark ? "bg-white/5 text-white/40 border-white/10" : "bg-slate-50 text-slate-400 border-slate-200"}`}>BACK</button>
                                    <button type="button" onClick={nextStep} disabled={!formData.phone || !formData.deliveryAddress} className="h-20 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 shadow-xl">REVIEW <ArrowRight size={20} /></button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                                <div className={`p-10 rounded-[40px] border relative overflow-hidden transition-colors ${isDark ? "bg-blue-600/5 border-blue-500/20 shadow-inner" : "bg-slate-50 border-slate-200 shadow-sm"}`}>
                                    <div className="space-y-8 relative z-10">
                                        <div className={`flex justify-between items-end pb-8 border-b ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                                            <div>
                                                <p className={`text-[9px] font-black uppercase opacity-40 mb-2 tracking-[0.4em] ${isDark ? 'text-white' : 'text-slate-900'}`}>IDENTIFIER</p>
                                                <p className={`text-3xl font-black tracking-tighter uppercase italic ${isDark ? 'text-white' : 'text-slate-900'}`}>InTrust Elite</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-[9px] font-black uppercase opacity-40 mb-2 tracking-[0.4em] ${isDark ? 'text-white' : 'text-slate-900'}`}>PAYABLE</p>
                                                <p className="text-3xl font-black text-blue-600 italic">₹{totalAmount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-blue-600/5 border border-blue-500/10">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/60">Crafting</span>
                                                <span className="font-black italic">₹{price}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-blue-600/5 border border-blue-500/10">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/60">Protocol Tax (18%)</span>
                                                <span className="font-black italic">₹{gstAmount.toFixed(0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Global Courier</span>
                                                <span className="font-black italic text-emerald-500">₹{deliveryPrice}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={prevStep} className={`h-20 rounded-2xl font-black text-[11px] uppercase tracking-widest border transition-all ${isDark ? "bg-white/5 text-white/40 border-white/10" : "bg-slate-50 text-slate-400 border-slate-200"}`}>BACK</button>
                                    <button type="button" onClick={nextStep} className="h-20 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 shadow-xl transition-all">CHECKOUT <ArrowRight size={20} /></button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                                <div className="space-y-6">
                                    <label className={`block text-[11px] font-black uppercase tracking-[0.6em] text-blue-500`}>4. Settlement</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('wallet')}
                                            className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${paymentMethod === 'wallet' ? 'border-blue-500 bg-blue-500/10' : isDark ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-white'}`}
                                        >
                                            <div className="relative z-10 flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <WalletIcon size={24} className={paymentMethod === 'wallet' ? 'text-blue-500' : 'opacity-20'} />
                                                    {paymentMethod === 'wallet' && <Check className="text-blue-500" size={16} strokeWidth={4} />}
                                                </div>
                                                <div>
                                                    <p className="text-[12px] font-black uppercase tracking-widest">InTrust Wallet</p>
                                                    <p className="text-[10px] font-bold tracking-tighter opacity-40">Bal: ₹{walletBalance ? (walletBalance.balance).toLocaleString() : '0.00'}</p>
                                                </div>
                                                {kycStatus !== 'verified' && (
                                                    <div className="mt-2 text-[8px] font-black text-amber-500 uppercase flex items-center gap-1.5"><AlertCircle size={10} /> KYC Verified Only</div>
                                                )}
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('online')}
                                            className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${paymentMethod === 'online' ? 'border-blue-500 bg-blue-500/10' : isDark ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-white'}`}
                                        >
                                            <div className="relative z-10 flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <CreditCard size={24} className={paymentMethod === 'online' ? 'text-blue-500' : 'opacity-20'} />
                                                    {paymentMethod === 'online' && <Check className="text-blue-500" size={16} strokeWidth={4} />}
                                                </div>
                                                <div>
                                                    <p className="text-[12px] font-black uppercase tracking-widest">Gateway Access</p>
                                                    <p className="text-[10px] font-bold tracking-tighter opacity-40">UPI / Cards / Net Banking</p>
                                                </div>
                                                <div className="mt-2 text-[8px] font-black text-blue-500 uppercase flex items-center gap-1.5"><ShieldCheck size={10} /> Secure Encryption</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={prevStep} className={`h-20 rounded-2xl font-black text-[11px] uppercase tracking-widest border transition-all ${isDark ? "bg-white/5 text-white/40 border-white/10" : "bg-slate-50 text-slate-400 border-slate-200"}`}>BACK</button>
                                    <button type="submit" disabled={isSubmitting || (paymentMethod === 'wallet' && ((walletBalance?.balance_paise || 0) < totalAmountPaise || kycStatus !== 'verified'))} className="h-20 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 shadow-xl disabled:opacity-20">
                                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "FINALIZE PROTOCOL"}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>

                {/* Production Payment Modal Integration */}
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
