'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
    Check,
    CheckCircle2,
    Clock,
    RefreshCw,
    Truck,
    Package,
    ShieldCheck,
    CreditCard,
    Wallet as WalletIcon,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Copy,
    ExternalLink,
    Phone,
    MapPin,
    User,
    Sparkles,
    Radio,
    QrCode,
    Smartphone,
    HelpCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useWallet } from '@/hooks/useWallet';
import { usePayment } from '@/hooks/usePayment';
import NFC3DCard from '@/components/nfc/NFC3DCard';

// Real order status configuration mapping to database state machine
const ORDER_STATUS_MAP = {
    pending: {
        label: 'Order Confirmed',
        subtext: 'Payment received. Order queued for production.',
        color: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800/40',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/60',
        icon: Clock,
        stepIndex: 1
    },
    confirmed: {
        label: 'Order Confirmed',
        subtext: 'Payment verified. Queued for personalization.',
        color: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800/40',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/60',
        icon: CheckCircle2,
        stepIndex: 1
    },
    processing: {
        label: 'In Production',
        subtext: 'Your card is currently being laser-engraved and encoded.',
        color: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800/40',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
        icon: RefreshCw,
        stepIndex: 2
    },
    shipped: {
        label: 'Dispatched',
        subtext: 'Dispatched via logistics partner. In transit.',
        color: 'text-purple-700 dark:text-purple-300',
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        border: 'border-purple-200 dark:border-purple-800/40',
        badgeBg: 'bg-purple-100 dark:bg-purple-900/60',
        icon: Truck,
        stepIndex: 3
    },
    delivered: {
        label: 'Delivered & Active',
        subtext: 'Your card has been delivered and is ready for business.',
        color: 'text-emerald-700 dark:text-emerald-300',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-200 dark:border-emerald-800/40',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
        icon: CheckCircle2,
        stepIndex: 4
    }
};

const LIFECYCLE_STEPS = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'processing', label: 'Production' },
    { key: 'shipped', label: 'Dispatched' },
    { key: 'delivered', label: 'Delivered' }
];

