'use client';

import { useState } from 'react';
import {
    FileText,
    Plus,
    Trash2,
    Download,
    Building2,
    User,
    Package,
    Receipt,
    Loader2,
    Hash,
    Percent,
    CheckCircle2,
    MapPin,
    Phone,
    Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateManualInvoice } from '@/lib/invoiceGenerator';

const EMPTY_ITEM = {
    name: '',
    hsn_sac: '9971',
    quantity: 1,
    unit_price: 0,
    gst_percent: 18,
};

export default function ManualInvoiceGeneratorPage() {
    const [generating, setGenerating] = useState(false);

    // Seller Info
    const [seller, setSeller] = useState({
        company_name: 'Intrust Financial Services (India) Pvt. Ltd.',
        company_address: 'TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Naga, Bhopal, MP 462026',
        company_phone: '18002030052',
        company_email: 'support@intrust.com.in',
        gst_number: '23AAFC14866A1ZV',
    });

    // Customer Info
    const [customer, setCustomer] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
    });

    // Line Items
    const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

    // Invoice Meta
    const [invoiceMeta, setInvoiceMeta] = useState({
        invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        disclaimer: 'This is a computer-generated invoice. No signature required.',
    });

    const addItem = () => {
        setItems([...items, { ...EMPTY_ITEM }]);
    };

    const removeItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    // Calculations
    const calculateItemTotal = (item) => {
        const base = item.quantity * item.unit_price;
        const gst = base * (item.gst_percent / 100);
        return { base, gst, total: base + gst };
    };

    const totals = items.reduce(
        (acc, item) => {
            const calc = calculateItemTotal(item);
            return {
                subtotal: acc.subtotal + calc.base,
                totalGst: acc.totalGst + calc.gst,
                grandTotal: acc.grandTotal + calc.total,
            };
        },
        { subtotal: 0, totalGst: 0, grandTotal: 0 }
    );

    const handleGenerate = async () => {
        // Validation
        if (!customer.name.trim()) {
            toast.error('Please enter customer name');
            return;
        }
        if (items.some(i => !i.name.trim() || i.unit_price <= 0)) {
            toast.error('Please fill in all item names and prices');
            return;
        }

        setGenerating(true);
        try {
            generateManualInvoice({
                seller,
                customer,
                items: items.map(item => ({
                    ...item,
                    ...calculateItemTotal(item),
                })),
                totals,
                meta: invoiceMeta,
            });
            toast.success('Invoice PDF generated!');
        } catch (err) {
            console.error('Invoice generation failed:', err);
            toast.error('Failed to generate invoice');
        } finally {
            setGenerating(false);
        }
    };

    const formatCurrency = (val) =>
        val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-10">
            <div className="max-w-5xl mx-auto space-y-6 pb-24">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <FileText className="text-blue-600" size={32} />
                            Invoice Generator
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Create and download custom invoices manually.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Forms */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Invoice Meta */}
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <Hash className="text-indigo-600" size={20} />
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Invoice Details</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Number & Date</p>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={invoiceMeta.invoice_number}
                                        onChange={(e) => setInvoiceMeta({ ...invoiceMeta, invoice_number: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={invoiceMeta.invoice_date}
                                        onChange={(e) => setInvoiceMeta({ ...invoiceMeta, invoice_date: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seller Details */}
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <Building2 className="text-blue-600" size={20} />
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Seller Details</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your company info</p>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Company Name</label>
                                    <input
                                        type="text"
                                        value={seller.company_name}
                                        onChange={(e) => setSeller({ ...seller, company_name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <MapPin size={10} /> Address
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={seller.company_address}
                                        onChange={(e) => setSeller({ ...seller, company_address: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Phone size={10} /> Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={seller.company_phone}
                                        onChange={(e) => setSeller({ ...seller, company_phone: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Hash size={10} /> GST Number
                                    </label>
                                    <input
                                        type="text"
                                        value={seller.gst_number}
                                        onChange={(e) => setSeller({ ...seller, gst_number: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Customer Details */}
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                <User className="text-emerald-600" size={20} />
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Customer Details</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bill to</p>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={customer.name}
                                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                        placeholder="e.g. Rajesh Kumar"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Address</label>
                                    <input
                                        type="text"
                                        value={customer.address}
                                        onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                        placeholder="Customer address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                                    <input
                                        type="text"
                                        value={customer.phone}
                                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                        placeholder="+91 00000 00000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={customer.email}
                                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                                        placeholder="customer@email.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <Package className="text-amber-600" size={20} />
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            Line Items
                                            <span className="text-[9px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-full">
                                                {items.length}
                                            </span>
                                        </h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Products & Services</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setItems([{ ...EMPTY_ITEM }])}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-xl text-xs font-bold border border-red-100 transition-all"
                                        >
                                            <Trash2 size={12} /> Clear All
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-100 transition-all"
                                    >
                                        <Plus size={14} /> Add Item
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="relative bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3"
                                    >
                                        {/* Item header with number badge + delete */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                                Item #{index + 1}
                                            </span>
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold border border-red-100 hover:border-red-500 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                                            <div className="sm:col-span-3">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Product / Service Name *</label>
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm"
                                                    placeholder="e.g. Gold Subscription"
                                                />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">HSN/SAC</label>
                                                <input
                                                    type="text"
                                                    value={item.hsn_sac}
                                                    onChange={(e) => updateItem(index, 'hsn_sac', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm"
                                                    placeholder="9971"
                                                />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm"
                                                />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GST %</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={item.gst_percent}
                                                    onChange={(e) => updateItem(index, 'gst_percent', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Price (Rs.) *</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unit_price || ''}
                                                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Amount</label>
                                                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-600">
                                                    Rs. {formatCurrency(item.quantity * item.unit_price)}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GST Amount</label>
                                                <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm font-bold text-emerald-600">
                                                    Rs. {formatCurrency(calculateItemTotal(item).gst)}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Line Total</label>
                                                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-black text-blue-700">
                                                    Rs. {formatCurrency(calculateItemTotal(item).total)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Another Item — bottom button */}
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs font-bold flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Add Another Item
                                </button>
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden p-6">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Footer Disclaimer</label>
                            <textarea
                                rows={2}
                                value={invoiceMeta.disclaimer}
                                onChange={(e) => setInvoiceMeta({ ...invoiceMeta, disclaimer: e.target.value })}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm"
                            />
                        </div>
                    </div>

                    {/* Right Column: Live Preview / Summary */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Totals Card */}
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden sticky top-6">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-slate-900 to-slate-800">
                                <Receipt className="text-white" size={20} />
                                <h2 className="text-sm font-bold text-white">Invoice Summary</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Preview of items */}
                                <div className="space-y-2">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 font-medium truncate max-w-[140px]">
                                                {item.name || `Item ${idx + 1}`}
                                            </span>
                                            <span className="font-bold text-slate-800">Rs. {formatCurrency(calculateItemTotal(item).total)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-dashed border-slate-200 pt-4 space-y-2.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Subtotal</span>
                                        <span className="font-bold text-slate-800">Rs. {formatCurrency(totals.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium flex items-center gap-1">
                                            <Percent size={11} /> Total GST
                                        </span>
                                        <span className="font-bold text-emerald-600">Rs. {formatCurrency(totals.totalGst)}</span>
                                    </div>
                                </div>

                                <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center">
                                    <span className="font-black text-slate-900">Grand Total</span>
                                    <span className="font-black text-2xl text-slate-900">Rs. {formatCurrency(totals.grandTotal)}</span>
                                </div>

                                {/* Customer preview */}
                                {customer.name && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bill To</p>
                                        <p className="text-sm font-bold text-slate-800">{customer.name}</p>
                                        {customer.phone && <p className="text-xs text-slate-500">{customer.phone}</p>}
                                    </div>
                                )}

                                {/* Generate Button */}
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-xs hover:bg-blue-600 hover:scale-[1.02] transition-all shadow-2xl shadow-slate-900/20 disabled:opacity-50 disabled:scale-100 active:scale-[0.98] mt-6"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} />
                                            Generate Invoice
                                        </>
                                    )}
                                </button>

                                <p className="text-[10px] text-slate-400 text-center font-medium mt-2">
                                    PDF will be downloaded to your device
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
