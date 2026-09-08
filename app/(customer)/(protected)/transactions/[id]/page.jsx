'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    Copy,
    Check,
    Download,
    Share2,
    Wallet,
    ShoppingBag,
    Gift,
    TrendingUp,
    Receipt,
    ShieldCheck,
    HelpCircle,
    ExternalLink,
    Building2,
    Calendar,
    Hash,
    ArrowUpRight,
    ArrowDownLeft,
    PhoneCall,
    Mail,
    Printer
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import toast from 'react-hot-toast';

export default function TransactionDetailPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const rawId = params?.id || '';
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    // Extract ID (strip wallet-, coupon-, or order- prefix if present)
    const normalizedId = useMemo(() => {
        if (!rawId) return '';
        if (rawId.startsWith('wallet-')) return rawId.replace('wallet-', '');
        if (rawId.startsWith('coupon-')) return rawId.replace('coupon-', '');
        if (rawId.startsWith('order-')) return rawId.replace('order-', '');
        return rawId;
    }, [rawId]);

    const isCouponType = rawId.startsWith('coupon-');

    useEffect(() => {
        if (!user && !authLoading) {
            router.push('/login');
            return;
        }

        if (!user || !normalizedId) return;

        async function loadTransaction() {
            setLoading(true);
            setError(null);
            try {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedId);

                // 1. Query coupons table (if coupon prefix or UUID)
                if (isCouponType || isUuid) {
                    const { data: coupon, error: couponError } = await supabase
                        .from('coupons')
                        .select('*, orders(*), merchants(business_name)')
                        .eq('id', normalizedId)
                        .maybeSingle();

                    if (!couponError && coupon) {
                        setTransaction({
                            id: `coupon-${coupon.id}`,
                            displayId: coupon.id,
                            rawDate: new Date(coupon.purchased_at || coupon.created_at).getTime(),
                            amount: (coupon.selling_price_paise || 0) / 100,
                            faceValue: (coupon.face_value_paise || 0) / 100,
                            type: 'DEBIT',
                            category: 'GIFT_CARD',
                            status: coupon.status === 'active' || coupon.status === 'used' ? 'success' : coupon.status,
                            title: coupon.title || coupon.brand || 'Brand Gift Card Voucher',
                            description: `Purchased digital voucher for ${coupon.brand || 'Brand'}`,
                            paymentMethod: coupon.orders?.payment_method || 'Online Payment (SabPaisa / UPI)',
                            brand: coupon.brand || 'Gift Card',
                            merchantName: coupon.merchants?.business_name || 'InTrust Digital Store',
                            referenceType: 'GIFT_CARD_PURCHASE',
                            referenceId: coupon.id,
                            linkUrl: '/my-giftcards'
                        });
                        setLoading(false);
                        return;
                    }
                }

                // 2. Query customer_wallet_transactions table (primary customer ledger)
                if (isUuid) {
                    const { data: cWalletTx, error: cWalletError } = await supabase
                        .from('customer_wallet_transactions')
                        .select('*')
                        .eq('id', normalizedId)
                        .maybeSingle();

                    if (!cWalletError && cWalletTx) {
                        const isCredit = ['TOPUP', 'CASHBACK', 'CREDIT', 'REFUND'].includes(cWalletTx.type);
                        setTransaction({
                            id: `wallet-${cWalletTx.id}`,
                            displayId: cWalletTx.id,
                            rawDate: new Date(cWalletTx.created_at).getTime(),
                            amount: (cWalletTx.amount_paise || 0) / 100,
                            type: isCredit ? 'CREDIT' : 'DEBIT',
                            category: cWalletTx.type,
                            status: 'success',
                            title: cWalletTx.type === 'TOPUP' ? 'Wallet Top-Up' :
                                   cWalletTx.type === 'CASHBACK' ? 'Cashback Rewarded' :
                                   cWalletTx.type === 'DEBIT' ? 'Wallet Payment' :
                                   cWalletTx.reference_type === 'UDHARI_PAYMENT' ? 'Store Credit Settled' : 'Digital Wallet Transaction',
                            description: cWalletTx.description || (isCredit ? 'Credit added to digital wallet' : 'Payment made from digital wallet'),
                            paymentMethod: cWalletTx.type === 'TOPUP' ? 'SabPaisa UPI / NetBanking' : 'InTrust Digital Wallet',
                            merchantName: 'InTrust Digital Wallet',
                            referenceType: cWalletTx.reference_type,
                            referenceId: cWalletTx.reference_id,
                            linkUrl: cWalletTx.reference_type === 'SHOPPING_ORDER' ? `/orders/${cWalletTx.reference_id}` : null
                        });
                        setLoading(false);
                        return;
                    }
                }

                // 3. Query SabPaisa / payment gateway transactions table
                let sabQuery = supabase.from('transactions').select('*');
                if (isUuid) {
                    sabQuery = sabQuery.or(`id.eq.${normalizedId},client_txn_id.eq.${normalizedId}`);
                } else {
                    sabQuery = sabQuery.eq('client_txn_id', normalizedId);
                }
                const { data: sabTx, error: sabError } = await sabQuery.maybeSingle();

                if (!sabError && sabTx) {
                    const isSuccess = sabTx.status === 'gateway_success' || sabTx.status === 'success';
                    const isCredit = sabTx.udf1 === 'WALLET_TOPUP';
                    setTransaction({
                        id: sabTx.client_txn_id || sabTx.id,
                        displayId: sabTx.client_txn_id || sabTx.txn_id || sabTx.id,
                        rawDate: new Date(sabTx.created_at).getTime(),
                        amount: Number(sabTx.amount || 0),
                        type: isCredit ? 'CREDIT' : 'DEBIT',
                        category: sabTx.udf1 || 'PAYMENT_GATEWAY',
                        status: isSuccess ? 'success' : (['failed', 'ERROR'].includes(sabTx.status) ? 'failed' : 'pending'),
                        title: sabTx.udf1 === 'WALLET_TOPUP' ? 'Wallet Top-Up' : 'Online Payment',
                        description: `Payment via ${sabTx.payment_mode || 'UPI / NetBanking'} • Status: ${sabTx.status}`,
                        paymentMethod: `SabPaisa Gateway (${sabTx.payment_mode || 'UPI / NetBanking'})`,
                        merchantName: 'SabPaisa Payment Gateway',
                        referenceType: 'PAYMENT_GATEWAY',
                        referenceId: sabTx.client_txn_id || sabTx.txn_id,
                        linkUrl: null
                    });
                    setLoading(false);
                    return;
                }

                // 4. Query legacy/merchant wallet_transactions table
                if (isUuid) {
                    const { data: walletTx, error: walletError } = await supabase
                        .from('wallet_transactions')
                        .select('*')
                        .eq('id', normalizedId)
                        .maybeSingle();

                    if (!walletError && walletTx) {
                        const isCredit = walletTx.type === 'TOPUP' || walletTx.type === 'CASHBACK';
                        setTransaction({
                            id: `wallet-${walletTx.id}`,
                            displayId: walletTx.id,
                            rawDate: new Date(walletTx.created_at).getTime(),
                            amount: (walletTx.amount_paise || 0) / 100,
                            type: isCredit ? 'CREDIT' : 'DEBIT',
                            category: walletTx.type,
                            status: 'success',
                            title: walletTx.type === 'TOPUP' ? 'Wallet Top-Up' :
                                   walletTx.type === 'CASHBACK' ? 'Cashback Rewarded' :
                                   walletTx.type === 'DEBIT' ? 'Wallet Payment' :
                                   walletTx.reference_type === 'UDHARI_PAYMENT' ? 'Store Credit Settled' : 'Transaction',
                            description: walletTx.description || (isCredit ? 'Credit added to digital wallet' : 'Debit from digital wallet'),
                            paymentMethod: walletTx.type === 'TOPUP' ? 'SabPaisa UPI / NetBanking' : 'InTrust Digital Wallet',
                            merchantName: 'InTrust Platform',
                            referenceType: walletTx.reference_type,
                            referenceId: walletTx.reference_id,
                            linkUrl: walletTx.reference_type === 'SHOPPING_ORDER' ? `/orders/${walletTx.reference_id}` : null
                        });
                        setLoading(false);
                        return;
                    }
                }

                // 5. Query shopping order groups
                if (isUuid) {
                    const { data: orderGroup, error: orderError } = await supabase
                        .from('shopping_order_groups')
                        .select('*, merchants(business_name)')
                        .eq('id', normalizedId)
                        .maybeSingle();

                    if (!orderError && orderGroup) {
                        setTransaction({
                            id: `order-${orderGroup.id}`,
                            displayId: orderGroup.id,
                            rawDate: new Date(orderGroup.created_at).getTime(),
                            amount: (orderGroup.total_amount_paise || 0) / 100,
                            type: 'DEBIT',
                            category: 'ORDER_PURCHASE',
                            status: orderGroup.status === 'completed' ? 'success' : orderGroup.status,
                            title: 'Bhopal Store Order Purchase',
                            description: `Order at ${orderGroup.merchants?.business_name || 'InTrust Bhopal Merchant Store'}`,
                            paymentMethod: 'InTrust Platform Checkout',
                            brand: orderGroup.merchants?.business_name || 'InTrust Store',
                            merchantName: orderGroup.merchants?.business_name || 'Verified InTrust Merchant',
                            referenceType: 'SHOPPING_ORDER',
                            referenceId: orderGroup.id,
                            linkUrl: `/orders/${orderGroup.id}`
                        });
                        setLoading(false);
                        return;
                    }
                }

                // 6. Query standard orders table
                if (isUuid) {
                    const { data: orderItem, error: orderItemErr } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', normalizedId)
                        .maybeSingle();

                    if (!orderItemErr && orderItem) {
                        setTransaction({
                            id: `order-${orderItem.id}`,
                            displayId: orderItem.id,
                            rawDate: new Date(orderItem.created_at).getTime(),
                            amount: Number(orderItem.amount || 0),
                            type: 'DEBIT',
                            category: 'ORDER_PAYMENT',
                            status: orderItem.payment_status === 'paid' ? 'success' : orderItem.payment_status,
                            title: 'Order Payment',
                            description: `Order reference #${orderItem.id.slice(0, 8)}`,
                            paymentMethod: orderItem.payment_method || 'Online Payment',
                            merchantName: 'InTrust Partner Store',
                            referenceType: 'ORDER',
                            referenceId: orderItem.id,
                            linkUrl: null
                        });
                        setLoading(false);
                        return;
                    }
                }

                setError('This transaction record could not be found or you may not have access to view it.');
            } catch (err) {
                console.warn('Could not load transaction detail:', err?.message || err);
                setError(err.message || 'Unable to retrieve transaction details');
            } finally {
                setLoading(false);
            }
        }

        loadTransaction();
    }, [user, authLoading, normalizedId, isCouponType, router]);

    const handleCopyId = () => {
        if (!transaction) return;
        navigator.clipboard.writeText(transaction.displayId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Transaction ID copied to clipboard');
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading || authLoading) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-12 space-y-6 animate-pulse">
                <div className="h-6 w-36 bg-surface-container-high rounded-xl" />
                <div className="h-72 bg-surface-container-high rounded-3xl" />
                <div className="h-40 bg-surface-container-high rounded-3xl" />
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto">
                    <AlertCircle size={28} />
                </div>
                <h2 className="text-lg font-black text-on-surface">Record Not Found</h2>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                    {error || 'This transaction reference does not exist or has been archived.'}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="/transactions"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                        <ArrowLeft size={14} />
                        <span>Back to Passbook</span>
                    </Link>
                    <a
                        href="tel:18002030052"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs border border-outline-variant/30 transition-all"
                    >
                        <PhoneCall size={14} className="text-amber-500" />
                        <span>Helpline: 1800-889-0199</span>
                    </a>
                </div>
            </div>
        );
    }

    const isCredit = transaction.type === 'CREDIT';
    const formattedDate = new Date(transaction.rawDate).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <CustomerBreadcrumbs
                items={[
                    { label: 'Wallet', href: '/wallet' },
                    { label: 'Passbook', href: '/transactions' },
                    { label: `TX #${transaction.displayId.slice(0, 8)}` }
                ]}
                className="mb-1"
            />

            {/* Back Bar & Print Action */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-1"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Passbook</span>
                </button>

                <div className="flex items-center gap-2 print:hidden">
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold border border-outline-variant/30 transition-all active:scale-95 cursor-pointer"
                        title="Print / Download Statement"
                    >
                        <Printer size={13} />
                        <span>Print Receipt</span>
                    </button>
                </div>
            </div>

            {/* ── PROFESSIONAL TRANSACTION RECEIPT CARD ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
            >
                {/* Official Receipt Header with InTrust Logo */}
                <div className="flex items-center justify-between pb-6 border-b border-outline-variant/20">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border border-outline-variant/30 flex items-center justify-center p-2 shadow-xs shrink-0">
                            <img
                                src="/logo.png"
                                alt="InTrust India"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-on-surface tracking-tight">InTrust India</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <ShieldCheck size={11} /> Verified
                                </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant font-medium">
                                Official Transaction Receipt &amp; Voucher
                            </p>
                        </div>
                    </div>

                    <div className="text-right hidden sm:block">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block">Status</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            Success (Settled)
                        </span>
                    </div>
                </div>

                {/* Amount & Transaction Status Hero */}
                <div className="py-6 text-center space-y-2 border-b border-dashed border-outline-variant/30">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-1 shadow-sm mx-auto">
                        {isCredit ? (
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <ArrowDownLeft size={24} strokeWidth={2.5} />
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-primary flex items-center justify-center">
                                <ArrowUpRight size={24} strokeWidth={2.5} />
                            </div>
                        )}
                    </div>

                    <h1 className={`text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${
                        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface'
                    }`}>
                        {isCredit ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h1>

                    <p className="text-sm font-extrabold text-on-surface">
                        {transaction.title}
                    </p>
                    <p className="text-xs text-on-surface-variant max-w-md mx-auto font-medium">
                        {transaction.description}
                    </p>
                </div>

                {/* Detailed Key-Value Breakdown Table */}
                <div className="py-5 space-y-3 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/10">
                        <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                            <Hash size={13} className="text-on-surface-variant/70" />
                            <span>Transaction Reference</span>
                        </span>
                        <div className="flex items-center gap-2 font-mono font-bold text-on-surface">
                            <span className="truncate max-w-[200px] sm:max-w-xs">{transaction.displayId}</span>
                            <button
                                onClick={handleCopyId}
                                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                title="Copy Reference ID"
                            >
                                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/10">
                        <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                            <Calendar size={13} className="text-on-surface-variant/70" />
                            <span>Timestamp (IST)</span>
                        </span>
                        <span className="font-bold text-on-surface">{formattedDate}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/10">
                        <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                            <Wallet size={13} className="text-on-surface-variant/70" />
                            <span>Payment Channel</span>
                        </span>
                        <span className="font-bold text-on-surface">{transaction.paymentMethod}</span>
                    </div>

                    {transaction.merchantName && (
                        <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/10">
                            <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                                <Building2 size={13} className="text-on-surface-variant/70" />
                                <span>Beneficiary / Merchant</span>
                            </span>
                            <span className="font-bold text-on-surface">{transaction.merchantName}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/10">
                        <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                            <ShieldCheck size={13} className="text-emerald-500" />
                            <span>Payment Security</span>
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">256-Bit Encrypted • RBI Compliant</span>
                    </div>
                </div>

                {/* Linked Order / Item CTA if available */}
                {transaction.linkUrl && (
                    <div className="pt-2 pb-4">
                        <Link
                            href={transaction.linkUrl}
                            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-primary font-bold text-xs uppercase tracking-wider border border-blue-500/20 transition-all active:scale-[0.98]"
                        >
                            <span>View Associated Order Details</span>
                            <ExternalLink size={13} />
                        </Link>
                    </div>
                )}

                {/* ── OFFICIAL COMPANY TOLL-FREE HELPLINE FOOTER ── */}
                <div className="mt-4 p-4 rounded-2xl bg-surface-container-low/80 border border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <PhoneCall size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-on-surface">Toll-Free Helpline</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    Mon–Sat, 9AM–7PM
                                </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant font-medium">
                                Have an issue with this transaction? Call us directly.
                            </p>
                        </div>
                    </div>

                    <a
                        href="tel:18002030052"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                    >
                        <PhoneCall size={13} />
                        <span>1800-889-0199</span>
                    </a>
                </div>
            </motion.div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 print:hidden">
                <Link
                    href="/transactions"
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs text-center border border-outline-variant/30 transition-all"
                >
                    Back to All Transactions
                </Link>

                <a
                    href="mailto:support@intrustindia.com?subject=Transaction%20Inquiry%20ID%20"
                    className="w-full sm:w-auto py-3 px-5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 border border-outline-variant/30 transition-all"
                >
                    <Mail size={14} />
                    <span>Email Support</span>
                </a>
            </div>
        </div>
    );
}