export default function MerchantNFCServicePage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const supabase = createClient();
    const { balance: walletBalance, fetchBalance } = useWallet();
    const { initiatePayment } = usePayment();

    // Loading & Error States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Context & User data
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [merchant, setMerchant] = useState(null);
    const [kycStatus, setKycStatus] = useState(null);

    // Orders state
    const [activeOrder, setActiveOrder] = useState(null);
    const [ordersCount, setOrdersCount] = useState(0);

    // Pricing (Authoritative defaults matching nfc_settings)
    const [price, setPrice] = useState(2999);
    const [gstPercent, setGstPercent] = useState(18);
    const [deliveryPrice, setDeliveryPrice] = useState(220);

    // Form & Wizard state (for eligible order state)
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        cardHolderName: '',
        phone: '',
        deliveryAddress: ''
    });
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copiedOrderId, setCopiedOrderId] = useState(false);

    // Authoritative Calculations
    const gstAmount = (price * gstPercent) / 100;
    const sgst = gstAmount / 2;
    const cgst = gstAmount / 2;
    const totalAmount = price + gstAmount + deliveryPrice;
    const totalAmountPaise = Math.round(totalAmount * 100);

    // Data Fetcher
    const loadNfcData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
            if (authErr || !authUser) {
                throw new Error('Authentication session expired. Please log in again.');
            }
            setUser(authUser);

            // 1. Fetch Profile
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('id, full_name, phone, kyc_status, role')
                .eq('id', authUser.id)
                .maybeSingle();

            if (profile) {
                setUserProfile(profile);
                setKycStatus(profile.kyc_status);
            }

            // 2. Fetch Merchant Details
            const { data: merchantData } = await supabase
                .from('merchants')
                .select('id, business_name, business_address, business_phone, wallet_balance_paise')
                .eq('user_id', authUser.id)
                .maybeSingle();

            if (merchantData) {
                setMerchant(merchantData);
            }

            // Autofill form defaults if fields are empty
            setFormData(prev => ({
                cardHolderName: prev.cardHolderName || profile?.full_name || merchantData?.business_name || '',
                phone: prev.phone || profile?.phone || merchantData?.business_phone || '',
                deliveryAddress: prev.deliveryAddress || merchantData?.business_address || ''
            }));

            // 3. Fetch NFC Settings
            const { data: settingsData } = await supabase
                .from('nfc_settings')
                .select('key, value');

            if (settingsData && settingsData.length > 0) {
                const p = settingsData.find(s => s.key === 'card_price_paise');
                const g = settingsData.find(s => s.key === 'nfc_gst_percentage');
                const d = settingsData.find(s => s.key === 'nfc_delivery_price_paise');
                if (p) setPrice(parseInt(p.value, 10) / 100);
                if (g) setGstPercent(parseInt(g.value, 10));
                if (d) setDeliveryPrice(parseInt(d.value, 10) / 100);
            }

            // 4. Fetch User's NFC Orders
            const { data: orders, error: ordersErr } = await supabase
                .from('nfc_orders')
                .select('id, card_holder_name, phone, delivery_address, status, sale_price_paise, payment_status, payment_method, created_at, updated_at')
                .eq('user_id', authUser.id)
                .order('created_at', { ascending: false });

            if (ordersErr) {
                console.error('[NFC] Error loading orders:', ordersErr);
            } else if (orders) {
                setOrdersCount(orders.length);
                // Active order: paid order that is NOT cancelled
                const active = orders.find(o => o.payment_status === 'paid' && o.status !== 'cancelled');
                setActiveOrder(active || null);
            }

            // Refresh live wallet balance
            await fetchBalance();
        } catch (err) {
            console.error('[NFC] Load error:', err);
            setError(err.message || 'Unable to load your NFC card service details.');
        } finally {
            setLoading(false);
        }
    }, [supabase, fetchBalance]);

    useEffect(() => {
        loadNfcData();
    }, [loadNfcData]);

    const updateFormData = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: field === 'cardHolderName' ? value.toUpperCase() : value
        }));
    };

    const nextStep = () => {
        if (step === 1) {
            const cleanPhone = formData.phone.replace(/\D/g, '');
            if (!formData.cardHolderName.trim() || cleanPhone.length < 10 || !formData.deliveryAddress.trim()) {
                toast.error('Please enter a valid name, 10-digit phone, and delivery address.');
                return;
            }
        }
        setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const handleCopyOrderId = (id) => {
        if (!id) return;
        navigator.clipboard.writeText(id);
        setCopiedOrderId(true);
        toast.success('Order ID copied to clipboard');
        setTimeout(() => setCopiedOrderId(false), 2000);
    };

    // Form Submission & Payment Initiation
    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isSubmitting) return;

        if (!paymentMethod) {
            toast.error('Please select a payment method.');
            return;
        }

        const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
            toast.error('Please provide a valid 10-digit mobile number.');
            return;
        }

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
                    cardHolderName: formData.cardHolderName.trim(),
                    phone: cleanPhone,
                    deliveryAddress: formData.deliveryAddress.trim(),
                    salePricePaise: totalAmountPaise,
                    paymentMethod
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to initialize order');
            }

            if (paymentMethod === 'wallet') {
                setIsSuccess(true);
                toast.success('NFC Card ordered successfully via Wallet!');
                await loadNfcData();
            } else {
                toast.loading('Redirecting to secure payment gateway...', { id: 'pg-redirect' });
                try {
                    await initiatePayment({
                        amount: totalAmount,
                        payerName: formData.cardHolderName || userProfile?.full_name || 'Merchant',
                        payerEmail: user?.email || merchant?.business_email || 'merchant@intrustindia.com',
                        payerMobile: cleanPhone,
                        udf1: 'NFC_ORDER',
                        udf2: result.orderId,
                        udf3: formData.deliveryAddress.trim()
                    });
                } catch (err) {
                    toast.error(err.message || 'Payment initiation failed', { id: 'pg-redirect' });
                    setIsSubmitting(false);
                }
            }
        } catch (err) {
            console.error('[NFC] Order Error:', err);
            toast.error(err.message || 'Failed to complete order. Please try again.');
            setIsSubmitting(false);
        }
    };

    // Formatted currency helper
    const formatINR = (val) => {
        return Number(val).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // ─── LOADING SKELETON STATE ─────────────────────────────────
    if (loading) {
        return (
            <div className="relative pb-24 lg:pb-12 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                    <div className="space-y-2">
                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="h-4 w-72 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 h-[400px] flex items-center justify-center animate-pulse">
                            <div className="w-full max-w-[340px] aspect-[1.58/1] bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                        </div>
                    </div>
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 h-[400px] animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // ─── ERROR STATE ────────────────────────────────────────────
    if (error) {
        return (
            <div className="relative pb-24 lg:pb-12 max-w-2xl mx-auto my-12 text-center">
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Unable to Load NFC Service</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={loadNfcData}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all inline-flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" /> Try Again
                    </button>
                </div>
            </div>
        );
    }

    // ─── SUCCESS SCREEN (Wallet Payment) ────────────────────────
    if (isSuccess) {
        return (
            <div className="relative min-h-[75vh] flex items-center justify-center pb-24 lg:pb-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-lg mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 shadow-xl"
                >
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full">
                        Payment Successful
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-3 mb-2">Order Confirmed!</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                        Your InTrust NFC Smart Card order has been recorded. Our team will begin engraving and dispatching your card shortly.
                    </p>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2 mb-6">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Recipient</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.cardHolderName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Amount Paid</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{formatINR(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Payment Method</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">InTrust Wallet</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => { setIsSuccess(false); loadNfcData(); }}
                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            View Order Status <ArrowRight className="w-4 h-4" />
                        </button>
                        <Link
                            href="/merchant/dashboard"
                            className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Active Order status config
    const currentStatusConfig = activeOrder ? (ORDER_STATUS_MAP[activeOrder.status] || ORDER_STATUS_MAP.pending) : null;
    const StatusIcon = currentStatusConfig ? currentStatusConfig.icon : Clock;

    // ─── MAIN PAGE RENDER ───────────────────────────────────────
    return (
        <div className="relative pb-24 lg:pb-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/30">
                            Merchant Services
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Physical Card Solution</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        NFC Smart Card
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                        Your professional InTrust contactless digital business identity.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Link
                        href="/merchant/nfc-orders"
                        className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all inline-flex items-center gap-2 shadow-sm"
                    >
                        <Package className="w-4 h-4 text-slate-500" />
                        <span>My NFC Orders</span>
                        {ordersCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                {ordersCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* ─── LEFT COLUMN: 3D Card Preview & Specifications ─── */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Live Preview Container */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                    Live Card Preview
                                </p>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                Tap to flip
                            </span>
                        </div>

                        {/* Interactive 3D Card */}
                        <div className="flex justify-center py-2 pb-14">
                            <NFC3DCard
                                name={
                                    activeOrder?.card_holder_name ||
                                    formData.cardHolderName ||
                                    userProfile?.full_name ||
                                    merchant?.business_name ||
                                    'YOUR NAME'
                                }
                            />
                        </div>

                        {/* Card Features List */}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                            <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                <Radio className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <span><strong>NFC Tap-to-Share:</strong> One tap shares your InTrust store & profile on any smartphone.</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                <QrCode className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <span><strong>Dynamic QR Backup:</strong> Guaranteed compatibility for devices without NFC.</span>
                            </div>
                            <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                <Smartphone className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <span><strong>Zero App Required:</strong> Works automatically in native iOS & Android browsers.</span>
                            </div>
                        </div>
                    </div>

                    {/* Specifications Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Hardware Specifications
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase">Chipset</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">NTAG216 / ISO 14443A</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase">Material</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Matte Black Polymer</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase">Engraving</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Precision Laser Etched</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase">Durability</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Water & Scratch Proof</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── RIGHT COLUMN: Contextual Content ─── */}
                <div className="lg:col-span-7">
                    {/* SCENARIO A: ACTIVE ORDER EXISTS */}
                    {activeOrder ? (
                        <div className="space-y-6">
                            {/* Active Order Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
                                {/* Status Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border ${currentStatusConfig.bg} ${currentStatusConfig.color} ${currentStatusConfig.border}`}>
                                                <StatusIcon className="w-3.5 h-3.5 animate-spin-slow" />
                                                {currentStatusConfig.label}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                Order #{activeOrder.id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {currentStatusConfig.subtext}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleCopyOrderId(activeOrder.id)}
                                        className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                                    >
                                        {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedOrderId ? 'Copied' : 'Copy Order ID'}
                                    </button>
                                </div>

                                {/* Visual Progression Stepper */}
                                <div className="py-6">
                                    <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-4">
                                        Fulfillment Timeline
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {LIFECYCLE_STEPS.map((s, idx) => {
                                            const stepNum = idx + 1;
                                            const isComplete = currentStatusConfig.stepIndex > stepNum;
                                            const isCurrent = currentStatusConfig.stepIndex === stepNum;
                                            return (
                                                <div key={s.key} className="flex flex-col items-center text-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1.5 ${
                                                        isComplete
                                                            ? 'bg-emerald-600 text-white'
                                                            : isCurrent
                                                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                    }`}>
                                                        {isComplete ? <Check className="w-4 h-4" /> : stepNum}
                                                    </div>
                                                    <span className={`text-[11px] font-semibold ${
                                                        isCurrent
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : isComplete
                                                            ? 'text-slate-800 dark:text-slate-200'
                                                            : 'text-slate-400'
                                                    }`}>
                                                        {s.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Order & Delivery Summary Details */}
                                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex justify-between items-start text-xs">
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-slate-400" /> Cardholder
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                                            {activeOrder.card_holder_name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-start text-xs">
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone
                                        </span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {activeOrder.phone}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-start text-xs">
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Delivery Address
                                        </span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-right max-w-[60%] leading-relaxed">
                                            {activeOrder.delivery_address}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Amount Paid</span>
                                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                                            ₹{formatINR(activeOrder.sale_price_paise / 100)}
                                            <span className="text-[10px] font-normal text-slate-500 ml-1">
                                                via {activeOrder.payment_method === 'wallet' ? 'InTrust Wallet' : 'Online Payment'}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Order Placed On</span>
                                        <span className="font-medium text-slate-600 dark:text-slate-300">
                                            {new Date(activeOrder.created_at).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                                    <Link
                                        href="/merchant/nfc-orders"
                                        className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Package className="w-4 h-4" /> View All Orders
                                    </Link>
                                    <Link
                                        href="/contact"
                                        className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                                    >
                                        <HelpCircle className="w-4 h-4" /> Need Help?
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SCENARIO B: ELIGIBLE TO ORDER (Step Wizard) */
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
                            {/* Stepper Progress */}
                            <div className="flex items-center gap-2 mb-8">
                                {['Delivery', 'Review', 'Payment'].map((label, i) => {
                                    const s = i + 1;
                                    const isActive = step === s;
                                    const isDone = step > s;
                                    return (
                                        <div key={s} className="flex items-center gap-2 flex-1">
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full justify-center ${
                                                isActive
                                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                                                    : isDone
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                                                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 border border-slate-100 dark:border-slate-800'
                                            }`}>
                                                {isDone ? (
                                                    <Check className="w-3.5 h-3.5" />
                                                ) : (
                                                    <span className="w-4 h-4 rounded-full bg-current/10 flex items-center justify-center text-[10px]">
                                                        {s}
                                                    </span>
                                                )}
                                                <span>{label}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <form onSubmit={handleFormSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && step !== 3) e.preventDefault(); }}>
                                <AnimatePresence mode="wait">
                                    {/* STEP 1: DELIVERY LOGISTICS */}
                                    {step === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: 15 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -15 }}
                                            className="space-y-5"
                                        >
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                                                    Cardholder Name
                                                </label>
                                                <div className="relative">
                                                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                                    <input
                                                        type="text"
                                                        placeholder="Enter name to engrave on card"
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                                        value={formData.cardHolderName}
                                                        onChange={(e) => updateFormData('cardHolderName', e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-1">This name will be laser engraved onto the card face.</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                                                    Contact Mobile Number
                                                </label>
                                                <div className="relative">
                                                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                                    <input
                                                        type="tel"
                                                        placeholder="10-digit mobile number"
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                                        value={formData.phone}
                                                        onChange={(e) => updateFormData('phone', e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-1">For courier updates and delivery OTP.</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                                                    Delivery Address
                                                </label>
                                                <div className="relative">
                                                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                                    <textarea
                                                        rows={3}
                                                        placeholder="Full postal address including landmark, city and pincode"
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
                                                        value={formData.deliveryAddress}
                                                        onChange={(e) => updateFormData('deliveryAddress', e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={nextStep}
                                                disabled={!formData.cardHolderName.trim() || formData.phone.replace(/\D/g, '').length < 10 || !formData.deliveryAddress.trim()}
                                                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Review Order & Pricing <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* STEP 2: REVIEW & BREAKDOWN */}
                                    {step === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 15 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -15 }}
                                            className="space-y-5"
                                        >
                                            {/* Shipping Information Preview */}
                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Recipient Details</span>
                                                    <button type="button" onClick={() => setStep(1)} className="text-blue-600 hover:underline text-[11px]">Edit</button>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Name</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{formData.cardHolderName}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Phone</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{formData.phone}</span>
                                                </div>
                                                <div className="flex justify-between items-start">
                                                    <span className="text-slate-500">Address</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 text-right max-w-[65%]">{formData.deliveryAddress}</span>
                                                </div>
                                            </div>

                                            {/* Authoritative Price Breakdown */}
                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2.5">
                                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                                                    Order Summary & Taxes
                                                </p>
                                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                                                    <span>InTrust NFC Smart Card (1 Unit)</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">₹{formatINR(price)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                                                    <span>SGST ({gstPercent / 2}%)</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">₹{formatINR(sgst)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                                                    <span>CGST ({gstPercent / 2}%)</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">₹{formatINR(cgst)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                                                    <span>Insured Shipping & Packaging</span>
                                                    <span className="font-semibold text-emerald-600">₹{formatINR(deliveryPrice)}</span>
                                                </div>
                                                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Total Amount Payable</span>
                                                        <span className="text-[10px] text-slate-400">Inclusive of all taxes & delivery</span>
                                                    </div>
                                                    <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                                                        ₹{formatINR(totalAmount)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={prevStep}
                                                    className="py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={nextStep}
                                                    className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                >
                                                    Select Payment <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* STEP 3: PAYMENT METHOD */}
                                    {step === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: 15 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -15 }}
                                            className="space-y-5"
                                        >
                                            <div className="space-y-3">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                                    Choose Payment Method
                                                </label>

                                                {/* Wallet Payment Option */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('wallet')}
                                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between ${
                                                        paymentMethod === 'wallet'
                                                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2.5 rounded-xl ${paymentMethod === 'wallet' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                            <WalletIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-slate-900 dark:text-white">InTrust Wallet</span>
                                                                {kycStatus === 'verified' ? (
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                                                                        KYC Verified
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded">
                                                                        KYC Required
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                Available Balance: ₹{formatINR(walletBalance?.balance || 0)}
                                                            </p>
                                                            {(walletBalance?.balance_paise || 0) < totalAmountPaise && (
                                                                <p className="text-[11px] text-red-500 font-medium mt-1">
                                                                    Insufficient balance for this order.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {paymentMethod === 'wallet' && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                                                </button>

                                                {/* Online Gateway Option */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('online')}
                                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between ${
                                                        paymentMethod === 'online'
                                                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2.5 rounded-xl ${paymentMethod === 'online' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                            <CreditCard className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-sm text-slate-900 dark:text-white">Online Payment</span>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                UPI, Debit/Credit Card, Net Banking
                                                            </p>
                                                            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                                                <ShieldCheck className="w-3.5 h-3.5" /> 256-bit SSL Encrypted Payment Gateway
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {paymentMethod === 'online' && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={prevStep}
                                                    disabled={isSubmitting}
                                                    className="py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        isSubmitting ||
                                                        !paymentMethod ||
                                                        (paymentMethod === 'wallet' && (
                                                            (walletBalance?.balance_paise || 0) < totalAmountPaise ||
                                                            kycStatus !== 'verified'
                                                        ))
                                                    }
                                                    className="py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {isSubmitting ? (
                                                        <>
                                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                            <span>Processing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>Pay ₹{formatINR(totalAmount)}</span>
                                                            <Check className="w-3.5 h-3.5" />
                                                        </>
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

            {/* Delivery & Logistics Informational Notice */}
            <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 shrink-0 mt-0.5">
                    <Truck className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200 mr-1.5">
                        Dispatch & Fulfillment Policy:
                    </span>
                    Your InTrust NFC card is programmed, engraved, and handed over to our logistics partner within 3–5 business days. Standard surface delivery reaches your registered address within 25 working days from order confirmation depending on courier availability in your region.
                </div>
            </div>
        </div>
    );
}
