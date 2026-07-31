'use client';

import { useState } from 'react';
import {
    FileText, Plus, Trash2, Download, Building2, User, Package,
    Receipt, Loader2, Hash, Percent, MapPin, Phone, Mail, Share2, Send
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateManualInvoice } from '@/lib/invoiceGenerator';
import { PLATFORM_CONFIG } from '@/lib/config/platform';
import { motion } from 'framer-motion';

const EMPTY_ITEM = {
    name: '',
    hsn_sac: '9971',
    quantity: 1,
    unit_price: 0,
    gst_percent: 18,
};

export default function CRMInvoicePage() {
    const [generating, setGenerating] = useState(false);
    const [sharing, setSharing] = useState(false);

    const [seller, setSeller] = useState({
        company_name: PLATFORM_CONFIG.business.name,
        company_address: PLATFORM_CONFIG.business.address,
        company_phone: PLATFORM_CONFIG.business.phone,
        company_email: PLATFORM_CONFIG.business.email,
        gst_number: PLATFORM_CONFIG.business.gstin,
    });

    const [customer, setCustomer] = useState({
        name: '', address: '', phone: '', email: '',
    });

    const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

    const [invoiceMeta, setInvoiceMeta] = useState({
        invoice_number: `CRM-${Date.now().toString(36).toUpperCase()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        disclaimer: 'This is a computer-generated invoice. No signature required.',
    });

    const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);
    const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };
    const updateItem = (i, field, val) => {
        const updated = [...items];
        updated[i] = { ...updated[i], [field]: val };
        setItems(updated);
    };

    const calculateItemTotal = (item) => {
        const base = item.quantity * item.unit_price;
        const totalGst = base * (item.gst_percent / 100);
        return { base, gst: totalGst, sgst: totalGst / 2, cgst: totalGst / 2, total: base + totalGst };
    };

    const totals = items.reduce((acc, item) => {
        const calc = calculateItemTotal(item);
        return {
            subtotal: acc.subtotal + calc.base,
            totalSgst: acc.totalSgst + calc.sgst,
            totalCgst: acc.totalCgst + calc.cgst,
            totalGst: acc.totalGst + calc.gst,
            grandTotal: acc.grandTotal + calc.total,
        };
    }, { subtotal: 0, totalSgst: 0, totalCgst: 0, totalGst: 0, grandTotal: 0 });

    const validate = () => {
        if (!customer.name.trim()) { toast.error('Please enter customer name'); return false; }
        if (items.some(i => !i.name.trim() || i.unit_price <= 0)) { toast.error('Fill in all item names and prices'); return false; }
        return true;
    };

    const handleGenerate = async () => {
        if (!validate()) return;
        setGenerating(true);
        try {
            generateManualInvoice({ seller, customer, items: items.map(item => ({ ...item, ...calculateItemTotal(item) })), totals, meta: invoiceMeta });
            toast.success('Invoice PDF generated!');
        } catch (err) {
            toast.error('Failed to generate invoice');
        } finally {
            setGenerating(false);
        }
    };

    const handleShareWhatsApp = () => {
        if (!validate()) return;
        const text = `Dear ${customer.name},\n\nPlease find your invoice details:\n\nInvoice No: ${invoiceMeta.invoice_number}\nDate: ${invoiceMeta.invoice_date}\nAmount: ₹${totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nFor any queries, contact us at: ${seller.company_email}\n\nThank you for choosing ${seller.company_name}!`;
        const phone = customer.phone.replace(/\D/g, '');
        const url = `https://wa.me/${phone ? `91${phone}` : ''}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleShareEmail = () => {
        if (!validate()) return;
        const subject = `Invoice ${invoiceMeta.invoice_number} from ${seller.company_name}`;
        const body = `Dear ${customer.name},\n\nPlease find attached your invoice.\n\nInvoice No: ${invoiceMeta.invoice_number}\nDate: ${invoiceMeta.invoice_date}\nTotal Amount: ₹${totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nFor queries: intrustindiadev@gmail.com\n\nThank you,\n${seller.company_name}`;
        window.open(`mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    const fmt = (val) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const inputCls = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f] outline-none transition-all font-semibold text-slate-700 text-sm";
    const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-10">
            <div className="max-w-5xl mx-auto space-y-6 pb-24">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-black uppercase tracking-widest mb-2">
                            <FileText size={12} /> CRM Invoice Generator
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Invoice</h1>
                        <p className="text-slate-500 font-medium mt-1 text-sm">Generate professional invoices and share them directly with clients.</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Forms */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Invoice Meta */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <Hash className="text-[#1e3a5f]" size={18} />
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Invoice Details</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Number & Date</p>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Invoice Number</label>
                                    <input type="text" value={invoiceMeta.invoice_number} onChange={(e) => setInvoiceMeta({ ...invoiceMeta, invoice_number: e.target.value })} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Invoice Date</label>
                                    <input type="date" value={invoiceMeta.invoice_date} onChange={(e) => setInvoiceMeta({ ...invoiceMeta, invoice_date: e.target.value })} className={inputCls} />
                                </div>
                            </div>
                        </div>

                        {/* Seller Details */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <Building2 className="text-[#1e3a5f]" size={18} />
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Seller Details</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your company info</p>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Company Name</label>
                                    <input type="text" value={seller.company_name} onChange={(e) => setSeller({ ...seller, company_name: e.target.value })} className={inputCls} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}><MapPin size={10} className="inline mr-1" />Address</label>
                                    <textarea rows={2} value={seller.company_address} onChange={(e) => setSeller({ ...seller, company_address: e.target.value })} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}><Phone size={10} className="inline mr-1" />Phone</label>
                                    <input type="text" value={seller.company_phone} onChange={(e) => setSeller({ ...seller, company_phone: e.target.value })} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}><Hash size={10} className="inline mr-1" />GST Number</label>
                                    <input type="text" value={seller.gst_number} onChange={(e) => setSeller({ ...seller, gst_number: e.target.value })} className={inputCls} />
                                </div>
                            </div>
                        </div>

                        {/* Customer Details */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <User className="text-emerald-600" size={18} />
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Customer / Client Details</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bill to</p>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Customer Name *</label>
                                    <input type="text" required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className={inputCls} placeholder="e.g. Rajesh Kumar" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Address</label>
                                    <input type="text" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className={inputCls} placeholder="Customer address" />
                                </div>
                                <div>
                                    <label className={labelCls}><Phone size={10} className="inline mr-1" />Phone (for WhatsApp)</label>
                                    <input type="text" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className={inputCls} placeholder="+91 00000 00000" />
                                </div>
                                <div>
                                    <label className={labelCls}><Mail size={10} className="inline mr-1" />Email (for Email share)</label>
                                    <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className={inputCls} placeholder="client@email.com" />
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <Package className="text-amber-600" size={18} />
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            Line Items
                                            <span className="text-[9px] font-black text-white bg-[#1e3a5f] px-2 py-0.5 rounded-full">{items.length}</span>
                                        </h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Products & Services</p>
                                    </div>
                                </div>
                                <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f]/10 text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white rounded-xl text-xs font-bold border border-[#1e3a5f]/20 transition-all">
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                {items.map((item, index) => (
                                    <div key={index} className="relative bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-lg border border-slate-200">Item #{index + 1}</span>
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)} className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold border border-red-100 hover:border-red-500 transition-all">
                                                    <Trash2 size={11} /> Remove
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                                            <div className="sm:col-span-3">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Product / Service *</label>
                                                <input type="text" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none transition-all font-medium text-slate-700 text-sm" placeholder="e.g. Premium Membership" />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">HSN/SAC</label>
                                                <input type="text" value={item.hsn_sac} onChange={(e) => updateItem(index, 'hsn_sac', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none transition-all font-medium text-slate-700 text-sm" />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty</label>
                                                <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none transition-all font-medium text-slate-700 text-sm" />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GST %</label>
                                                <input type="number" min="0" step="0.5" value={item.gst_percent} onChange={(e) => updateItem(index, 'gst_percent', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none transition-all font-medium text-slate-700 text-sm" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Price (₹) *</label>
                                                <input type="number" min="0" step="0.01" value={item.unit_price || ''} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none transition-all font-medium text-slate-700 text-sm" placeholder="0.00" />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Amount</label>
                                                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-600">₹{fmt(item.quantity * item.unit_price)}</div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GST Amount</label>
                                                <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm font-bold text-emerald-600">₹{fmt(calculateItemTotal(item).gst)}</div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Line Total</label>
                                                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-black text-[#1e3a5f]">₹{fmt(calculateItemTotal(item).total)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addItem} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-[#1e3a5f] hover:border-[#1e3a5f]/40 hover:bg-blue-50/30 transition-all text-xs font-bold flex items-center justify-center gap-2">
                                    <Plus size={16} /> Add Another Item
                                </button>
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <label className={labelCls}>Footer Disclaimer</label>
                            <textarea rows={2} value={invoiceMeta.disclaimer} onChange={(e) => setInvoiceMeta({ ...invoiceMeta, disclaimer: e.target.value })} className={inputCls} />
                        </div>
                    </div>

                    {/* Right: Summary + Actions */}
                    <div className="lg:col-span-1 space-y-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-[#1e3a5f] to-[#0f2447]">
                                <Receipt className="text-white" size={18} />
                                <h2 className="text-sm font-bold text-white">Invoice Summary</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 font-medium truncate max-w-[130px]">{item.name || `Item ${idx + 1}`}</span>
                                            <span className="font-bold text-slate-800">₹{fmt(calculateItemTotal(item).total)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-bold text-slate-800">₹{fmt(totals.subtotal)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-500 flex items-center gap-1"><Percent size={10} /> SGST</span><span className="font-bold text-emerald-600">₹{fmt(totals.totalSgst)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-500 flex items-center gap-1"><Percent size={10} /> CGST</span><span className="font-bold text-emerald-600">₹{fmt(totals.totalCgst)}</span></div>
                                </div>
                                <div className="border-t-2 border-[#1e3a5f] pt-4 flex justify-between items-center">
                                    <span className="font-black text-slate-900">Grand Total</span>
                                    <span className="font-black text-2xl text-[#1e3a5f]">₹{fmt(totals.grandTotal)}</span>
                                </div>

                                {customer.name && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-xl p-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bill To</p>
                                        <p className="text-sm font-bold text-slate-800">{customer.name}</p>
                                        {customer.phone && <p className="text-xs text-slate-500">{customer.phone}</p>}
                                        {customer.email && <p className="text-xs text-slate-500">{customer.email}</p>}
                                    </div>
                                )}

                                {/* Generate & Download */}
                                <button onClick={handleGenerate} disabled={generating} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1e3a5f] text-white rounded-xl font-black text-sm hover:bg-[#0f2447] transition-all shadow-lg shadow-[#1e3a5f]/25 disabled:opacity-50 mt-4">
                                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Download size={16} /> Generate & Download</>}
                                </button>

                                {/* Share Buttons */}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button onClick={handleShareWhatsApp} disabled={!customer.phone} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-bold hover:bg-green-500 hover:text-white hover:border-green-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                        <Send size={13} /> WhatsApp
                                    </button>
                                    <button onClick={handleShareEmail} disabled={!customer.email} className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                        <Share2 size={13} /> Email
                                    </button>
                                </div>

                                <p className="text-[10px] text-slate-400 text-center font-medium mt-1">PDF downloads to your device</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
