'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
    ArrowLeft,
    Calendar,
    Hash,
    Info,
    CreditCard,
    ArrowUpCircle,
    ArrowDownCircle,
    Clock,
    CheckCircle2,
    XCircle,
    Receipt,
    Wallet,
    Building2,
    Copy,
    ExternalLink,
    Share2,
    HelpCircle,
    FileText,
    Download
} from 'lucide-react';
import { generateOrderInvoice } from '@/lib/invoiceGenerator';
import { PLATFORM_CONFIG } from '@/lib/config/platform';
import toast from 'react-hot-toast';

export default function TransactionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { id } = params;
    const source = searchParams.get('source'); // 'wallet', 'merchant', 'payout'

    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copiedId, setCopiedId] = useState(false);

    const fetchTransactionDetails = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);

        try {
            // Fetch Transaction
            let data = null;
            let queryError = null;

            const isCart = id.startsWith('cart-');
            const actualId = isCart ? id.replace('cart-', '') : id;

            if (source === 'payout') {
                const { data: payout, error: err } = await supabase
                    .from('payout_requests')
                    .select('*')
                    .eq('id', actualId)
                    .single();
                data = payout;
                queryError = err;
            } else if (source === 'merchant') {
                if (isCart) {
                    // First fetch the base tx to get timestamp
                    const { data: baseTx, error: baseErr } = await supabase
                        .from('merchant_transactions')
                        .select('*')
                        .eq('id', actualId)
                        .single();

                    if (baseErr) throw baseErr;

                    // Fetch all txs from that exact cart checkout (same timestamp)
                    const { data: cartTxs, error: cartErr } = await supabase
                        .from('merchant_transactions')
                        .select('*, coupons(*)')
                        .eq('merchant_id', baseTx.merchant_id)
                        .eq('created_at', baseTx.created_at);

                    if (cartErr) throw cartErr;

                    // Fetch product titles for bulk items
                    const productIds = cartTxs.map(tx => tx.metadata?.product_id).filter(Boolean);
                    let productsMap = {};
                    if (productIds.length > 0) {
                        const { data: products, error: prodErr } = await supabase
                            .from('shopping_products')
                            .select('id, title')
                            .in('id', productIds);

                        if (prodErr) console.error("Error fetching shopping products:", prodErr);

                        if (products) {
                            productsMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
                        }
                    }

                    cartTxs.forEach(tx => {
                        const pId = tx.metadata?.product_id;
                        if (pId && productsMap[pId]) {
                            tx.product_details = productsMap[pId];
                        }
                    });

                    // Aggregate
                    const totalPaise = cartTxs.reduce((sum, tx) => sum + (tx.amount_paise || 0), 0);
                    data = {
                        ...baseTx,
                        id: id,
                        amount_paise: totalPaise,
                        // Use original description if it contains "Gateway Checkout", otherwise use bulk label
                        description: baseTx.description?.includes('Gateway Checkout')
                            ? baseTx.description
                            : 'Wholesale Bulk Purchase (Cart Checkout)',
                        cart_items: cartTxs
                    };
                    queryError = null;
                } else {
                    const { data: merchantTx, error: err } = await supabase
                        .from('merchant_transactions')
                        .select('*, coupons(*)')
                        .eq('id', actualId)
                        .single();
                    data = merchantTx;
                    queryError = err;

                    if (data && data.transaction_type === 'store_credit_payment' && data.metadata?.shopping_order_group_id) {
                        const groupId = data.metadata.shopping_order_group_id;

                        const [groupRes, itemsRes] = await Promise.all([
                            supabase
                                .from('shopping_order_groups')
                                .select('id, total_amount_paise, delivery_fee_paise, platform_cut_paise, merchant_profit_paise, commission_rate, payment_method')
                                .eq('id', groupId)
                                .single(),
                            supabase
                                .from('shopping_order_items')
                                .select('id, quantity, unit_price_paise, gst_amount_paise, commission_amount_paise, shopping_products(title)')
                                .eq('group_id', groupId)
                        ]);

                        if (!groupRes.error && !itemsRes.error && groupRes.data) {
                            data.store_credit_order = {
                                group: groupRes.data,
                                items: itemsRes.data
                            };
                        } else {
                            console.error('Error fetching store_credit_order details:', groupRes.error || itemsRes.error);
                        }
                    }
                }
            } else {
                const { data: walletTx, error: err } = await supabase
                    .from('wallet_transactions')
                    .select('*')
                    .eq('id', actualId)
                    .single();
                data = walletTx;
                queryError = err;
            }

            if (queryError) throw queryError;
            if (!data) throw new Error('Transaction not found');

            setTransaction(data);

        } catch (err) {
            console.error('Error fetching details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id, source]);


    useEffect(() => {
        fetchTransactionDetails();
    }, [fetchTransactionDetails]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    const handleDownloadInvoice = () => {
        if (!transaction) return;

        try {
            const isCart = transaction.cart_items && transaction.cart_items.length > 0;
            const isStoreCredit = transaction.store_credit_order != null;
            let formattedItems = [];

            if (isCart) {
                formattedItems = transaction.cart_items.map(item => {
                    const meta = item.parsedMetadata || item.metadata || {};
                    const qty = meta.quantity || 1;
                    const wholesaleAmount = meta.wholesale_amount_paise || 0;
                    const gstPct = meta.gst_percentage || 0;

                    return {
                        shopping_products: {
                            title: item.product_details?.title || 'Wholesale Product',
                            hsn_code: '9971',
                            gst_percentage: gstPct
                        },
                        quantity: qty,
                        unit_price_paise: wholesaleAmount / qty,
                        total_price_paise: wholesaleAmount // MUST be pre-tax since generator ADDS gst.
                    };
                });
            } else if (isStoreCredit) {
                formattedItems = transaction.store_credit_order.items.map(item => {
                    const gstPct = item.unit_price_paise > 0 && item.quantity > 0
                        ? Math.round((item.gst_amount_paise / (item.unit_price_paise * item.quantity)) * 100)
                        : 0;
                    return {
                        shopping_products: {
                            title: item.shopping_products?.title || 'Order Product',
                            hsn_code: '9971',
                            gst_percentage: gstPct
                        },
                        quantity: item.quantity,
                        unit_price_paise: item.unit_price_paise,
                        total_price_paise: item.unit_price_paise * item.quantity
                    };
                });
            }

            const mockOrder = {
                id: transaction.id,
                created_at: transaction.created_at,
                customer_name: "Merchant Partner",
                delivery_address: "Not Applicable",
                customer_phone: "",
                delivery_fee_paise: 0,
                // These are needed if it falls back to a gift card 
                amount: Math.abs(transaction.amount_paise || 0),
                brand: transaction.coupons?.brand || 'InTrust Gift Card'
            };

            generateOrderInvoice({
                order: mockOrder,
                items: formattedItems,
                seller: PLATFORM_CONFIG.business,
                type: (isCart || isStoreCredit) ? 'shopping' : 'giftcard'
            });
            toast.success("Invoice generated successfully");
        } catch (err) {
            console.error("Invoice generation error:", err);
            toast.error("Failed to generate invoice");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-6">
                <div className="relative w-16 h-16">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-[#D4AF37]/10 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-t-[#D4AF37] rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Authenticating details...</p>
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-black/20">
                <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6 border-4 border-red-100 dark:border-red-900/20">
                    <XCircle className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Transaction Unavailable</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-sm font-medium leading-relaxed">
                    {error || "The requested transaction record could not be retrieved from the ledger."}
                </p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-3 px-10 py-4 bg-slate-900 dark:bg-[#D4AF37] dark:text-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-slate-900/20 dark:shadow-[#D4AF37]/10"
                >
                    <ArrowLeft size={16} />
                    Go Back
                </button>
            </div>
        );
    }

    const isCredit = source === 'payout'
        ? (transaction.status === 'rejected' || transaction.status === 'refunded')
        : source === 'merchant'
            ? (transaction.amount_paise || 0) > 0
            : (transaction.transaction_type === 'CREDIT');

    const amount = source === 'payout'
        ? transaction.amount
        : source === 'merchant'
            ? Math.abs(transaction.amount_paise || 0) / 100
            : transaction.amount;

    const status = (source === 'payout' ? transaction.status : (transaction.status || 'COMPLETED')).toUpperCase();

    const getStatusTheme = (s) => {
        if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'GATEWAY_SUCCESS' || s === 'APPROVED' || s === 'RELEASED') return {
            bg: 'bg-emerald-500',
            text: 'text-emerald-500',
            icon: CheckCircle2,
            label: 'Success'
        };
        if (s === 'PENDING' || s === 'INITIATING' || s === 'IN_PROGRESS') return {
            bg: 'bg-amber-500',
            text: 'text-amber-500',
            icon: Clock,
            label: 'Pending'
        };
        return {
            bg: 'bg-red-500',
            text: 'text-red-500',
            icon: XCircle,
            label: 'Failed'
        };
    };

    const theme = getStatusTheme(status);

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24">
            {/* Minimal Mobile Navigation */}
            <div className="flex items-center justify-between py-6 sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-xl z-20 px-2 -mx-2 mb-2">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full shadow-sm dark:shadow-none border border-black/5 dark:border-white/5 transition-transform active:scale-95"
                >
                    <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
                </button>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-0.5 block">Official Ledger</span>
                    <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Transaction Record</h1>
                </div>
                <div className="flex items-center gap-2">
                    {source === 'merchant' && (
                        <button
                            onClick={handleDownloadInvoice}
                            title="Download Invoice"
                            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full shadow-sm dark:shadow-none border border-black/5 dark:border-white/5 hover:bg-slate-50 transition-colors"
                        >
                            <Download size={18} className="text-[#D4AF37]" />
                        </button>
                    )}
                    <button className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full shadow-sm dark:shadow-none border border-black/5 dark:border-white/5">
                        <Share2 size={18} className="text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Digital Receipt Card */}
            <div className="relative group perspective">
                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/20 to-transparent blur-3xl -z-10 opacity-30 dark:opacity-10 group-hover:opacity-50 transition-opacity"></div>

                <div className="bg-white dark:bg-slate-950 rounded-t-[2.5rem] p-8 sm:p-12 pb-16 text-center shadow-2xl shadow-slate-200/50 dark:shadow-none border-x border-t border-slate-100 dark:border-slate-800 relative z-10">
                    <div className="flex justify-center mb-8">
                        <div className={`relative px-4 py-1.5 rounded-full border-2 ${theme.text} bg-white dark:bg-slate-950 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-700`}>
                            <div className={`w-2 h-2 rounded-full ${theme.bg} animate-pulse shadow-[0_0_8px] shadow-${theme.text}`}></div>
                            {theme.label}
                        </div>
                    </div>

                    <div className="space-y-1 mb-10 overflow-hidden">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">{isCredit ? 'Received' : 'Paid'}</p>
                        <h2 className="text-5xl sm:text-7xl font-display font-black text-slate-900 dark:text-white flex items-baseline justify-center gap-1 group-hover:scale-105 transition-transform duration-500">
                            <span className="text-2xl sm:text-3xl font-bold opacity-30">₹</span>
                            {Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="bg-white dark:bg-slate-950 p-5 space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</p>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                                {new Date(transaction.created_at || transaction.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-5 space-y-1 text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</p>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">
                                {new Date(transaction.created_at || transaction.requested_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Receipt Cutout Effect */}
                <div className="relative h-6 bg-transparent overflow-hidden -mt-0.5">
                    <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1">
                        {[...Array(14)].map((_, i) => (
                            <div key={i} className="w-4 h-8 bg-white dark:bg-slate-950 rounded-full -mt-4 border border-slate-100 dark:border-slate-800 shadow-sm"></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="mt-12 space-y-10">
                {/* Meta details */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25rem]">System Audit</h3>
                        <div className="h-px flex-1 mx-6 bg-slate-200 dark:bg-slate-800"></div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {/* TXID */}
                            <div className="py-4 flex items-center justify-between group/row">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                        <Hash size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Reference ID</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tight transition-colors group-hover/row:text-[#D4AF37]">
                                            {id.slice(0, 16).toUpperCase()}...
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(id)}
                                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all hover:scale-105 active:scale-90 text-slate-400"
                                >
                                    {copiedId ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                </button>
                            </div>

                            {/* Method/Type */}
                            <div className="py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <CreditCard size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Activity Type</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {source?.toUpperCase()} · {transaction.transaction_type || transaction.reference_type || 'STANDARD ACTIVITY'}
                                    </p>
                                </div>
                                <div className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-md font-bold uppercase tracking-tight">Verified</div>
                            </div>

                            {/* Description */}
                            <div className="py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <Receipt size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Remark</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{transaction.description || 'System generated update'}</p>
                                </div>
                            </div>

                            {/* Balance After - if applicable */}
                            {(transaction.balance_after_paise || transaction.balance_after) && (
                                <div className="py-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/5 flex items-center justify-center text-[#D4AF37]">
                                        <Wallet size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest mb-0.5">New Balance</p>
                                        <p className="text-base font-black text-slate-900 dark:text-white">
                                            ₹{Number((transaction.balance_after_paise / 100) || transaction.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dynamic Asset Card */}
                {source === 'merchant' && transaction.cart_items && transaction.cart_items.length > 0 && (() => {
                    const subtotalPaise = transaction.cart_items.reduce((sum, item) => sum + (item.metadata?.wholesale_amount_paise || (item.amount_paise > 0 ? item.amount_paise : 0)), 0);
                    const gstPaise = transaction.cart_items.reduce((sum, item) => sum + (item.metadata?.gst_amount_paise || 0), 0);
                    const grandTotalPaise = subtotalPaise + gstPaise;

                    return (
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25rem] px-2">Cart Summary</h3>
                            <div className="space-y-3">
                                {transaction.cart_items.map(item => {
                                    const qty = item.metadata?.quantity || 1;
                                    const wholesaleAmount = (item.metadata?.wholesale_amount_paise || 0) / 100;
                                    const gstAmount = (item.metadata?.gst_amount_paise || 0) / 100;
                                    const title = item.product_details?.title || 'Unknown Product';
                                    const brand = item.product_details?.brand || 'Platform';

                                    return (
                                        <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center text-slate-900 dark:text-white font-black text-lg border border-slate-100 dark:border-slate-800">
                                                    {brand.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.2em] mb-0.5">{brand}</p>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title !== 'Unknown Product' ? title : (item.description || 'Order Item')}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Qty: {qty}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">
                                                    ₹{Number(wholesaleAmount > 0 ? wholesaleAmount : (item.amount_paise / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </p>
                                                {gstAmount > 0 && (
                                                    <>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">+ ₹{Number(gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })} SGST</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">+ ₹{Number(gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })} CGST</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Price Breakdown */}
                            <div className="bg-[#D4AF37]/5 rounded-2xl p-6 border border-[#D4AF37]/20 mt-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                        <span>Subtotal</span>
                                        <span>₹{(subtotalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                        <span>SGST</span>
                                        <span>₹{(gstPaise / 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                        <span>CGST</span>
                                        <span>₹{(gstPaise / 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-4" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                            Total {isCredit ? 'Received' : 'Paid'}
                                        </span>
                                        <span className="text-xl font-black text-[#D4AF37]">
                                            ₹{(grandTotalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {source === 'merchant' && transaction.store_credit_order && (() => {
                    const { group, items } = transaction.store_credit_order;
                    const subtotalPaise = items.reduce((sum, item) => sum + (item.unit_price_paise * item.quantity), 0);
                    const gstPaise = items.reduce((sum, item) => sum + item.gst_amount_paise, 0);
                    const deliveryPaise = group.delivery_fee_paise || 0;
                    const totalPaise = group.total_amount_paise || transaction.metadata?.gateway_amount_paise || 0;

                    return (
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25rem] px-2">Order Breakdown</h3>
                            <div className="space-y-3">
                                {items.map(item => {
                                    const title = item.shopping_products?.title || 'Unknown Product';
                                    return (
                                        <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center text-slate-900 dark:text-white font-black text-lg border border-slate-100 dark:border-slate-800">
                                                    {title.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Qty: {item.quantity}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">
                                                    ₹{Number(item.unit_price_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </p>
                                                {item.gst_amount_paise > 0 && (
                                                    <>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">+ ₹{Number(item.gst_amount_paise / 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })} SGST</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">+ ₹{Number(item.gst_amount_paise / 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })} CGST</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-[#D4AF37]/5 rounded-2xl p-6 border border-[#D4AF37]/20 mt-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                        <span>Product Subtotal</span>
                                        <span>₹{(subtotalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                        <span>SGST</span>
                                        <span>₹{(gstPaise / 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                        <span>CGST</span>
                                        <span>₹{(gstPaise / 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                        <span>Delivery Fee</span>
                                        <span>₹{(deliveryPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-4" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                            Total Charged
                                        </span>
                                        <span className="text-xl font-black text-[#D4AF37]">
                                            ₹{(totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">
                                            Merchant Received
                                        </span>
                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-500">
                                            ₹{((transaction.amount_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {source === 'merchant' && !transaction.cart_items && transaction.coupons && (
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25rem] px-2">Related Asset</h3>
                        <Link
                            href={`/merchant/inventory/${transaction.coupons.id}`}
                            className="block bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-transparent bg-[#F8FAFC] dark:bg-slate-900 rounded-[2.5rem] p-8 border border-[#D4AF37]/20 group transition-all hover:shadow-2xl hover:shadow-[#D4AF37]/10"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-white dark:bg-slate-950 rounded-3xl flex items-center justify-center text-slate-900 dark:text-white font-black text-3xl shadow-xl shadow-black/5 border border-slate-100 dark:border-slate-800 group-hover:rotate-6 transition-transform">
                                    {transaction.coupons.brand?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] mb-1">{transaction.coupons.brand}</p>
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">{transaction.coupons.title}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-500">Value: ₹{(transaction.coupons.face_value_paise / 100).toLocaleString('en-IN')}</span>
                                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                        <ExternalLink size={14} className="text-[#D4AF37]" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}
            </div>


            {/* Security Footer */}
            <div className="mt-10 py-12 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 grayscale opacity-30">
                    <img src="/icon.png" alt="Intrust Logo" className="h-4 dark:invert" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto leading-loose">
                    This document is an electronic record generated by the Intrust Secure Ledger. No signature is required.
                </p>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    .fixed, .sticky, button { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .max-w-2xl { max-width: 100% !important; }
                    .bg-slate-950 { background: white !important; color: black !important; }
                    .text-white { color: black !important; }
                    .shadow-2xl { box-shadow: none !important; }
                    .border { border: 1px solid #eee !important; }
                }
            `}</style>
        </div>
    );
}
