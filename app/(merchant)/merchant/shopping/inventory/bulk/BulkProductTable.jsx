'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, AlertCircle, Download, CheckCircle2 } from 'lucide-react';

const GST_OPTIONS = ['0', '5', '12', '18', '28'];

const EMPTY_ROW = () => ({
    _id: Math.random().toString(36).slice(2),
    title: '',
    description: '',
    category: '',
    retail_price: '',
    mrp: '',
    wholesale_price: '',
    gst_percentage: '0',
    hsn_code: '9971',
    stock_quantity: '0',
});

function validateRow(row, categories) {
    const errors = {};
    if (!row.title.trim()) errors.title = 'Required';
    if (!row.category || !categories.includes(row.category)) errors.category = 'Select a category';
    const price = parseFloat(row.retail_price);
    if (isNaN(price) || price <= 0) errors.retail_price = 'Enter a valid price';
    const mrp = parseFloat(row.mrp);
    if (isNaN(mrp) || mrp <= 0) errors.mrp = 'Enter a valid MRP';
    const cp = parseFloat(row.wholesale_price);
    if (isNaN(cp) || cp < 0) errors.wholesale_price = 'Enter cost price';
    const stock = parseInt(row.stock_quantity);
    if (isNaN(stock) || stock < 0) errors.stock_quantity = 'Enter valid stock';
    return errors;
}

