'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, Eye, AlertCircle, Download } from 'lucide-react';

const REQUIRED_COLUMNS = ['Product Name', 'Description', 'Category', 'Selling Price (₹)', 'MRP (₹)', 'Cost Price (₹)', 'GST %', 'HSN Code', 'Initial Stock'];

function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [], error: 'CSV must have at least a header row and one data row.' };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line, idx) => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = { _row: idx + 2 };
        headers.forEach((h, i) => { obj[h] = values[i] || ''; });
        return obj;
    });
    return { headers, rows, error: null };
}

function mapToProduct(row, headers, columnMap) {
    const get = (key) => row[headers[columnMap[key]] ?? key] || '';
    return {
        title: get('Product Name'),
        description: get('Description'),
        category: get('Category'),
        retail_price_paise: Math.round(parseFloat(get('Selling Price (₹)') || 0) * 100),
        mrp_paise: Math.round(parseFloat(get('MRP (₹)') || 0) * 100),
        wholesale_price_paise: Math.round(parseFloat(get('Cost Price (₹)') || 0) * 100),
        gst_percentage: parseInt(get('GST %') || 0),
        hsn_code: get('HSN Code') || '9971',
        stock_quantity: parseInt(get('Initial Stock') || 0),
        product_images: [],
    };
}

function downloadTemplate(categories) {
    const headers = ['Product Name', 'Description', 'Category', 'Selling Price (₹)', 'MRP (₹)', 'Cost Price (₹)', 'GST %', 'HSN Code', 'Initial Stock'];
    const example1 = ['Local Organic Honey', 'Premium raw pure organic mountain honey', categories[0] || 'Food', '299', '349', '180', '0', '9971', '50'];
    const example2 = ['Cotton Kurta - Blue', 'Elegant blue handloom cotton kurta for daily wear', categories[1] || 'Clothing', '599', '799', '350', '5', '9971', '30'];
    const csv = [headers, example1, example2].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'intrust_bulk_product_template.csv'; a.click();
    URL.revokeObjectURL(url);
}

export default function BulkCSVUploader({ categories, onSubmit, submitting }) {
    const [file, setFile] = useState(null);
    const [parsed, setParsed] = useState(null);
    const [parseError, setParseError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef();

    const processFile = (f) => {
        if (!f || !f.name.endsWith('.csv')) {
            setParseError('Please upload a valid .csv file.');
            return;
        }
        setFile(f);
        setParseError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            const { headers, rows, error } = parseCSV(e.target.result);
            if (error) { setParseError(error); return; }
            // auto-map columns
            const columnMap = {};
            REQUIRED_COLUMNS.forEach(col => {
                const idx = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase().split(' ')[0]));
                if (idx !== -1) columnMap[col] = idx;
            });
            setParsed({ headers, rows, columnMap });
        };
        reader.readAsText(f);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    };

    const handleSubmit = () => {
        if (!parsed) return;
        const products = parsed.rows.map(row => mapToProduct(row, parsed.headers, parsed.columnMap));
        onSubmit(products);
    };

    const reset = () => { setFile(null); setParsed(null); setParseError(null); };

    return (
        <div className="space-y-6">
            {/* Download template */}
            <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <div>
                    <p className="text-sm font-black text-slate-800">Download the CSV template first</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Fill it with your products, then upload below.</p>
                </div>
                <button
                    type="button"
                    onClick={() => downloadTemplate(categories)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#2c5282] transition-all shadow-md shrink-0"
                >
                    <Download size={13} /> Template
                </button>
            </div>

            {/* Dropzone */}
            {!parsed ? (
                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-3xl p-12 cursor-pointer transition-all ${dragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30'}`}
                >
                    <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => processFile(e.target.files[0])} />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${dragging ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                        <Upload size={28} />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-slate-800 text-base">{dragging ? 'Drop it here!' : 'Drop CSV file here'}</p>
                        <p className="text-slate-500 text-sm mt-1 font-medium">or <span className="text-blue-600 font-black">click to browse</span></p>
                        <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">CSV files only</p>
                    </div>
                </div>
            ) : (
                /* Preview Table */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <FileText size={18} />
                            </div>
                            <div>
                                <p className="font-black text-slate-800 text-sm">{file?.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{parsed.rows.length} products detected</p>
                            </div>
                        </div>
                        <button type="button" onClick={reset} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm max-h-80">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {parsed.headers.map(h => (
                                        <th key={h} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {parsed.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                                        {parsed.headers.map(h => (
                                            <td key={h} className="px-4 py-2.5 text-sm font-medium text-slate-700 whitespace-nowrap">{row[h]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <button type="button" onClick={reset} className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 hover:text-red-500 uppercase tracking-widest transition-colors">
                            <X size={13} /> Change File
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#2c5282] text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50"
                        >
                            {submitting ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                            ) : (
                                <>Import {parsed.rows.length} Products →</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {parseError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                    <p className="text-red-600 text-xs font-bold">{parseError}</p>
                </div>
            )}
        </div>
    );
}
