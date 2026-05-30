'use client';

import { useState, useRef, useCallback } from 'react';
import {
    Upload, FileText, Download, CheckCircle2, XCircle,
    AlertTriangle, Loader2, RefreshCw, Package, ChevronRight, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ── Sample CSV generation ──────────────────────────────────────────────────
const SAMPLE_HEADERS = [
    'title', 'description', 'category', 'wholesale_price', 'selling_price',
    'mrp', 'stock', 'gst_percent', 'hsn_code', 'image_url_1', 'image_url_2', 'image_url_3', 'is_active'
];

const SAMPLE_ROWS = [
    [
        'Premium Noise Cancelling Headphones',
        'Over-ear headphones with active noise cancellation and 30hr battery life',
        'Electronics', '1499', '1999', '2499', '50', '18', '8518',
        'https://example.com/headphones.jpg', '', '', 'true'
    ],
    [
        'Organic Green Tea (100g)',
        'Premium Darjeeling first flush green tea, hand-picked',
        'Groceries & FMCG', '80', '120', '150', '200', '5', '0902',
        'https://example.com/greentea.jpg', '', '', 'true'
    ],
    [
        'Stainless Steel Water Bottle 1L',
        'Double-wall vacuum insulated, keeps cold 24hr, hot 12hr',
        'Home & Kitchen', '299', '499', '699', '100', '12', '7323',
        '', '', '', 'true'
    ],
];

function generateCSV() {
    const csv = [
        SAMPLE_HEADERS.join(','),
        ...SAMPLE_ROWS.map(r => r.map(v => {
            let escaped = v.replace(/"/g, '""');
            if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
                return `"${escaped}"`;
            }
            return escaped;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intrust_product_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function BulkProductUpload({ onSuccess }) {
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null); // { success, failed, errors }
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleFile = useCallback((f) => {
        if (!f) return;
        if (!f.name.toLowerCase().endsWith('.csv')) {
            toast.error('Please upload a CSV file. Open your Excel file and use File → Save As → CSV.');
            return;
        }
        if (f.size > 5 * 1024 * 1024) {
            toast.error('File too large. Maximum 5 MB.');
            return;
        }
        setFile(f);
        setResult(null);
        setProgress(0);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    }, [handleFile]);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setProgress(10);

        try {
            const formData = new FormData();
            formData.append('file', file);

            setProgress(30);
            const res = await fetch('/api/admin/shopping/bulk-upload', {
                method: 'POST',
                body: formData,
            });
            setProgress(80);

            const data = await res.json();
            setProgress(100);

            if (!res.ok && res.status !== 422) {
                throw new Error(data.error || 'Upload failed');
            }

            setResult(data);

            if (data.success > 0) {
                toast.success(`${data.success} product${data.success > 1 ? 's' : ''} uploaded successfully!`);
                onSuccess?.();
            } else {
                toast.error('No products were uploaded. Check the errors below.');
            }
        } catch (err) {
            toast.error(err.message || 'Upload failed');
            console.error('Bulk upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-5">

            {/* Header Row */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-slate-900">Bulk Product Upload</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Upload up to 500 products at once via CSV file</p>
                </div>
                <button
                    onClick={generateCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-all"
                >
                    <Download size={14} />
                    Download Template
                </button>
            </div>

            {/* Schema Reference */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Required CSV Columns</p>
                <div className="flex flex-wrap gap-1.5">
                    {['title*', 'description*', 'category*', 'wholesale_price*', 'selling_price*', 'mrp*', 'stock*', 'gst_percent*', 'hsn_code', 'image_url_1', 'image_url_2', 'image_url_3', 'is_active'].map(col => (
                        <span
                            key={col}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${col.endsWith('*')
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-600'
                            }`}
                        >
                            {col}
                        </span>
                    ))}
                </div>
                <p className="text-[10px] text-blue-600 mt-1.5">
                    * Required &nbsp;|&nbsp; Prices in ₹ (e.g. 499, not 49900) &nbsp;|&nbsp; GST: 0, 5, 12, 18, or 28
                </p>
            </div>

            {/* Drop Zone */}
            {!result && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !file && fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer ${dragOver
                        ? 'border-blue-400 bg-blue-50 scale-[1.01]'
                        : file
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={e => handleFile(e.target.files[0])}
                    />

                    <div className="py-10 px-6 text-center">
                        {file ? (
                            <>
                                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                                    <FileText size={24} className="text-emerald-600" />
                                </div>
                                <p className="font-black text-slate-900 text-sm">{file.name}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp; Ready to upload
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); reset(); }}
                                    className="mt-3 text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 mx-auto transition-colors"
                                >
                                    <X size={12} /> Remove
                                </button>
                            </>
                        ) : (
                            <>
                                <div className={`w-14 h-14 rounded-2xl ${dragOver ? 'bg-blue-100' : 'bg-slate-100'} flex items-center justify-center mx-auto mb-3 transition-colors`}>
                                    <Upload size={24} className={dragOver ? 'text-blue-600' : 'text-slate-400'} />
                                </div>
                                <p className="font-black text-slate-700 text-sm">
                                    {dragOver ? 'Drop your CSV here' : 'Drag & drop CSV file here'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">or click to browse &nbsp;·&nbsp; Max 500 rows, 5 MB</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {uploading && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Processing…</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                            <div>
                                <p className="text-2xl font-black text-emerald-700 leading-none">{result.success}</p>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Uploaded</p>
                            </div>
                        </div>
                        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${result.failed > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            {result.failed > 0
                                ? <XCircle size={20} className="text-red-500 shrink-0" />
                                : <CheckCircle2 size={20} className="text-slate-300 shrink-0" />}
                            <div>
                                <p className={`text-2xl font-black leading-none ${result.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>{result.failed}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${result.failed > 0 ? 'text-red-500' : 'text-slate-400'}`}>Failed</p>
                            </div>
                        </div>
                    </div>

                    {/* Error Table */}
                    {result.errors?.length > 0 && (
                        <div className="rounded-2xl border border-red-100 overflow-hidden">
                            <div className="bg-red-50 px-4 py-3 flex items-center gap-2 border-b border-red-100">
                                <AlertTriangle size={14} className="text-red-500" />
                                <p className="text-xs font-black text-red-700 uppercase tracking-widest">
                                    {result.errors.length} Row{result.errors.length > 1 ? 's' : ''} with Errors
                                </p>
                            </div>
                            <div className="divide-y divide-red-50 max-h-60 overflow-y-auto">
                                {result.errors.map((err, i) => (
                                    <div key={i} className="px-4 py-2.5 flex items-start gap-3 bg-white">
                                        <span className="shrink-0 text-[9px] font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-md uppercase tracking-widest mt-0.5">
                                            Row {err.row}
                                        </span>
                                        <ul className="flex-1 min-w-0">
                                            {err.messages.map((msg, j) => (
                                                <li key={j} className="text-xs text-red-600 font-medium">{msg}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={reset}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all"
                        >
                            <RefreshCw size={13} /> Upload Another
                        </button>
                        {result.success > 0 && (
                            <a
                                href="/admin/shopping"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                            >
                                View Products <ChevronRight size={13} />
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            {file && !result && (
                <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
                >
                    {uploading
                        ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                        : <><Package size={16} /> Upload Products</>
                    }
                </button>
            )}
        </div>
    );
}
