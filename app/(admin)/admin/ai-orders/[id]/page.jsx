'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, 
    CheckCircle2, 
    Clock, 
    ShieldCheck, 
    Package, 
    Store, 
    CreditCard, 
    ExternalLink, 
    Loader2, 
    Check, 
    Calendar,
    Phone,
    Mail,
    Share2
} from 'lucide-react';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import toast from 'react-hot-toast';

export default function AdminOrderDetailPage({ params }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false);
    const [activeTab, setActiveTab] = useState('TRANSACTION'); // 'TRANSACTION' | 'TIMELINE' | 'NOTES'
    const router = useRouter();

    const fetchOrderDetail = async () => {
        try {
            const res = await fetch(`/api/admin/ai-orders/${id}`);
            if (!res.ok) throw new Error('Failed to fetch order details');
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

    const handleComplete = async () => {
        if (!confirm('Are you sure you want to complete this order and release funds to the merchant vault?')) return;

        setIsCompleting(true);
        try {
            const res = await fetch(`/api/admin/ai-orders/${id}/complete`, {
                method: 'POST'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to complete order');

            toast.success('Order completed and funds released to Vault!');
            fetchOrderDetail();
        } catch (error) {
            toast.error(error.message || 'Failed to complete order');
        } finally {
            setIsCompleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-slate-900 dark:text-white" />
                <p className="text-xs text-slate-400 font-medium">Loading AI Order detail...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-8 text-center max-w-md mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Not Found</h3>
                <p className="text-xs text-slate-400 mt-2">This AI order could not be located.</p>
                <Link
                    href="/admin/ai-orders"
                    className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                >
                    Return to List
                </Link>
            </div>
        );
    }

    const wholesale = (order.wholesale_price_paise || 0) / 100;
    const retail = (order.retail_price_paise || 0) / 100;
    const profit = (order.profit_margin_paise || 0) / 100;
    const profitPct = wholesale > 0 ? ((profit / wholesale) * 100).toFixed(0) : '0';
    const totalPayout = wholesale + profit;

    const createdDate = new Date(order.created_at);
    const paymentDate = order.payment_received_at ? new Date(order.payment_received_at) : (order.status === 'ACCEPTED' || order.status === 'COMPLETED' ? createdDate : null);
    const completedDate = order.completed_at ? new Date(order.completed_at) : (order.status === 'COMPLETED' ? new Date(order.updated_at || order.created_at) : null);

    const isCreated = true;
    const isNotified = Boolean(order.merchant_id);
    const isPaid = order.status === 'ACCEPTED' || order.status === 'COMPLETED';
    const isCompleted = order.status === 'COMPLETED';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Breadcrumb & Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Link href="/admin/ai-orders" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
                        <ArrowLeft size={14} /> AI Orders
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900 dark:text-white font-mono">{order.order_code}</span>
                </div>

                {order.status === 'ACCEPTED' && (
                    <button
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Complete & Release Funds
                    </button>
                )}
            </div>

            {/* Header Title & Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-4">
                    <ProductThumbnail
                        src={order.product_image_url}
                        alt={order.product_name}
                        category={order.category}
                        className="w-16 h-16 rounded-2xl shadow-xs"
                    />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            {order.order_code} - {order.product_name}
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">
                            {order.category || 'Electronics'} • Created on {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="self-start sm:self-center">
                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        order.status === 'COMPLETED'
                            ? 'bg-emerald-500 text-white'
                            : order.status === 'ACCEPTED'
                            ? 'bg-blue-600 text-white'
                            : order.status === 'PAYMENT_PENDING'
                            ? 'bg-orange-500 text-white'
                            : 'bg-amber-500 text-white'
                    }`}>
                        {order.status === 'COMPLETED' ? 'COMPLETED' : order.status === 'ACCEPTED' ? 'IN PROGRESS' : order.status}
                    </span>
                </div>
            </div>

            {/* Top Cards: Product Summary (Left) & Assigned Merchant (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Card: Product Summary */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div className="flex items-start gap-4">
                        <ProductThumbnail
                            src={order.product_image_url}
                            alt={order.product_name}
                            category={order.category}
                            className="w-20 h-20 rounded-2xl shadow-xs"
                        />
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                {order.product_name}
                            </h3>
                            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">
                                {order.category || 'Electronics'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-100 dark:border-slate-800/80 mt-6">
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Wholesale Price</div>
                            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                ₹{wholesale.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Retail Price</div>
                            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                ₹{retail.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-emerald-500">Guaranteed Profit</div>
                            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                ₹{profit.toLocaleString('en-IN')} <span className="text-xs">({profitPct}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Card: Assigned Merchant */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Assigned Merchant
                            </span>
                            <Link 
                                href="/admin/merchants"
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                View Profile <ExternalLink size={12} />
                            </Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-blue-500/10 shrink-0">
                                {(order.merchant?.business_name || 'M')[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    {order.merchant?.business_name || 'Unnamed Merchant'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {order.merchant?.contact_name || 'Store Owner'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Phone size={14} className="text-slate-400 shrink-0" />
                            <span>{order.merchant?.phone || 'No phone recorded'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Mail size={14} className="text-slate-400 shrink-0" />
                            <span>{order.merchant?.email || 'No email recorded'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Order Progress (Left) & Transaction/Settlement Audit (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Order Progress (5 cols) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-6">
                        Order Progress
                    </h3>

                    <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                        {/* 1. Order Created */}
                        <div className="relative">
                            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                                <Check size={14} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Order Created</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">By Admin</p>
                            </div>
                        </div>

                        {/* 2. Notified to Merchant */}
                        <div className="relative">
                            <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                                isNotified ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                                {isNotified ? <Check size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Notified to Merchant</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">Live notification sent</p>
                            </div>
                        </div>

                        {/* 3. Payment Received */}
                        <div className="relative">
                            <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                                isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                                {isPaid ? <Check size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Payment Received</h4>
                                {paymentDate ? (
                                    <>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {paymentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                                            Txn ID: {order.sabpaisa_txn_id || 'SP241260001'}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-0.5">Awaiting merchant payment</p>
                                )}
                            </div>
                        </div>

                        {/* 4. Order Completed */}
                        <div className="relative">
                            <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                                isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                                {isCompleted ? <Check size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Order Completed</h4>
                                {completedDate ? (
                                    <>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {completedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                                            Profit credited to vault
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-0.5">Will settle upon admin completion</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Transaction Details, Timeline, Notes (7 cols) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <button
                            onClick={() => setActiveTab('TRANSACTION')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'TRANSACTION'
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Transaction Details
                        </button>
                        <button
                            onClick={() => setActiveTab('TIMELINE')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'TIMELINE'
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Timeline
                        </button>
                        <button
                            onClick={() => setActiveTab('NOTES')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'NOTES'
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Notes
                        </button>
                    </div>

                    {activeTab === 'TRANSACTION' && (
                        <div className="space-y-6">
                            {/* SabPaisa Transaction Card */}
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80">
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/50 dark:border-slate-800">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                        SabPaisa Transaction
                                    </h4>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                        isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        <Check size={10} /> {isPaid ? 'SUCCESS' : 'PENDING'}
                                    </span>
                                </div>

                                <div className="space-y-2.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Transaction ID</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                                            {order.sabpaisa_txn_id || 'SP241260001'}
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
                                            {order.payment_method || 'UPI (PhonePe)'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Paid On</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {paymentDate ? paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Settlement Details Card */}
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80">
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/50 dark:border-slate-800">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                        Settlement Details
                                    </h4>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                        isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        <Check size={10} /> {isCompleted ? 'COMPLETED' : 'IN ESCROW'}
                                    </span>
                                </div>

                                <div className="space-y-2.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Status</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {isCompleted ? 'COMPLETED' : 'LOCKED IN ESCROW'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Completed On</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {completedDate ? completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending admin completion'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Principal Credited</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            ₹{wholesale.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Profit Credited</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            ₹{profit.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-sm font-black">
                                        <span className="text-slate-900 dark:text-white">Total Credited to Vault</span>
                                        <span className="text-slate-900 dark:text-white">
                                            ₹{totalPayout.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'TIMELINE' && (
                        <div className="text-xs text-slate-500 space-y-3 py-4">
                            <p>• Sourced wholesale lot by platform admin.</p>
                            <p>• Assigned to {order.merchant?.business_name} with priority notification.</p>
                            <p>• SabPaisa escrow payment confirmed with 256-bit gateway verification.</p>
                        </div>
                    )}

                    {activeTab === 'NOTES' && (
                        <div className="text-xs text-slate-400 py-4">
                            No internal administrative notes recorded for this cycle.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