function downloadTemplate(categories) {
    const headers = ['Product Name', 'Description', 'Category', 'Selling Price (₹)', 'MRP (₹)', 'Cost Price (₹)', 'GST %', 'HSN Code', 'Initial Stock'];
    const example1 = [`Local Organic Honey`, `Premium raw pure organic mountain honey`, categories[0] || 'Food', '299', '349', '180', '0', '9971', '50'];
    const example2 = [`Cotton Kurta - Blue`, `Elegant blue handloom cotton kurta for daily wear`, categories[1] || 'Clothing', '599', '799', '350', '5', '9971', '30'];
    const csv = [headers, example1, example2].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intrust_bulk_product_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

export default function BulkProductTable({ categories, onSubmit, submitting, progressMessage }) {
    const [rows, setRows] = useState([EMPTY_ROW()]);
    const [errors, setErrors] = useState({});
    const [validated, setValidated] = useState(false);

    const updateRow = (id, field, value) => {
        setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
        if (validated) {
            setErrors(prev => {
                const row = rows.find(r => r._id === id);
                const updated = { ...row, [field]: value };
                const rowErrors = validateRow(updated, categories);
                const next = { ...prev };
                if (Object.keys(rowErrors).length === 0) {
                    delete next[id];
                } else {
                    next[id] = rowErrors;
                }
                return next;
            });
        }
    };

    const addRow = () => setRows(prev => [...prev, EMPTY_ROW()]);

    const removeRow = (id) => {
        setRows(prev => prev.filter(r => r._id !== id));
        setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    const validate = useCallback(() => {
        const newErrors = {};
        rows.forEach(row => {
            const e = validateRow(row, categories);
            if (Object.keys(e).length > 0) newErrors[row._id] = e;
        });
        setErrors(newErrors);
        setValidated(true);
        return Object.keys(newErrors).length === 0;
    }, [rows, categories]);

    const handleSubmit = () => {
        if (!validate()) return;
        const products = rows.map(r => ({
            title: r.title.trim(),
            description: r.description.trim(),
            category: r.category,
            retail_price_paise: Math.round(parseFloat(r.retail_price) * 100),
            mrp_paise: Math.round(parseFloat(r.mrp) * 100),
            wholesale_price_paise: Math.round(parseFloat(r.wholesale_price) * 100),
            gst_percentage: parseInt(r.gst_percentage),
            hsn_code: r.hsn_code?.trim() || '9971',
            stock_quantity: parseInt(r.stock_quantity),
            product_images: [],
        }));
        onSubmit(products);
    };

    const totalErrors = Object.keys(errors).length;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={addRow}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a5f] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#2c5282] transition-all shadow-md"
                    >
                        <Plus size={14} /> Add Row
                    </button>
                    {rows.length > 1 && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {rows.length} products
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => downloadTemplate(categories)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                >
                    <Download size={13} /> Download Template
                </button>
            </div>

            {/* Validation banner */}
            {validated && totalErrors > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                    <p className="text-red-600 text-xs font-bold">{totalErrors} row{totalErrors > 1 ? 's have' : ' has'} errors. Fix them below before submitting.</p>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-sm min-w-[1100px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[180px]">Product Name <span className="text-red-400">*</span></th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[180px]">Description</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[140px]">Category <span className="text-red-400">*</span></th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[110px]">Selling Price ₹ <span className="text-red-400">*</span></th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[110px]">MRP ₹ <span className="text-red-400">*</span></th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[110px]">Cost Price ₹ <span className="text-red-400">*</span></th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-20">GST %</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24">HSN Code</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-20">Stock</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {rows.map((row, idx) => {
                            const rowErrors = errors[row._id] || {};
                            const hasErrors = Object.keys(rowErrors).length > 0;
                            return (
                                <tr key={row._id} className={`transition-colors ${hasErrors ? 'bg-red-50/30' : 'hover:bg-slate-50/40'}`}>
                                    <td className="px-4 py-3 text-[10px] font-black text-slate-300">{idx + 1}</td>

                                    {/* Title */}
                                    <td className="px-2 py-2">
                                        <div>
                                            <input
                                                type="text"
                                                value={row.title}
                                                onChange={e => updateRow(row._id, 'title', e.target.value)}
                                                placeholder="Product name"
                                                className={`w-full px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all border ${rowErrors.title ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white'} focus:ring-4 focus:ring-blue-500/5`}
                                            />
                                            {rowErrors.title && <p className="text-[9px] text-red-500 font-bold mt-0.5 px-1">{rowErrors.title}</p>}
                                        </div>
                                    </td>

                                    {/* Description */}
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.description}
                                            onChange={e => updateRow(row._id, 'description', e.target.value)}
                                            placeholder="Brief description"
                                            className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all border border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                                        />
                                    </td>

                                    {/* Category */}
                                    <td className="px-2 py-2">
                                        <div>
                                            <select
                                                value={row.category}
                                                onChange={e => updateRow(row._id, 'category', e.target.value)}
                                                className={`w-full px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all border appearance-none ${rowErrors.category ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white'} focus:ring-4 focus:ring-blue-500/5`}
                                            >
                                                <option value="">Select...</option>
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            {rowErrors.category && <p className="text-[9px] text-red-500 font-bold mt-0.5 px-1">{rowErrors.category}</p>}
                                        </div>
                                    </td>

                                    {/* Selling Price */}
                                    <td className="px-2 py-2">
                                        <div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₹</span>
                                                <input
                                                    type="number"
                                                    value={row.retail_price}
                                                    onChange={e => updateRow(row._id, 'retail_price', e.target.value)}
                                                    placeholder="0.00"
                                                    min="0" step="0.01"
                                                    className={`w-full pl-7 pr-3 py-2 rounded-xl text-sm font-black outline-none transition-all border [appearance:textfield] ${rowErrors.retail_price ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white'} focus:ring-4 focus:ring-blue-500/5`}
                                                />
                                            </div>
                                            {rowErrors.retail_price && <p className="text-[9px] text-red-500 font-bold mt-0.5 px-1">{rowErrors.retail_price}</p>}
                                        </div>
                                    </td>

                                    {/* MRP */}
                                    <td className="px-2 py-2">
                                        <div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₹</span>
                                                <input
                                                    type="number"
                                                    value={row.mrp}
                                                    onChange={e => updateRow(row._id, 'mrp', e.target.value)}
                                                    placeholder="0.00"
                                                    min="0" step="0.01"
                                                    className={`w-full pl-7 pr-3 py-2 rounded-xl text-sm font-black outline-none transition-all border [appearance:textfield] ${rowErrors.mrp ? 'border-red-300 bg-red-50' : 'border-blue-50 bg-blue-50/50 focus:border-blue-500 focus:bg-white'} focus:ring-4 focus:ring-blue-500/5`}
                                                />
                                            </div>
                                            {rowErrors.mrp && <p className="text-[9px] text-red-500 font-bold mt-0.5 px-1">{rowErrors.mrp}</p>}
                                        </div>
                                    </td>

                                    {/* Cost Price */}
                                    <td className="px-2 py-2">
                                        <div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₹</span>
                                                <input
                                                    type="number"
                                                    value={row.wholesale_price}
                                                    onChange={e => updateRow(row._id, 'wholesale_price', e.target.value)}
                                                    placeholder="0.00"
                                                    min="0" step="0.01"
                                                    className={`w-full pl-7 pr-3 py-2 rounded-xl text-sm font-black outline-none transition-all border [appearance:textfield] ${rowErrors.wholesale_price ? 'border-red-300 bg-red-50' : 'border-orange-100 bg-orange-50/30 focus:border-orange-400 focus:bg-white'} focus:ring-4 focus:ring-orange-500/5`}
                                                />
                                            </div>
                                            {rowErrors.wholesale_price && <p className="text-[9px] text-red-500 font-bold mt-0.5 px-1">{rowErrors.wholesale_price}</p>}
                                        </div>
                                    </td>

                                    {/* GST */}
                                    <td className="px-2 py-2">
                                        <select
                                            value={row.gst_percentage}
                                            onChange={e => updateRow(row._id, 'gst_percentage', e.target.value)}
                                            className="w-full px-2 py-2 rounded-xl text-sm font-black outline-none transition-all border border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 appearance-none"
                                        >
                                            {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
                                        </select>
                                    </td>

                                    {/* HSN Code */}
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.hsn_code}
                                            onChange={e => updateRow(row._id, 'hsn_code', e.target.value)}
                                            placeholder="9971"
                                            className="w-full px-3 py-2 rounded-xl text-sm font-black outline-none transition-all border border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                                        />
                                    </td>

                                    {/* Stock */}
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            value={row.stock_quantity}
                                            onChange={e => updateRow(row._id, 'stock_quantity', e.target.value)}
                                            min="0"
                                            className="w-full px-3 py-2 rounded-xl text-sm font-black outline-none transition-all border border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 [appearance:textfield]"
                                        />
                                    </td>

                                    {/* Delete */}
                                    <td className="px-2 py-2">
                                        {rows.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row._id)}
                                                className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={addRow}
                        className="text-[11px] font-black text-slate-500 hover:text-[#1e3a5f] uppercase tracking-widest transition-colors flex items-center gap-1"
                    >
                        <Plus size={13} /> Add another row
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={validate}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-1.5"
                    >
                        <CheckCircle2 size={13} /> Validate All
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#2c5282] text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50"
                    >
                        {submitting ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {progressMessage || 'Submitting...'}</>
                        ) : (
                            <>Submit {rows.length} Product{rows.length > 1 ? 's' : ''} →</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
