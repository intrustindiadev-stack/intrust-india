import { useState } from 'react';
import { Download, UploadCloud, AlertTriangle, CheckCircle2, X, Info } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { CrmLeadCsvRowSchema } from '@/lib/crm/validation';
import { parseCSV, parseXLSX, normalizeHeader } from '@/lib/csvParser';

const MAX_FILE_MB = 5;
const MAX_ROWS    = 1000;
const BATCH_SIZE  = 50;

export default function ImportLeadsDrawer({ onClose, onSave }) {
    const { user } = useAuth();
    const [file, setFile]           = useState(null);
    const [uploading, setUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const handleDownloadTemplate = () => {
        const commentRow  = '# Required: contact_name | Phone: 10-digit Indian mobile starting with 6-9 (e.g. 9876543210) | Status auto-set to "new"\n';
        const headerRow   = 'title,contact_name,phone,email,source,notes,state,city,zone,area,pincode\n';
        const sampleRow   = 'Insurance Inquiry,Ravi Kumar,9876543210,ravi@example.com,Referral,Interested in Gold Plan,Maharashtra,Mumbai,West,Andheri West,400053\n';

        const blob = new Blob([commentRow + headerRow + sampleRow], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'crm_leads_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUpload = async () => {
        if (!file) { toast.error('Please select a file first.'); return; }

        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            toast.error(`File too large. Maximum allowed size is ${MAX_FILE_MB} MB.`);
            return;
        }

        setUploading(true);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;

                const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                let allRows;

                if (isExcel) {
                    allRows = await parseXLSX(e.target.result);
                } else {
                    allRows = parseCSV(e.target.result);
                }

                if (allRows.length < 2) {
                    throw new Error('File appears empty or only contains a header row.');
                }

                const headerRow    = allRows[0];
                const normHeaders  = headerRow.map(normalizeHeader);

                const col = (key) => normHeaders.indexOf(normalizeHeader(key));
                const nameIdx   = col('contact_name');
                const titleIdx  = col('title');
                const phoneIdx  = col('phone');
                const emailIdx  = col('email');
                const sourceIdx = col('source');
                const notesIdx  = col('notes');
                const stateIdx  = col('state');
                const cityIdx   = col('city');
                const zoneIdx   = col('zone');
                const areaIdx   = col('area');
                const pincodeIdx = col('pincode');

                if (nameIdx === -1 && phoneIdx === -1 && emailIdx === -1) {
                    throw new Error(
                        'CSV must contain at least one of: contact_name, phone, email. ' +
                        'Please download the template and check your column headers.'
                    );
                }

                let dataRows  = allRows.slice(1);
                let truncated = 0;
                if (dataRows.length > MAX_ROWS) {
                    truncated = dataRows.length - MAX_ROWS;
                    dataRows  = dataRows.slice(0, MAX_ROWS);
                }

                const leadsToInsert  = [];
                const rowMeta        = [];
                const rowErrors      = [];
                const seenPhones     = new Map();
                const seenEmails     = new Map();
                const duplicateRows  = new Set();

                for (let i = 0; i < dataRows.length; i++) {
                    const csvRowNumber = i + 2; 
                    const cols         = dataRows[i];
                    const get          = (idx) => (idx !== -1 ? (cols[idx] ?? '') : '');

                    const rawContact = get(nameIdx).trim();
                    const rawTitle   = get(titleIdx).trim();
                    const rawPhone   = get(phoneIdx).trim();
                    const rawEmail   = get(emailIdx).trim().toLowerCase();
                    const rawSource  = get(sourceIdx).trim();
                    const rawNotes   = get(notesIdx).trim();
                    const rawState   = get(stateIdx).trim();
                    const rawCity    = get(cityIdx).trim();
                    const rawZone    = get(zoneIdx).trim();
                    const rawArea    = get(areaIdx).trim();
                    const rawPincode = get(pincodeIdx).trim();

                    const parsed = CrmLeadCsvRowSchema.safeParse({
                        contact_name: rawContact || undefined,
                        title:        rawTitle   || undefined,
                        phone:        rawPhone   || undefined,
                        email:        rawEmail   || undefined,
                        source:       rawSource  || undefined,
                        notes:        rawNotes   || undefined,
                        state:        rawState   || undefined,
                        city:         rawCity    || undefined,
                        zone:         rawZone    || undefined,
                        area:         rawArea    || undefined,
                        pincode:      rawPincode || undefined,
                    });

                    if (!parsed.success) {
                        parsed.error.issues.forEach((issue) => {
                            rowErrors.push({
                                row:    csvRowNumber,
                                field:  issue.path[0] ?? 'unknown',
                                reason: issue.message,
                            });
                        });
                        continue; 
                    }

                    if (!rawContact && !rawPhone && !rawEmail) {
                        rowErrors.push({
                            row:    csvRowNumber,
                            field:  'contact_name / phone / email',
                            reason: 'Row is empty — at least one identifier is required',
                        });
                        continue;
                    }

                    if (rawPhone) {
                        if (seenPhones.has(rawPhone)) {
                            duplicateRows.add(csvRowNumber);
                            duplicateRows.add(seenPhones.get(rawPhone));
                        } else {
                            seenPhones.set(rawPhone, csvRowNumber);
                        }
                    }
                    if (rawEmail) {
                        if (seenEmails.has(rawEmail)) {
                            duplicateRows.add(csvRowNumber);
                            duplicateRows.add(seenEmails.get(rawEmail));
                        } else {
                            seenEmails.set(rawEmail, csvRowNumber);
                        }
                    }

                    leadsToInsert.push({
                        title:        rawTitle || rawContact || 'Imported Lead',
                        contact_name: rawContact || 'Unknown',
                        phone:        rawPhone  || null,
                        email:        rawEmail  || null,
                        source:       rawSource || 'CSV Import',
                        status:       'new',
                        pipeline_stage: 'new',
                        notes:        rawNotes,
                        state:        rawState  || null,
                        city:         rawCity   || null,
                        zone:         rawZone   || null,
                        area:         rawArea   || null,
                        pincode:      rawPincode || null,
                        created_by:   user?.id,
                        assigned_to:  user?.id,
                    });
                    rowMeta.push(csvRowNumber);
                }

                if (leadsToInsert.length === 0) {
                    setImportResult({ imported: 0, skipped: rowErrors.length, truncated, duplicateCount: duplicateRows.size, rowErrors });
                    toast.error('No valid rows to import. See the error panel below.');
                    return;
                }

                const successfullyImported = [];
                let dbSkipped              = 0;
                const dbErrors             = [];

                for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
                    const batch     = leadsToInsert.slice(i, i + BATCH_SIZE);
                    const batchMeta = rowMeta.slice(i, i + BATCH_SIZE);

                    const { data, error } = await supabase
                        .from('crm_leads')
                        .insert(batch)
                        .select();

                    if (error) {
                        dbSkipped += batch.length;
                        batchMeta.forEach((rowNum) => {
                            dbErrors.push({ row: rowNum, field: 'DB', reason: error.message });
                        });
                    } else {
                        successfullyImported.push(...(data || []));
                    }
                }

                const totalImported = successfullyImported.length;
                const allErrors     = [...rowErrors, ...dbErrors];
                const result = {
                    imported:       totalImported,
                    skipped:        allErrors.length,
                    truncated,
                    duplicateCount: duplicateRows.size,
                    rowErrors:      allErrors,
                };
                setImportResult(result);

                if (totalImported > 0) {
                    onSave && onSave(successfullyImported);
                    toast.success(`Imported ${totalImported} lead${totalImported !== 1 ? 's' : ''}!`);
                    if (allErrors.length === 0) {
                        onClose();
                    }
                } else {
                    toast.error('Import failed — no leads were saved. Review the errors below.');
                }
            } catch (err) {
                toast.error(err.message || 'Unexpected error during import.');
            } finally {
                setUploading(false);
            }
        };

        const isExcel = /\.(xlsx|xls)$/i.test(file.name);
        if (isExcel) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file, 'UTF-8');
        }
    };

    const handleReset = () => { setFile(null); setImportResult(null); };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-lg bg-white flex flex-col h-full shadow-2xl"
            >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Import Leads</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Bulk upload via CSV · max {MAX_ROWS} rows · {MAX_FILE_MB} MB</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {importResult && (
                        <div className="space-y-3">
                            <div className={`rounded-2xl p-4 border ${importResult.imported > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {importResult.imported > 0
                                        ? <CheckCircle2 size={16} className="text-emerald-600" />
                                        : <AlertTriangle size={16} className="text-rose-500" />
                                    }
                                    <span className="font-bold text-sm text-gray-900">
                                        {importResult.imported > 0
                                            ? `${importResult.imported} lead${importResult.imported !== 1 ? 's' : ''} imported successfully`
                                            : 'Import failed — no leads saved'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                    {importResult.skipped > 0 && <span>⚠ {importResult.skipped} row{importResult.skipped !== 1 ? 's' : ''} skipped</span>}
                                    {importResult.truncated > 0 && <span>✂ {importResult.truncated} row{importResult.truncated !== 1 ? 's' : ''} truncated (limit: {MAX_ROWS})</span>}
                                    {importResult.duplicateCount > 0 && (
                                        <span className="text-amber-600 font-semibold">
                                            ⚠ {importResult.duplicateCount} row{importResult.duplicateCount !== 1 ? 's' : ''} may contain duplicate contacts — please review
                                        </span>
                                    )}
                                </div>
                            </div>

                            {importResult.rowErrors.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <AlertTriangle size={12} className="text-amber-500" /> Validation Errors ({importResult.rowErrors.length})
                                    </p>
                                    <div className="border border-rose-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-rose-50 border-b border-rose-100">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-bold text-rose-700 w-14">Row</th>
                                                    <th className="px-3 py-2 text-left font-bold text-rose-700 w-28">Field</th>
                                                    <th className="px-3 py-2 text-left font-bold text-rose-700">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-rose-50">
                                                {importResult.rowErrors.map((e, idx) => (
                                                    <tr key={idx} className="hover:bg-rose-50/50">
                                                        <td className="px-3 py-1.5 font-mono font-bold text-rose-600">{e.row}</td>
                                                        <td className="px-3 py-1.5 text-gray-600 font-medium">{e.field}</td>
                                                        <td className="px-3 py-1.5 text-gray-500">{e.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleReset}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                            >
                                Upload a different file
                            </button>
                        </div>
                    )}

                    {!importResult && (
                        <>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                                <h3 className="font-bold text-indigo-900 mb-1 text-sm">1. Download Template</h3>
                                <p className="text-xs text-indigo-700 mb-3">
                                    Columns: <code className="font-mono bg-indigo-100 px-1 rounded">title, contact_name, phone, email, source, notes, state, city, zone, area, pincode</code>
                                    <span className="block mt-1 text-indigo-500">Zone and pincode fields enable automatic team allocation.</span>
                                </p>
                                <div className="flex items-start gap-2 mb-3 bg-white/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800">
                                    <Info size={13} className="mt-0.5 flex-shrink-0 text-indigo-400" />
                                    <span>Phone must be a 10-digit Indian mobile number starting with 6–9 (e.g. <code className="font-mono">9876543210</code>). Rows with invalid data are skipped and shown in an error report.</span>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="inline-flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors"
                                >
                                    <Download size={14} /> Download CSV Template
                                </button>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-bold text-gray-900 text-sm">2. Upload Your File</h3>
                                <label className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${file ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'}`}>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="sr-only"
                                        onChange={(e) => { setFile(e.target.files[0]); setImportResult(null); }}
                                    />
                                    <UploadCloud size={28} className={`mb-2 ${file ? 'text-indigo-500' : 'text-gray-300'}`} />
                                    <p className={`text-sm font-semibold ${file ? 'text-indigo-700' : 'text-gray-500'}`}>
                                        {file ? file.name : 'Click or drag a .csv or .xlsx file here'}
                                    </p>
                                    {file
                                        ? <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                        : <p className="text-xs text-gray-400 mt-1">Max {MAX_FILE_MB} MB · {MAX_ROWS} rows · CSV or Excel (.xlsx)</p>
                                    }
                                </label>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
                    >
                        {importResult?.imported > 0 ? 'Done' : 'Cancel'}
                    </button>
                    {!importResult && (
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                            {uploading
                                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                                : <><UploadCloud size={15} /> Import Leads</>
                            }
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
