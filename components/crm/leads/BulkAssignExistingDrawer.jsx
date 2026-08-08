import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, X, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCSV, normalizeHeader } from '@/lib/csvParser';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function BulkAssignExistingDrawer({ onClose, onSave }) {
    const { user } = useAuth();
    const [step, setStep] = useState('upload'); 
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [assignResult, setAssignResult] = useState(null);

    const handleDownloadTemplate = () => {
        const commentRow = '# Instructions: Provide lead_id and the employee_email to assign the lead to.\n';
        const headerRow = 'lead_id,employee_email\n';
        const sampleRow = '550e8400-e29b-41d4-a716-446655440000,employee@example.com\n';

        const blob = new Blob([commentRow + headerRow + sampleRow], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk_assignment_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUploadAndPreview = async () => {
        if (!file) return;
        setProcessing(true);
        try {
            const text = await file.text();
            const allRows = parseCSV(text);
            if (allRows.length < 2) throw new Error('File is empty or only contains headers.');

            const normHeaders = allRows[0].map(normalizeHeader);
            const leadIdIdx = normHeaders.indexOf('lead_id');
            const emailIdx = normHeaders.indexOf('employee_email');

            if (leadIdIdx === -1 || emailIdx === -1) {
                throw new Error('CSV must contain lead_id and employee_email columns.');
            }

            const assignments = allRows.slice(1).map(row => ({
                lead_id: row[leadIdIdx]?.trim(),
                employee_email: row[emailIdx]?.trim().toLowerCase()
            })).filter(a => a.lead_id && a.employee_email);

            if (assignments.length === 0) throw new Error('No valid assignments found.');

            // Send to validation API (we will create this endpoint next)
            const res = await fetch('/api/crm/leads/bulk-assign/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignments })
            });

            if (!res.ok) throw new Error((await res.json()).error || 'Preview failed');

            setPreviewData(await res.json());
            setStep('preview');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleExecute = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/crm/leads/bulk-assign/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ valid_assignments: previewData.valid_assignments })
            });

            if (!res.ok) throw new Error((await res.json()).error || 'Execution failed');
            
            const result = await res.json();
            setAssignResult(result);
            toast.success(`Successfully assigned ${result.success_count} leads.`);
            onSave && onSave();
            setStep('result');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex font-[family-name:var(--font-outfit)]">
            <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full max-w-lg bg-white flex flex-col h-full shadow-2xl">
                
                <div className="p-6 border-b border-slate-100 flex justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Bulk Assign Existing Leads</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-bold ${step === 'upload' ? 'text-indigo-600' : 'text-slate-400'}`}>Upload</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className={`text-xs font-bold ${step === 'preview' ? 'text-indigo-600' : 'text-slate-400'}`}>Preview</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className={`text-xs font-bold ${step === 'result' ? 'text-indigo-600' : 'text-slate-400'}`}>Result</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-500" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <AnimatePresence mode="wait">
                        {step === 'upload' && (
                            <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 border shadow-sm">
                                    <div className="flex gap-3 mb-4">
                                        <FileText className="text-indigo-600" />
                                        <div>
                                            <h3 className="font-bold">Prepare Assignment CSV</h3>
                                            <p className="text-xs text-slate-500">Requires lead_id and employee_email.</p>
                                        </div>
                                    </div>
                                    <button onClick={handleDownloadTemplate} className="w-full text-sm font-bold text-indigo-700 bg-indigo-50 py-3 rounded-2xl hover:bg-indigo-100 transition-colors">Download Template</button>
                                </div>

                                <label className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer ${file ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                    <input type="file" accept=".csv" className="sr-only" onChange={e => setFile(e.target.files[0])} />
                                    <UploadCloud size={32} className={`mb-3 ${file ? 'text-indigo-500' : 'text-slate-300'}`} />
                                    <p className="font-bold text-slate-700">{file ? file.name : 'Upload CSV'}</p>
                                </label>
                            </motion.div>
                        )}

                        {step === 'preview' && previewData && (
                            <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 border shadow-sm">
                                    <h3 className="font-bold text-lg mb-4">Preview</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 p-4 rounded-xl">
                                            <p className="text-xs font-bold text-emerald-600 uppercase">Valid</p>
                                            <p className="text-3xl font-black text-emerald-700">{previewData.valid_count}</p>
                                        </div>
                                        <div className="bg-rose-50 p-4 rounded-xl">
                                            <p className="text-xs font-bold text-rose-600 uppercase">Invalid</p>
                                            <p className="text-3xl font-black text-rose-700">{previewData.invalid_count}</p>
                                        </div>
                                    </div>
                                    {previewData.invalid_count > 0 && (
                                        <div className="mt-4 bg-rose-100 text-rose-800 text-xs p-3 rounded-xl max-h-40 overflow-y-auto">
                                            <p className="font-bold mb-2">Errors (First 10):</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                {previewData.errors.slice(0, 10).map((e, i) => (
                                                    <li key={i}>{e}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === 'result' && assignResult && (
                            <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10">
                                <CheckCircle2 size={40} className="text-emerald-500 mb-4" />
                                <h2 className="text-2xl font-black">Assignment Complete</h2>
                                <p className="text-slate-500 mt-2">Assigned {assignResult.success_count} leads successfully.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-6 border-t bg-white flex gap-3">
                    {step === 'result' ? (
                        <button onClick={onClose} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-bold">Done</button>
                    ) : (
                        <>
                            <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold">Cancel</button>
                            {step === 'upload' && <button onClick={handleUploadAndPreview} disabled={!file || processing} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold">{processing ? '...' : 'Preview'}</button>}
                            {step === 'preview' && <button onClick={handleExecute} disabled={processing || previewData.valid_count === 0} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-bold">{processing ? '...' : 'Execute'}</button>}
                        </>
                    )}
                </div>

            </motion.div>
        </motion.div>
    );
}
