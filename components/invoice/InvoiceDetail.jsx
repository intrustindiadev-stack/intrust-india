'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ChevronLeft, 
    Receipt, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Copy, 
    ExternalLink, 
    ShieldAlert, 
    History, 
    Download, 
    Share2, 
    MessageSquare, 
    Building2, 
    User, 
    Calendar,
    DollarSign,
    Loader2,
    Send,
    Mail,
    Bell,
    RefreshCw,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';

export default function InvoiceDetail({ invoiceId, basePath = '/admin' }) {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [copied, setCopied] = useState(false);

    // Notification modal & action state
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendType, setSendType] = useState('INVOICE_RESENT');
    const [sendChannel, setSendChannel] = useState('EMAIL');
    const [customRecipient, setCustomRecipient] = useState('');
    const [sendingNotif, setSendingNotif] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [retryingId, setRetryingId] = useState(null);

    const fetchDetail = async () => {
        try {
            const res = await fetch(`/api/invoices/management/${invoiceId}`);
            const json = await res.json();
            
            if (res.ok && json.success) {
                setData(json.data);
            } else {
                toast.error(json.error || 'Failed to fetch invoice details');
                router.push(`${basePath}/invoice`);
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred loading invoice details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [invoiceId, basePath, router]);

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to CANCEL this invoice? This action cannot be undone and will permanently prevent payment collection.')) return;
        
        setCancelling(true);
        try {
            const res = await fetch(`/api/invoices/management/${invoiceId}/cancel`, {
                method: 'POST'
            });
            const json = await res.json();
            
            if (res.ok && json.success) {
                toast.success('Invoice cancelled successfully');
                await fetchDetail();
            } else {
                toast.error(json.error || 'Failed to cancel invoice');
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred while cancelling');
        } finally {
            setCancelling(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Payment link copied to clipboard');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownloadPdf = async () => {
        if (!data?.invoice) return;
        setDownloadingPdf(true);
        try {
            await generateInvoicePDF(data.invoice);
            toast.success('PDF invoice generated successfully');
        } catch (err) {
            console.error('PDF error:', err);
            toast.error('Failed to generate PDF');
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handleInTrustWhatsAppSend = async () => {
        if (!data?.invoice || sendingWhatsApp) return;
        const inv = data.invoice;
        if (inv.status === 'CANCELLED' || inv.status === 'VOID') {
            toast.error('Cannot send notification for cancelled or void invoice');
            return;
        }

        const notifType = inv.status === 'PAID' 
            ? 'PAYMENT_SUCCESS' 
            : (inv.status === 'PARTIALLY_PAID' ? 'DUE_SOON' : 'INVOICE_RESENT');

        setSendingWhatsApp(true);
        try {
            const res = await fetch(`/api/invoices/management/${invoiceId}/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notificationType: notifType,
                    channel: 'WHATSAPP'
                })
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success('Invoice sent via InTrust WhatsApp.');
                await fetchDetail();
            } else {
                toast.error(json.error || 'Failed to send invoice via InTrust WhatsApp');
            }
        } catch (err) {
            console.error(err);
            toast.error('Connection error sending invoice via WhatsApp');
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const handleSendNotification = async (e) => {
        e.preventDefault();
        setSendingNotif(true);

        try {
            const res = await fetch(`/api/invoices/management/${invoiceId}/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notificationType: sendType,
                    channel: sendChannel,
                    recipient: sendChannel === 'EMAIL' ? (customRecipient.trim() || undefined) : undefined
                })
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(json.message || (sendChannel === 'WHATSAPP' ? 'Invoice sent via InTrust WhatsApp.' : 'Notification queued successfully'));
                setShowSendModal(false);
                await fetchDetail();
            } else {
                toast.error(json.error || 'Failed to send notification');
            }
        } catch (err) {
            console.error(err);
            toast.error('Connection error sending notification');
        } finally {
            setSendingNotif(false);
        }
    };

    const handleRetryNotification = async (notificationId) => {
        setRetryingId(notificationId);
        try {
            const res = await fetch(`/api/invoices/management/${invoiceId}/notifications/${notificationId}/retry`, {
                method: 'POST'
            });
            const json = await res.json();

            if (res.ok && json.success) {
                toast.success('Notification retry dispatched');
                await fetchDetail();
            } else {
                toast.error(json.error || 'Failed to retry notification');
            }
        } catch (err) {
            console.error(err);
            toast.error('Connection error during retry');
        } finally {
            setRetryingId(null);
        }
    };

    const fmt = (valPaise) => ((valPaise || 0) / 100).toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    const maskRecipient = (recipient) => {
        if (!recipient) return 'N/A';
        if (recipient.includes('@')) {
            const [local, domain] = recipient.split('@');
            if (local.length <= 2) return `${local}***@${domain}`;
            return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
        }
        const clean = recipient.replace(/\D/g, '');
        if (clean.length >= 10) {
            return `+91 ${clean.slice(0, 2)}****${clean.slice(-4)}`;
        }
        return recipient;
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
                <p className="text-sm font-medium">Loading invoice workspace...</p>
            </div>
        );
    }

    if (!data || !data.invoice) return null;

    const { invoice, transactions = [], events = [], notifications = [] } = data;
    const paymentUrl = `${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intrustindia.com')}/pay/invoice/${invoice.public_payment_token}`;
    const amountDue = Math.max(0, (invoice.grand_total_paise || 0) - (invoice.amount_paid_paise || 0));
    const items = Array.isArray(invoice.items_snapshot) ? invoice.items_snapshot : [];

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'PAID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 size={13} className="text-emerald-600" /> PAID IN FULL
                    </span>
                );
            case 'PARTIALLY_PAID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock size={13} className="text-amber-600" /> PARTIALLY PAID
                    </span>
                );
            case 'CANCELLED':
            case 'VOID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                        <AlertCircle size={13} className="text-red-600" /> {status}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
                        <Receipt size={13} className="text-blue-600" /> ISSUED
                    </span>
                );
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Top Navigation & Actions Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link 
                        href={`${basePath}/invoice`} 
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
                        title="Back to invoices"
                    >
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                Invoice #{invoice.invoice_number}
                            </h1>
                            <StatusBadge status={invoice.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span>Created {new Date(invoice.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            {invoice.due_date && <span>• Due {new Date(invoice.due_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>}
                        </p>
                    </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
                    {/* Send / Resend / Reminder Action Button */}
                    {invoice.status !== 'CANCELLED' && invoice.status !== 'VOID' && (
                        <button
                            onClick={() => {
                                const defaultType = invoice.status === 'PAID' ? 'PAYMENT_SUCCESS' : invoice.status === 'PARTIALLY_PAID' ? 'DUE_SOON' : 'INVOICE_RESENT';
                                setSendType(defaultType);
                                setCustomRecipient(invoice.customer_snapshot?.email || '');
                                setShowSendModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors border border-indigo-200 shadow-sm"
                            title="Send customer notification"
                        >
                            <Send size={14} />
                            {invoice.status === 'PAID' ? 'Send Receipt' : invoice.status === 'PARTIALLY_PAID' ? 'Send Reminder' : 'Send / Resend'}
                        </button>
                    )}

                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors border border-slate-200 disabled:opacity-50"
                        title="Download official PDF"
                    >
                        {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Download PDF
                    </button>

                    <a 
                        href={paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors border border-slate-200"
                        title="Open customer-facing payment portal"
                    >
                        <ExternalLink size={14} /> Public Portal
                    </a>

                    <button 
                        onClick={() => copyToClipboard(paymentUrl)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#1e3a5f] rounded-xl font-bold text-xs transition-colors border border-blue-200"
                        title="Copy shareable payment URL"
                    >
                        <Copy size={14} /> {copied ? 'Copied Link' : 'Copy Link'}
                    </button>

                    {invoice.status !== 'CANCELLED' && invoice.status !== 'VOID' && (
                        <button 
                            onClick={handleInTrustWhatsAppSend}
                            disabled={sendingWhatsApp}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs transition-colors border border-emerald-200 disabled:opacity-50"
                            title="Send invoice via official InTrust WhatsApp Business number"
                        >
                            {sendingWhatsApp ? (
                                <>
                                    <Loader2 size={14} className="animate-spin text-emerald-700" />
                                    <span>Sending via InTrust WhatsApp...</span>
                                </>
                            ) : (
                                <>
                                    <MessageSquare size={14} />
                                    <span>Send via InTrust WhatsApp</span>
                                </>
                            )}
                        </button>
                    )}

                    {invoice.status === 'ISSUED' && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs transition-colors border border-red-200 disabled:opacity-50"
                            title="Cancel this invoice"
                        >
                            <AlertCircle size={14} /> {cancelling ? 'Cancelling...' : 'Cancel Invoice'}
                        </button>
                    )}
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">₹{fmt(invoice.grand_total_paise)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Subtotal: ₹{fmt(invoice.subtotal_paise)}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Collected</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">₹{fmt(invoice.amount_paid_paise)}</p>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5">
                        {invoice.paid_at ? `Paid on ${new Date(invoice.paid_at).toLocaleDateString('en-IN')}` : 'No payments settled yet'}
                    </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Due</p>
                    <p className={`text-2xl font-black mt-1 ${amountDue > 0 ? 'text-[#1e3a5f]' : 'text-slate-400'}`}>
                        ₹{fmt(amountDue)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {amountDue > 0 ? 'Awaiting customer payment' : 'Fully settled'}
                    </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taxes & GST</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">₹{fmt(invoice.tax_paise)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {invoice.discount_paise > 0 ? `Discount applied: ₹${fmt(invoice.discount_paise)}` : 'No discount applied'}
                    </p>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Parties, Line Items, Reconciliation, Notifications */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Billed To & Billed From */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <User size={13} />
                                    <span>Billed To (Customer)</span>
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm">
                                    {invoice.customer_snapshot?.name || 'Customer Name Not Specified'}
                                </h4>
                                <div className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                                    {invoice.customer_snapshot?.email && <p>Email: {invoice.customer_snapshot.email}</p>}
                                    {invoice.customer_snapshot?.phone && <p>Phone: {invoice.customer_snapshot.phone}</p>}
                                    {invoice.customer_snapshot?.address && <p>Address: {invoice.customer_snapshot.address}</p>}
                                    {invoice.customer_snapshot?.gst_number && (
                                        <p className="font-mono text-slate-800 font-semibold">GSTIN: {invoice.customer_snapshot.gst_number}</p>
                                    )}
                                </div>
                            </div>

                            <div className="md:border-l md:border-slate-100 md:pl-6">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    <Building2 size={13} />
                                    <span>Issuer (Seller)</span>
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm">
                                    {invoice.seller_snapshot?.company_name || invoice.seller_snapshot?.business_name || 'Intrust India'}
                                </h4>
                                <div className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                                    {invoice.seller_snapshot?.company_email && <p>Email: {invoice.seller_snapshot.company_email}</p>}
                                    {invoice.seller_snapshot?.company_phone && <p>Phone: {invoice.seller_snapshot.company_phone}</p>}
                                    {invoice.seller_snapshot?.gst_number && (
                                        <p className="font-mono text-slate-800 font-semibold">GSTIN: {invoice.seller_snapshot.gst_number}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Line Items */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Receipt size={16} className="text-[#1e3a5f]" />
                                Line Items ({items.length})
                            </h3>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                        <th className="py-3 px-4 w-12 text-center">#</th>
                                        <th className="py-3 px-4">Item & Description</th>
                                        <th className="py-3 px-4 w-20 text-center">HSN/SAC</th>
                                        <th className="py-3 px-4 w-16 text-center">Qty</th>
                                        <th className="py-3 px-4 w-24 text-right">Unit Price</th>
                                        <th className="py-3 px-4 w-28 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.length > 0 ? (
                                        items.map((item, idx) => {
                                            const unitPrice = item.unit_price_paise 
                                                ? item.unit_price_paise / 100 
                                                : (item.unit_price || 0);
                                            const lineTotal = item.total_paise 
                                                ? item.total_paise / 100 
                                                : (item.total || (unitPrice * (item.quantity || 1)));
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-bold text-slate-800">{item.name || item.description || 'Service Item'}</div>
                                                        {item.description && item.name && (
                                                            <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-mono text-slate-500">{item.hsn_sac || item.hsn || '-'}</td>
                                                    <td className="py-3 px-4 text-center font-medium text-slate-700">{item.quantity || item.qty || 1}</td>
                                                    <td className="py-3 px-4 text-right font-medium text-slate-700">₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    <td className="py-3 px-4 text-right font-bold text-slate-900">₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-4 text-center text-slate-400 italic">No line items stored</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Item Cards */}
                        <div className="sm:hidden p-4 space-y-3">
                            {items.length > 0 ? (
                                items.map((item, idx) => {
                                    const unitPrice = item.unit_price_paise 
                                        ? item.unit_price_paise / 100 
                                        : (item.unit_price || 0);
                                    const lineTotal = item.total_paise 
                                        ? item.total_paise / 100 
                                        : (item.total || (unitPrice * (item.quantity || 1)));
                                    return (
                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-slate-800">{item.name || item.description || 'Service Item'}</div>
                                                <div className="font-black text-slate-900">₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                            </div>
                                            <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                                                <span>Qty: {item.quantity || item.qty || 1} × ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                {item.hsn_sac && <span>HSN: {item.hsn_sac}</span>}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center text-xs text-slate-400 italic">No line items stored</p>
                            )}
                        </div>
                    </div>

                    {/* SabPaisa Payment Reconciliation Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <ShieldAlert size={16} className="text-[#1e3a5f]"/>
                                    SabPaisa Payment Reconciliation
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Authoritative records of gateway callbacks and transactions.</p>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                {transactions.length} Records
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                        <th className="py-3 px-4">Date & Time</th>
                                        <th className="py-3 px-4">Client Txn ID</th>
                                        <th className="py-3 px-4">SabPaisa Txn ID</th>
                                        <th className="py-3 px-4 text-right">Amount</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-6 text-center text-slate-400 text-xs italic">
                                                No payment attempts recorded for this invoice yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-50/50">
                                                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                                    {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-slate-700 font-medium">{tx.client_txn_id}</td>
                                                <td className="py-3.5 px-4 font-mono text-[#1e3a5f] font-medium">{tx.sabpaisa_txn_id || '-'}</td>
                                                <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                                                    {tx.paid_amount ? `₹${tx.paid_amount}` : `₹${fmt(tx.expected_amount_paise)}`}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {tx.status === 'gateway_success' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                            <CheckCircle2 size={11}/> SUCCESS
                                                        </span>
                                                    ) : tx.status === 'initiated' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                                            <Clock size={11}/> INITIATED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                                                            <AlertCircle size={11}/> {tx.status?.toUpperCase()}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Notification History Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Bell size={16} className="text-[#1e3a5f]"/>
                                    Notification Delivery History
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Automated customer notifications, reminders, and delivery statuses.</p>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                {notifications.length} Logs
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                        <th className="py-3 px-4">Timestamp</th>
                                        <th className="py-3 px-4">Notification Event</th>
                                        <th className="py-3 px-4">Channel</th>
                                        <th className="py-3 px-4">Recipient</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {notifications.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-6 text-center text-slate-400 text-xs italic">
                                                No automated customer notifications recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        notifications.map(n => {
                                            const isSent = n.status === 'SENT';
                                            const isFailed = n.status === 'FAILED';
                                            const isPending = n.status === 'PENDING';
                                            return (
                                                <tr key={n.id} className="hover:bg-slate-50/50">
                                                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                                        {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-slate-800">
                                                        {n.notification_type}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                                                            {n.channel === 'EMAIL' ? <Mail size={12} className="text-blue-500" /> : <MessageSquare size={12} className="text-emerald-500" />}
                                                            {n.channel}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-slate-600">
                                                        {maskRecipient(n.recipient)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        {isSent ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                                <CheckCircle2 size={11} /> SENT
                                                            </span>
                                                        ) : isFailed ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800" title={n.error_message || ''}>
                                                                <AlertCircle size={11} /> FAILED
                                                            </span>
                                                        ) : isPending ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                                                <Clock size={11} /> PENDING
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                                                {n.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        {isFailed && (
                                                            <button
                                                                onClick={() => handleRetryNotification(n.id)}
                                                                disabled={retryingId === n.id}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200 transition-colors disabled:opacity-50"
                                                                title="Retry failed dispatch"
                                                            >
                                                                <RefreshCw size={11} className={retryingId === n.id ? 'animate-spin' : ''} />
                                                                Retry
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Financial Summary & Chronological Audit Timeline */}
                <div className="space-y-6">
                    {/* Financial Summary Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
                            Payment Ledger
                        </h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span className="font-semibold text-slate-800">₹{fmt(invoice.subtotal_paise)}</span>
                            </div>
                            {invoice.discount_paise > 0 && (
                                <div className="flex justify-between text-emerald-600 font-medium">
                                    <span>Discount</span>
                                    <span>-₹{fmt(invoice.discount_paise)}</span>
                                </div>
                            )}
                            {invoice.tax_paise > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>GST / Taxes</span>
                                    <span className="font-semibold text-slate-800">₹{fmt(invoice.tax_paise)}</span>
                                </div>
                            )}
                            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                                <span>Grand Total</span>
                                <span>₹{fmt(invoice.grand_total_paise)}</span>
                            </div>
                            {invoice.amount_paid_paise > 0 && (
                                <div className="flex justify-between text-emerald-700 font-bold pt-1">
                                    <span>Amount Paid</span>
                                    <span>-₹{fmt(invoice.amount_paid_paise)}</span>
                                </div>
                            )}
                            <div className="border-t-2 border-slate-200 pt-2 flex justify-between items-center">
                                <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">Balance Due</span>
                                <span className={`text-base font-black ${amountDue > 0 ? 'text-[#1e3a5f]' : 'text-emerald-600'}`}>
                                    ₹{fmt(amountDue)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Chronological Audit Trail */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <History size={16} className="text-slate-500"/>
                                Audit Trail ({events.length})
                            </h3>
                        </div>
                        <div className="p-5">
                            {events.length === 0 ? (
                                <p className="text-center text-slate-400 text-xs italic py-4">No audit events recorded.</p>
                            ) : (
                                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                                    {events.map((evt) => {
                                        const isPaidEvt = evt.event_type === 'INVOICE_PAID';
                                        const isCancelEvt = evt.event_type === 'CANCELLED';
                                        const isNotifEvt = evt.event_type.startsWith('INVOICE_NOTIFICATION');
                                        return (
                                            <div key={evt.id} className="relative pl-6">
                                                <div className={`absolute -left-2 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                                                    isPaidEvt ? 'bg-emerald-500' : isCancelEvt ? 'bg-red-500' : isNotifEvt ? 'bg-indigo-500' : 'bg-blue-500'
                                                }`}></div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`text-[11px] font-black uppercase tracking-wider ${
                                                            isPaidEvt ? 'text-emerald-700' : isCancelEvt ? 'text-red-700' : isNotifEvt ? 'text-indigo-700' : 'text-blue-700'
                                                        }`}>
                                                            {evt.event_type}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(evt.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-700 leading-snug">{evt.description}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        By: {evt.actor?.full_name || evt.actor?.email || 'System'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Send / Resend Notification Modal */}
            {showSendModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative">
                        <button
                            onClick={() => setShowSendModal(false)}
                            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Send size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">
                                    {invoice.status === 'PAID' ? 'Send Official Receipt' : invoice.status === 'PARTIALLY_PAID' ? 'Send Balance Reminder' : 'Send Invoice to Customer'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Invoice #{invoice.invoice_number}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSendNotification} className="space-y-4">
                            {/* Notification Type Selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Notification Event
                                </label>
                                <select
                                    value={sendType}
                                    onChange={(e) => setSendType(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                >
                                    {invoice.status === 'PAID' ? (
                                        <option value="PAYMENT_SUCCESS">Payment Receipt (Paid in Full)</option>
                                    ) : invoice.status === 'PARTIALLY_PAID' ? (
                                        <>
                                            <option value="DUE_SOON">Upcoming Due Reminder</option>
                                            <option value="OVERDUE">Overdue Notice</option>
                                            <option value="INVOICE_RESENT">Resend Invoice Copy</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="INVOICE_RESENT">Send / Resend Invoice</option>
                                            <option value="DUE_SOON">Due Soon Reminder</option>
                                            <option value="OVERDUE">Overdue Reminder</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Channel Selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Delivery Channel
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSendChannel('EMAIL');
                                            setCustomRecipient(invoice.customer_snapshot?.email || '');
                                        }}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                                            sendChannel === 'EMAIL' 
                                                ? 'bg-blue-50 border-blue-500 text-[#1e3a5f]' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Mail size={16} /> Email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSendChannel('WHATSAPP');
                                            setCustomRecipient(invoice.customer_snapshot?.phone || '');
                                        }}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                                            sendChannel === 'WHATSAPP' 
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <MessageSquare size={16} /> WhatsApp
                                    </button>
                                </div>
                            </div>

                            {/* Recipient Input */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Recipient {sendChannel === 'EMAIL' ? 'Email Address' : 'Mobile Number'}
                                </label>
                                {sendChannel === 'WHATSAPP' ? (
                                    <div className="space-y-1.5">
                                        <input
                                            type="tel"
                                            readOnly
                                            value={invoice.customer_snapshot?.phone ? `+91 ${invoice.customer_snapshot.phone.replace(/\D/g, '').slice(-10)}` : 'No phone registered'}
                                            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed outline-none"
                                        />
                                        <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                                            <CheckCircle2 size={11} /> Sent from official InTrust WhatsApp Business number to customer registered phone.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="email"
                                            required
                                            value={customRecipient}
                                            onChange={(e) => setCustomRecipient(e.target.value)}
                                            placeholder="customer@example.com"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Defaults to customer snapshot email address.
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-3 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSendModal(false)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingNotif}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                                >
                                    {sendingNotif ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    Confirm & Send
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
