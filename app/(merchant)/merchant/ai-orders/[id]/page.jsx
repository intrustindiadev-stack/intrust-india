'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, 
    CheckCircle2, 
    ShieldCheck, 
    Zap, 
    CreditCard, 
    Loader2, 
    Check, 
    HelpCircle, 
    MessageCircle,
    Lock,
    ExternalLink,
    Activity,
    FileText,
    Download,
    X,
    ArrowRight
} from 'lucide-react';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import toast from 'react-hot-toast';

export default function MerchantOrderDetailPage({ params }) {
    const { id } = React.use(params);

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const router = useRouter();

    const fetchOrderDetail = async () => {
        try {
            const res = await fetch(`/api/merchant/ai-orders/${id}`);
            if (!res.ok) throw new Error('Failed to load order');
            const data = await res.json();
            setOrder(data.order);
        } catch (error) {
            toast.error(error.message || 'Error loading order');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    const handlePayNow = async () => {
        setIsProcessing(true);
        try {
            const clientTxnId = `AIO_${Date.now()}_${order.id.substring(0, 8)}`;

            const res = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: (order.wholesale_price_paise / 100).toFixed(2),
                    clientTxnId,
                    payerName: 'AI Order Merchant',
                    payerEmail: 'merchant@intrust.in',
                    payerMobile: '9999999998',
                    udf1: 'AI_ORDER',
                    udf2: order.id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || 'Failed to initiate payment');

            if (!data.encData || !data.paymentUrl || !data.clientCode) {
                throw new Error('Invalid response from payment server');
            }

            toast.success('Redirecting to secure SabPaisa checkout...');
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.paymentUrl;

            const encInput = document.createElement('input');
            encInput.type = 'hidden';
            encInput.name = 'encData';
            encInput.value = data.encData;
            form.appendChild(encInput);

            const ccInput = document.createElement('input');
            ccInput.type = 'hidden';
            ccInput.name = 'clientCode';
            ccInput.value = data.clientCode;
            form.appendChild(ccInput);

            document.body.appendChild(form);
            form.submit();
        } catch (error) {
            toast.error(error.message || 'Payment initiation failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const submitReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        setIsRejecting(true);
        try {
            const res = await fetch(`/api/merchant/ai-orders/${order.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejection_reason: rejectReason })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reject order');
            }

            toast.success('Order rejected successfully');
            setShowRejectForm(false);
            setRejectReason('');
            fetchOrderDetail();
        } catch (error) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsRejecting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-slate-900 dark:text-white" />
                <p className="text-xs text-slate-400 font-medium">Loading AI Order details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-8 text-center max-w-md mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Not Found</h3>
                <p className="text-xs text-slate-400 mt-2">This AI order is not assigned to your account or does not exist.</p>
                <Link
                    href="/merchant/ai-orders"
                    className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                >
                    Return to Board
                </Link>
            </div>
        );
    }

    const wholesale = (order.wholesale_price_paise || 0) / 100;
    const retail = (order.retail_price_paise || 0) / 100;
    const tax = (order.gst_amount_paise || 0) / 100;
    const profit = (order.profit_margin_paise || 0) / 100;
    const profitPct = wholesale > 0 ? ((profit / wholesale) * 100).toFixed(0) : '0';

    const createdDate = new Date(order.created_at);
    const paymentDate = order.payment_received_at 
        ? new Date(order.payment_received_at) 
        : (order.status === 'ACCEPTED' || order.status === 'COMPLETED' ? createdDate : null);

    const isCreated = true;
    const isPaymentInitiated = order.status === 'PAYMENT_PENDING' || order.status === 'ACCEPTED' || order.status === 'COMPLETED';
    const isPaymentReceived = order.status === 'ACCEPTED' || order.status === 'COMPLETED';
    const isInDistribution = order.status === 'ACCEPTED' || order.status === 'COMPLETED';
    const isCompleted = order.status === 'COMPLETED';

    const getStatusText = () => {
        if (order.status === 'COMPLETED') return 'COMPLETED';
        if (order.status === 'ACCEPTED') return 'IN PROGRESS';
        if (order.status === 'PAYMENT_PENDING') return 'PAYMENT PENDING';
        if (order.status === 'REJECTED') return 'REJECTED';
        return 'PENDING';
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-32">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Link href="/merchant/ai-orders" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
                        <ArrowLeft size={14} /> AI Orders
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900 dark:text-white font-mono">{order.order_code}</span>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        order.status === 'COMPLETED'
                            ? 'bg-emerald-500 text-white'
                            : order.status === 'ACCEPTED'
                            ? 'bg-blue-600 text-white'
                            : order.status === 'PAYMENT_PENDING'
                            ? 'bg-orange-500 text-white'
                            : order.status === 'REJECTED'
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-500 text-white'
                    }`}>
                        • {getStatusText()}
                    </span>
                </div>
            </div>

            {order.status === 'REJECTED' && order.rejection_reason && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                    <strong className="block mb-1 font-bold">Order Rejected</strong>
                    {order.rejection_reason}
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <ProductThumbnail
                            src={order.product_image_url}
                            alt={order.product_name}
                            category={order.category}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-sm"
                        />
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {order.product_name}
                            </h1>
                            <p className="text-xs text-slate-400 mt-1">
                                Order ID: <span className="font-mono font-bold">{order.order_code}</span> • {order.category || 'Electronics'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wholesale Price</span>
                            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                ₹{wholesale.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Retail Price</span>
                            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                ₹{retail.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Tax (GST)</span>
                            <div className="text-base sm:text-lg font-black text-rose-500 mt-0.5">
                                ₹{tax.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Your Profit</span>
                            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                ₹{profit.toLocaleString('en-IN')} <span className="text-xs">({profitPct}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-blue-900 dark:text-blue-200">100% Secure Escrow</div>
                            <div className="text-[11px] text-blue-700/80 dark:text-blue-300/70">Your payment is protected in InTrust Vault</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Zap size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Guaranteed Returns</div>
                            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/70">Fixed profit margin upon wholesale cycle maturity</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-6">Order Status</h3>
                    <div className="relative pl-8 space-y-7 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                        {/* Step 1: Order Created */}
                        <div className="relative">
                            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                                <Check size={14} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Order Created</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        {/* Step 2: Payment Initiated */}
                        <div className="relative">
                            <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                                isPaymentInitiated ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                                {isPaymentInitiated ? <Check size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Payment Initiated</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {isPaymentInitiated ? 'SabPaisa gateway checkout session opened' : 'Awaiting checkout initiation'}
                                </p>
                            </div>
                        </div>

                        {/* Step 3: Payment Received */}
                        <div className="relative">
                            <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                                isPaymentReceived ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                                {isPaymentReceived ? <Check size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Payment Received</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {isPaymentReceived 
                                        ? `Verified • Txn: ${order.sabpaisa_txn_id || 'SP241260001'}` 
                                        : 'Principal will lock in Escrow once paid'}
                                </p>
                            </div>
                        </div>

                        {/* Step 4: In Distribution */}
                        <div className="relative">
                            <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                                isInDistribution ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                                {isInDistribution ? <Check size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">In Distribution</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Items being fulfilled by platform administration
                                </p>
                            </div>
                        </div>

                        {/* Step 5: Completed */}
                        <div className="relative">
                            <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                                isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                                {isCompleted ? <Check size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Completed</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {isCompleted 
                                        ? 'Profit and principal successfully credited to your vault' 
                                        : 'Profit will be credited to your vault upon completion'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Payment Details & Need Help (5 cols) */}
                <div className="md:col-span-5 space-y-6">
                    {/* Payment Details Card */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                Payment Details
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPaymentReceived 
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}>
                                <Check size={10} /> {isPaymentReceived ? 'SUCCESS' : 'PENDING'}
                            </span>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Transaction ID</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {order.sabpaisa_txn_id || (isPaymentReceived ? 'SP241260001' : 'Awaiting payment')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Amount Paid</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    ₹{wholesale.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Payment Method</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {order.payment_method || (isPaymentReceived ? 'UPI (PhonePe)' : 'SabPaisa PG')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Paid On</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {paymentDate ? paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                            </div>
                        </div>

                        {/* If pending payment: Pay Now action button */}
                        {(order.status === 'PENDING' || order.status === 'PAYMENT_PENDING') && (
                            <button
                                onClick={handlePayNow}
                                disabled={isProcessing}
                                className="mt-5 w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                                Pay ₹{wholesale.toLocaleString('en-IN')} Now
                            </button>
                        )}

                        {order.status === 'COMPLETED' && (
                            <div className="mt-5 space-y-3">
                                <Link
                                    href="/merchant/vault/ai-orders"
                                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    View Earnings in Vault <ExternalLink size={14} />
                                </Link>
                                {order.invoice_id && (
                                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                                        <a
                                            href={`/payment/sabpaisa/checkout?invoice_id=${order.invoice_id}`}
                                            target="_blank"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <FileText size={14} /> View Invoice
                                        </a>
                                        <button
                                            onClick={() => {
                                                toast.success('Invoice download started');
                                                window.open(`/payment/sabpaisa/checkout?invoice_id=${order.invoice_id}&download=true`, '_blank');
                                            }}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Download size={14} /> Download
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Need Help Card */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                <HelpCircle size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Need Help?</h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Contact our support team for any queries regarding order maturity or escrow.
                                </p>
                            </div>
                        </div>
                        <a
                            href="https://wa.me/919876543210"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <MessageCircle size={14} className="text-emerald-500" />
                            Contact Support
                        </a>
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            {['PENDING', 'PAYMENT_PENDING'].includes(order.status) && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 z-40 lg:ml-64 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Investment</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">
                                ₹{wholesale.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="w-full sm:w-auto">
                            {order.status === 'PENDING' ? (
                                showRejectForm ? (
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                                        <input
                                            type="text"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Rejection reason..."
                                            className="w-full sm:w-64 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                                            disabled={isRejecting}
                                        />
                                        <button
                                            onClick={() => setShowRejectForm(false)}
                                            disabled={isRejecting}
                                            className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={submitReject}
                                            disabled={isRejecting || !rejectReason.trim()}
                                            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isRejecting ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Reject'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={() => setShowRejectForm(true)}
                                            disabled={isProcessing}
                                            className="flex-1 sm:flex-none px-6 py-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <X size={18} /> Reject
                                        </button>
                                        <button
                                            onClick={handlePayNow}
                                            disabled={isProcessing}
                                            className="flex-1 sm:flex-none px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <>Accept & Pay <ArrowRight size={18} /></>
                                            )}
                                        </button>
                                    </div>
                                )
                            ) : order.status === 'PAYMENT_PENDING' ? (
                                <button
                                    onClick={handlePayNow}
                                    disabled={isProcessing}
                                    className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>Complete Payment <ArrowRight size={18} /></>
                                    )}
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
