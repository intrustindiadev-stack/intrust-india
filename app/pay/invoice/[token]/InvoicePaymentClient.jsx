'use client';

import { useState } from 'react';
import { 
    ShieldCheck, 
    Receipt, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    Download, 
    Share2, 
    Copy, 
    Check, 
    Calendar, 
    Building2, 
    User,
    CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';

export default function InvoicePaymentClient({ invoice }) {
    const initialPhone = (invoice.customer_snapshot?.phone || '').replace(/\D/g, '').slice(-10);
    const [payerName, setPayerName] = useState(invoice.customer_snapshot?.name || '');
    const [payerEmail, setPayerEmail] = useState(invoice.customer_snapshot?.email || '');
    const [payerMobile, setPayerMobile] = useState(initialPhone);
    
    const [loading, setLoading] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [copied, setCopied] = useState(false);

    const fmt = (valPaise) => ((valPaise || 0) / 100).toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
    
    const amountDue = Math.max(0, (invoice.grand_total_paise || 0) - (invoice.amount_paid_paise || 0));
    const isPayable = (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID') && amountDue > 0;
    const isPaid = invoice.status === 'PAID' || (invoice.amount_paid_paise >= invoice.grand_total_paise && invoice.grand_total_paise > 0);
    const isCancelled = invoice.status === 'CANCELLED' || invoice.status === 'VOID';

    // Format items snapshot
    const items = Array.isArray(invoice.items_snapshot) ? invoice.items_snapshot : [];

    // Copy Payment Link
    const handleCopyLink = async () => {
        try {
            const url = typeof window !== 'undefined' ? window.location.href : '';
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('Payment link copied to clipboard!');
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    // Share Invoice
    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const title = `Invoice #${invoice.invoice_number} - Intrust India`;
        const text = `Invoice #${invoice.invoice_number} from Intrust India for ₹${fmt(amountDue > 0 ? amountDue : invoice.grand_total_paise)}. View & Pay here: ${url}`;

        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    handleCopyLink();
                }
            }
        } else {
            // WhatsApp Web fallback
            const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
            window.open(waUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Download PDF
    const handleDownloadPdf = async () => {
        setDownloadingPdf(true);
        try {
            await generateInvoicePDF(invoice);
            toast.success('Invoice downloaded successfully');
        } catch (err) {
            console.error('PDF error:', err);
            toast.error('Failed to generate PDF. Please try again.');
        } finally {
            setDownloadingPdf(false);
        }
    };

    // Initiate Payment
    const handlePayment = async (e) => {
        e.preventDefault();
        
        if (!isPayable) {
            toast.error('This invoice is not available for payment');
            return;
        }

        if (!payerName.trim() || !payerEmail.trim() || !payerMobile.trim()) {
            toast.error('Please provide complete payer contact details');
            return;
        }

        // Basic phone validation (10 digits)
        const cleanPhone = payerMobile.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
            toast.error('Please enter a valid 10-digit mobile number');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`/api/invoices/${invoice.public_payment_token}/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payerName: payerName.trim(),
                    payerEmail: payerEmail.trim(),
                    payerMobile: cleanPhone
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || data.message || 'Payment initiation failed');
                setLoading(false);
                return;
            }

            // Create a form dynamically and submit it to SabPaisa
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.paymentUrl;

            const encDataInput = document.createElement('input');
            encDataInput.type = 'hidden';
            encDataInput.name = 'encData';
            encDataInput.value = data.encData;
            form.appendChild(encDataInput);

            const clientCodeInput = document.createElement('input');
            clientCodeInput.type = 'hidden';
            clientCodeInput.name = 'clientCode';
            clientCodeInput.value = data.clientCode;
            form.appendChild(clientCodeInput);

            document.body.appendChild(form);
            form.submit();
            
        } catch (error) {
            console.error('Payment error:', error);
            toast.error('An unexpected connection error occurred. Please try again.');
            setLoading(false);
        }
    };

    // Status Badge Component
    const renderStatusBadge = () => {
        switch (invoice.status) {
            case 'PAID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 size={13} className="text-emerald-600" /> PAID IN FULL
                    </span>
                );
            case 'PARTIALLY_PAID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-amber-100 text-amber-800 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> PARTIALLY PAID
                    </span>
                );
            case 'CANCELLED':
            case 'VOID':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-red-100 text-red-800 border border-red-300">
                        <AlertCircle size={13} className="text-red-600" /> {invoice.status}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-blue-100 text-blue-800 border border-blue-300">
                        <Receipt size={13} className="text-blue-600" /> ISSUED
                    </span>
                );
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 transition-all">
            {/* Top Brand Header */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#0a1b33] p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="font-black text-xl tracking-tight text-white flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-400 inline-block shadow-sm shadow-blue-400"></span>
                                INTRUST INDIA
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-widest bg-white/15 px-2 py-0.5 rounded text-blue-100">
                                Invoice Portal
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-white">
                            Invoice #{invoice.invoice_number}
                        </h1>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end gap-2">
                        {renderStatusBadge()}
                        <div className="text-xs text-blue-200 font-medium flex items-center gap-1.5">
                            <Calendar size={13} />
                            <span>Dated: {new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {invoice.due_date && (
                            <div className="text-xs text-blue-200 font-medium">
                                Due: {new Date(invoice.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2 relative z-10">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold rounded-xl transition-all border border-white/20 disabled:opacity-50"
                        title="Download official PDF copy"
                    >
                        {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Download Invoice
                    </button>

                    <button
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold rounded-xl transition-all border border-white/20"
                        title="Copy payment link"
                    >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy Link'}
                    </button>

                    <button
                        onClick={handleShare}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold rounded-xl transition-all border border-white/20"
                        title="Share invoice link"
                    >
                        <Share2 size={14} />
                        Share
                    </button>
                </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
                {/* State Alerts */}
                {isPaid && (
                    <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="text-emerald-600" size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-900 text-base">Payment Completed</h3>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                    {invoice.paid_at ? (
                                        <>Paid on <strong>{new Date(invoice.paid_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></>
                                    ) : (
                                        <>This invoice has been fully settled. Thank you for your payment!</>
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <Download size={14} /> Download Receipt
                        </button>
                    </div>
                )}

                {invoice.status === 'PARTIALLY_PAID' && amountDue > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={20} />
                        <div className="text-xs text-amber-800">
                            <h4 className="font-bold text-amber-900">Partial Payment Received</h4>
                            <p className="mt-0.5">
                                ₹{fmt(invoice.amount_paid_paise)} has already been settled. A balance of <strong className="text-amber-900 font-black">₹{fmt(amountDue)}</strong> is currently due.
                            </p>
                        </div>
                    </div>
                )}

                {isCancelled && (
                    <div className="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
                        <div>
                            <h3 className="font-bold text-red-900 text-sm">Invoice {invoice.status}</h3>
                            <p className="text-xs text-red-700 mt-1">
                                This invoice was cancelled or voided by the issuer. Payment is no longer accepted. If you believe this is an error, please contact Intrust India support.
                            </p>
                        </div>
                    </div>
                )}

                {/* Seller & Customer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                            <Building2 size={13} />
                            <span>Billed From</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">
                            {invoice.seller_snapshot?.company_name || invoice.seller_snapshot?.business_name || 'Intrust India'}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                            {invoice.seller_snapshot?.company_address && <p>{invoice.seller_snapshot.company_address}</p>}
                            {invoice.seller_snapshot?.company_email && <p>{invoice.seller_snapshot.company_email}</p>}
                            {invoice.seller_snapshot?.company_phone && <p>Tel: {invoice.seller_snapshot.company_phone}</p>}
                            {invoice.seller_snapshot?.gst_number && <p className="font-mono text-[11px] font-semibold text-slate-700">GSTIN: {invoice.seller_snapshot.gst_number}</p>}
                        </div>
                    </div>

                    <div className="md:border-l md:border-slate-200 md:pl-6">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                            <User size={13} />
                            <span>Billed To</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">
                            {invoice.customer_snapshot?.name || 'Valued Customer'}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                            {invoice.customer_snapshot?.email && <p>{invoice.customer_snapshot.email}</p>}
                            {invoice.customer_snapshot?.phone && <p>Phone: {invoice.customer_snapshot.phone}</p>}
                            {invoice.customer_snapshot?.address && <p>{invoice.customer_snapshot.address}</p>}
                            {invoice.customer_snapshot?.gst_number && <p className="font-mono text-[11px] font-semibold text-slate-700">GSTIN: {invoice.customer_snapshot.gst_number}</p>}
                        </div>
                    </div>
                </div>

                {/* Line Items Presentation */}
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                        Items & Services
                    </h3>

                    {/* Desktop / Tablet Table View */}
                    <div className="hidden sm:block overflow-hidden border border-slate-200 rounded-2xl">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
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
                                                <td className="py-3.5 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                                                <td className="py-3.5 px-4 font-semibold text-slate-800">
                                                    <div>{item.name || item.description || 'Service Item'}</div>
                                                    {item.description && item.name && (
                                                        <div className="text-[11px] font-normal text-slate-500 mt-0.5">{item.description}</div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-center font-mono text-slate-500">{item.hsn_sac || item.hsn || '-'}</td>
                                                <td className="py-3.5 px-4 text-center font-medium text-slate-700">{item.quantity || item.qty || 1}</td>
                                                <td className="py-3.5 px-4 text-right font-medium text-slate-700">₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-4 text-center text-slate-400 italic">No line items specified</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View (Avoids Compressed Table on Narrow Screens) */}
                    <div className="sm:hidden space-y-3">
                        {items.length > 0 ? (
                            items.map((item, idx) => {
                                const unitPrice = item.unit_price_paise 
                                    ? item.unit_price_paise / 100 
                                    : (item.unit_price || 0);
                                const lineTotal = item.total_paise 
                                    ? item.total_paise / 100 
                                    : (item.total || (unitPrice * (item.quantity || 1)));
                                return (
                                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="font-bold text-slate-800 text-xs">
                                                <span>{item.name || item.description || 'Service Item'}</span>
                                                {item.hsn_sac && (
                                                    <span className="block text-[10px] font-mono text-slate-400 font-normal">HSN: {item.hsn_sac}</span>
                                                )}
                                            </div>
                                            <span className="font-black text-slate-900 text-xs shrink-0">
                                                ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                            <span>Qty: {item.quantity || item.qty || 1} × ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            {item.gst_percent && <span>GST: {item.gst_percent}%</span>}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                                No line items specified
                            </div>
                        )}
                    </div>
                </div>

                {/* Invoice Totals & Payment Action Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-slate-200">
                    {/* Financial Totals Breakdown (5 cols on lg) */}
                    <div className="lg:col-span-5 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Payment Breakdown
                        </h3>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Subtotal</span>
                                <span className="font-semibold text-slate-800">₹{fmt(invoice.subtotal_paise)}</span>
                            </div>

                            {invoice.discount_paise > 0 && (
                                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                                    <span>Discount</span>
                                    <span>-₹{fmt(invoice.discount_paise)}</span>
                                </div>
                            )}

                            {invoice.tax_paise > 0 && (
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>Applicable Tax / GST</span>
                                    <span className="font-semibold text-slate-800">₹{fmt(invoice.tax_paise)}</span>
                                </div>
                            )}

                            <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
                                <span className="font-black text-slate-800">Grand Total</span>
                                <span className="font-black text-slate-900">₹{fmt(invoice.grand_total_paise)}</span>
                            </div>

                            {invoice.amount_paid_paise > 0 && (
                                <div className="flex justify-between text-xs text-emerald-700 font-bold border-t border-slate-200/60 pt-2">
                                    <span>Amount Paid</span>
                                    <span>-₹{fmt(invoice.amount_paid_paise)}</span>
                                </div>
                            )}

                            <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-700">Amount Due</span>
                                <span className={`text-xl font-black ${amountDue > 0 ? 'text-[#1e3a5f]' : 'text-emerald-600'}`}>
                                    ₹{fmt(amountDue)}
                                </span>
                            </div>
                        </div>

                        {/* Trust Card */}
                        <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-[11px] text-blue-900 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-blue-950">
                                <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                                <span>Secure Merchant Billing</span>
                            </div>
                            <p className="text-blue-800/80 leading-relaxed">
                                Intrust India uses bank-grade 256-bit encryption. Your payment is securely processed and verified with instant receipt generation.
                            </p>
                        </div>
                    </div>

                    {/* Payment Form or Settlement Details (7 cols on lg) */}
                    <div className="lg:col-span-7">
                        {isPayable ? (
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                                    Confirm Details & Pay
                                </h3>
                                
                                <form onSubmit={handlePayment} className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                            Payer Name *
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={payerName}
                                            onChange={(e) => setPayerName(e.target.value)}
                                            disabled={loading}
                                            placeholder="Full legal or business name"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f] outline-none transition-all font-semibold text-slate-800 text-sm disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                                Email Address *
                                            </label>
                                            <input 
                                                type="email" 
                                                required 
                                                value={payerEmail}
                                                onChange={(e) => setPayerEmail(e.target.value)}
                                                disabled={loading}
                                                placeholder="receipt@example.com"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f] outline-none transition-all font-semibold text-slate-800 text-sm disabled:opacity-50"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                                Mobile Number *
                                            </label>
                                            <input 
                                                type="tel" 
                                                required 
                                                value={payerMobile}
                                                onChange={(e) => setPayerMobile(e.target.value)}
                                                disabled={loading}
                                                placeholder="10-digit mobile number"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f] outline-none transition-all font-semibold text-slate-800 text-sm disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-[#1e3a5f] text-white rounded-xl font-bold text-sm hover:bg-[#0f2447] active:scale-[0.99] transition-all shadow-lg shadow-[#1e3a5f]/25 disabled:opacity-50 disabled:shadow-none mt-6"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Connecting to Payment Gateway...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard size={18} />
                                                <span>Pay ₹{fmt(amountDue)} via SabPaisa</span>
                                            </>
                                        )}
                                    </button>
                                    
                                    <div className="pt-2 text-center text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1.5">
                                        <ShieldCheck size={13} className="text-emerald-500" />
                                        <span>Authorized gateway integration • Instant receipt on payment</span>
                                    </div>
                                </form>
                            </div>
                        ) : isPaid ? (
                            <div className="bg-emerald-50/60 p-6 rounded-2xl border border-emerald-200 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-emerald-900">No Balance Due</h4>
                                    <p className="text-xs text-emerald-700 mt-1 max-w-sm mx-auto">
                                        This invoice has been settled in full. You can download the stamped invoice for your tax and accounting records.
                                    </p>
                                </div>
                                <div className="pt-2 flex justify-center gap-3">
                                    <button
                                        onClick={handleDownloadPdf}
                                        disabled={downloadingPdf}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-700/20"
                                    >
                                        {downloadingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                        Download Official PDF
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-500">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700">Payment Closed</h4>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                        Online payment is not available for this invoice ({invoice.status}). Please contact Intrust India accounts team for assistance.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
