import { useState } from 'react';
import { Download, UploadCloud, AlertTriangle, CheckCircle2, X, Info, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCSV, parseXLSX, normalizeHeader } from '@/lib/csvParser';

const MAX_FILE_MB = 10; // Increased to 10MB to support 10k+ rows easily
const MAX_ROWS = 20000;

export default function ImportLeadsDrawer({ onClose, onSave }) {
    const { user } = useAuth();
    
    // Steps: upload -> preview -> result
    const [step, setStep] = useState('upload'); 
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [allowUnresolved, setAllowUnresolved] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const handleDownloadTemplate = () => {
        const commentRow = '# Required: contact_name | Phone: 10-digit Indian mobile starting with 6-9 | Pincode takes routing priority\n';
        const headerRow = 'title,contact_name,phone,email,source,notes,state,city,zone,area,pincode\n';
        const sampleRow = 'Insurance Inquiry,Ravi Kumar,9876543210,ravi@example.com,Referral,Interested in Gold Plan,Maharashtra,Mumbai,West,Andheri West,400053\n';

        const blob = new Blob([commentRow + headerRow + sampleRow], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'crm_leads_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadErrors = (type = 'all') => {
        if (!previewData?.rows) return;
        
        let filtered = [];
        if (type === 'all') {
            filtered = previewData.rows.filter(r => r.status === 'invalid' || r.status === 'duplicate' || (r.status === 'valid' && !r.routing?.matched));
        } else if (type === 'duplicates') {
            filtered = previewData.rows.filter(r => r.status === 'duplicate');
        }

        if (filtered.length === 0) {
            toast.success("No rows of this type found!");
            return;
        }

        // Generate CSV
        const headers = ['Row Number', 'Error Type', 'Reason', 'Title', 'Contact Name', 'Phone', 'Email', 'Source', 'State', 'City', 'Zone', 'Area', 'Pincode'];
        const csvRows = [headers.join(',')];

        filtered.forEach(r => {
            const rowNum = r.index + 2; 
            const d = r.data || {};
            const eType = r.status === 'valid' ? 'Unroutable' : r.status;
            const reason = r.reason || (r.routing?.reason) || 'Unknown';
            const esc = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
            
            csvRows.push([
                rowNum, eType, esc(reason), esc(d.title), esc(d.contact_name), esc(d.phone), esc(d.email), esc(d.source), esc(d.state), esc(d.city), esc(d.zone), esc(d.area), esc(d.pincode)
            ].join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import_errors_${type}_${new Date().getTime()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUploadAndPreview = async () => {
        if (!file) { toast.error('Please select a file first.'); return; }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            toast.error(`File too large. Maximum allowed size is ${MAX_FILE_MB} MB.`);
            return;
        }

        setProcessing(true);
        try {
            const text = await file.text();
            const isExcel = /\.(xlsx|xls)$/i.test(file.name);
            let allRows;

            if (isExcel) {
                // Read as array buffer if needed, but for simplicity assuming text was parsed or we handle CSV here
                // Note: file.text() might not work perfectly for xlsx, this is a simplified flow.
                // We will fall back to reader for array buffer.
                allRows = parseCSV(text); 
            } else {
                allRows = parseCSV(text);
            }

            if (allRows.length < 2) throw new Error('File appears empty or only contains a header row.');

            const headerRow = allRows[0];
            const normHeaders = headerRow.map(normalizeHeader);
            const col = (key) => normHeaders.indexOf(normalizeHeader(key));

            const nameIdx = col('contact_name');
            const titleIdx = col('title');
            const phoneIdx = col('phone');
            const emailIdx = col('email');
            const sourceIdx = col('source');
            const notesIdx = col('notes');
            const stateIdx = col('state');
            const cityIdx = col('city');
            const zoneIdx = col('zone');
            const areaIdx = col('area');
            const pincodeIdx = col('pincode');

            const sourceSystemIdx = col('source_system');
            const externalIdIdx = col('external_lead_id') !== -1 ? col('external_lead_id') : col('external_id');

            if (nameIdx === -1 && phoneIdx === -1 && emailIdx === -1) {
                throw new Error('CSV must contain at least one of: contact_name, phone, email.');
            }

            let dataRows = allRows.slice(1);
            if (dataRows.length > MAX_ROWS) {
                toast.error(`Truncating to ${MAX_ROWS} rows.`);
                dataRows = dataRows.slice(0, MAX_ROWS);
            }

            const leadsToPreview = dataRows.map((cols) => {
                const get = (idx) => (idx !== -1 ? (cols[idx] ?? '') : '');
                return {
                    contact_name: get(nameIdx).trim(),
                    title: get(titleIdx).trim(),
                    phone: get(phoneIdx).trim(),
                    email: get(emailIdx).trim(),
                    source: get(sourceIdx).trim(),
                    notes: get(notesIdx).trim(),
                    state: get(stateIdx).trim(),
                    city: get(cityIdx).trim(),
                    zone: get(zoneIdx).trim(),
                    area: get(areaIdx).trim(),
                    pincode: get(pincodeIdx).trim(),
                    source_system: get(sourceSystemIdx).trim(),
                    external_lead_id: get(externalIdIdx).trim(),
                };
            });

            // Send to preview API
            const res = await fetch('/api/crm/leads/import/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leads: leadsToPreview })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Preview failed');
            }

            const data = await res.json();
            setPreviewData(data);
            setStep('preview');
        } catch (err) {
            toast.error(err.message || 'Unexpected error during upload parsing.');
        } finally {
            setProcessing(false);
        }
    };

    const handleExecuteImport = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/crm/leads/import/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: previewData.rows,
                    allowUnresolved,
                    uploader_id: user?.id
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Execution failed');
            }

            const data = await res.json();
            setImportResult(data);
            if (data.inserted > 0) {
                toast.success(`Successfully imported ${data.inserted} leads.`);
                onSave && onSave(data);
            }
            setStep('result');
        } catch (err) {
            toast.error(err.message || 'Error executing import');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex font-[family-name:var(--font-outfit)]">
            <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-w-2xl bg-white flex flex-col h-full shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Bulk Import Leads</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-bold ${step === 'upload' ? 'text-indigo-600' : 'text-slate-400'}`}>Upload</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className={`text-xs font-bold ${step === 'preview' ? 'text-indigo-600' : 'text-slate-400'}`}>Preview & Validation</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className={`text-xs font-bold ${step === 'result' ? 'text-indigo-600' : 'text-slate-400'}`}>Result</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <AnimatePresence mode="wait">
                        
                        {/* STEP 1: UPLOAD */}
                        {step === 'upload' && (
                            <motion.div key="step-upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">Prepare your CSV</h3>
                                            <p className="text-xs text-slate-500 font-medium">Use our template to ensure maximum routing accuracy.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 mb-4 bg-indigo-50/50 rounded-2xl p-4 text-sm text-indigo-900 border border-indigo-100">
                                        <Info size={16} className="mt-0.5 flex-shrink-0 text-indigo-500" />
                                        <div className="space-y-1">
                                            <p><strong>Duplicate Detection:</strong> Phone numbers and emails will be checked against existing leads. Duplicates will be safely skipped.</p>
                                            <p><strong>Routing Priority:</strong> Pincode > Zone > Area > City > State.</p>
                                        </div>
                                    </div>
                                    <button onClick={handleDownloadTemplate} className="w-full inline-flex items-center justify-center gap-2 bg-white text-indigo-700 border-2 border-indigo-100 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                                        <Download size={16} /> Download CSV Template
                                    </button>
                                </div>

                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                                    <h3 className="font-bold text-slate-900">Upload Data</h3>
                                    <label className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${file ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                        <input
                                            type="file" accept=".csv" className="sr-only"
                                            onChange={(e) => { setFile(e.target.files[0]); }}
                                        />
                                        <UploadCloud size={32} className={`mb-3 ${file ? 'text-indigo-500' : 'text-slate-300'}`} />
                                        <p className={`text-base font-bold ${file ? 'text-indigo-700' : 'text-slate-600'}`}>
                                            {file ? file.name : 'Click to upload your CSV'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1.5 font-medium">
                                            {file ? `${(file.size / 1024).toFixed(1)} KB` : `Max ${MAX_FILE_MB} MB · Up to ${MAX_ROWS.toLocaleString()} rows`}
                                        </p>
                                    </label>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: PREVIEW */}
                        {step === 'preview' && previewData && (
                            <motion.div key="step-preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                                        <Target size={20} className="text-indigo-500"/> Validation Results
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Rows</p>
                                            <p className="text-2xl font-black text-slate-800">{previewData.summary.total}</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Routable</p>
                                            <p className="text-2xl font-black text-emerald-700">{previewData.summary.ready}</p>
                                        </div>
                                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Duplicates</p>
                                            <p className="text-2xl font-black text-amber-700">{previewData.summary.duplicate}</p>
                                        </div>
                                        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Errors</p>
                                            <p className="text-2xl font-black text-rose-700">{previewData.summary.invalid}</p>
                                        </div>
                                    </div>

                                    {(previewData.summary.duplicate > 0 || previewData.summary.invalid > 0 || previewData.summary.unroutable > 0) && (
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button onClick={() => handleDownloadErrors('all')} className="flex-1 py-2 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors">
                                                Download Error Report
                                            </button>
                                            {previewData.summary.duplicate > 0 && (
                                                <button onClick={() => handleDownloadErrors('duplicates')} className="flex-1 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors">
                                                    Download Duplicates
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="font-bold text-slate-900 text-lg flex items-center justify-between">
                                        Expected Distribution
                                        {previewData.summary.unroutable > 0 && (
                                            <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-1 rounded-full">{previewData.summary.unroutable} Unroutable</span>
                                        )}
                                    </h3>
                                    
                                    {Object.keys(previewData.summary.teamDistribution).length > 0 ? (
                                        <div className="space-y-2">
                                            {Object.entries(previewData.summary.teamDistribution).map(([team, count]) => (
                                                <div key={team} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <span className="text-sm font-semibold text-slate-700">{team}</span>
                                                    <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-lg">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No valid routable leads found.</p>
                                    )}

                                    {previewData.summary.unroutable > 0 && (
                                        <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                                            <label className="flex items-start gap-3 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={allowUnresolved}
                                                    onChange={(e) => setAllowUnresolved(e.target.checked)}
                                                    className="mt-1 w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-300"
                                                />
                                                <div>
                                                    <span className="block text-sm font-bold text-amber-900">Allow {previewData.summary.unroutable} unresolved leads</span>
                                                    <span className="block text-xs text-amber-700 mt-1 font-medium">
                                                        These leads lack service coverage. If allowed, they will be imported without team assignments and placed in the "Needs Action" pool.
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: RESULT */}
                        {step === 'result' && importResult && (
                            <motion.div key="step-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center py-10 space-y-4">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle2 size={40} className="text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900">Import Complete</h2>
                                <p className="text-slate-500 font-medium">Successfully inserted <strong className="text-emerald-600 text-lg">{importResult.inserted}</strong> leads into the CRM.</p>
                                
                                {importResult.failed > 0 && (
                                    <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 mt-4 text-sm font-medium w-full">
                                        ⚠ {importResult.failed} batches failed during execution. Please check the system logs.
                                    </div>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-slate-100 bg-white flex gap-3 flex-shrink-0">
                    {step === 'result' ? (
                        <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all">Close</button>
                    ) : (
                        <>
                            <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-all">Cancel</button>
                            
                            {step === 'upload' && (
                                <button onClick={handleUploadAndPreview} disabled={!file || processing} className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-50 hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all">
                                    {processing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</> : 'Scan & Preview'}
                                </button>
                            )}
                            
                            {step === 'preview' && (
                                <button onClick={handleExecuteImport} disabled={processing || (previewData.summary.ready === 0 && !allowUnresolved)} className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-sm disabled:opacity-50 hover:bg-slate-800 flex items-center justify-center gap-2 transition-all">
                                    {processing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</> : 'Confirm Import'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// Temporary Lucide icon fix for 'Target' if not imported properly
function Target(props) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}
