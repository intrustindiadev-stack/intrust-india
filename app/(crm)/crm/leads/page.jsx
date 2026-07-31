'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Phone, Mail, X, RefreshCw, User, MapPin, Briefcase, Download, UploadCloud, Edit2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ContactActions from '@/components/shared/ContactActions';
import { CrmLeadCreateSchema, CrmLeadCsvRowSchema } from '@/lib/crm/validation';
import { parseCSV, normalizeHeader } from '@/lib/csvParser';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

const STATUS_STYLE = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-amber-50 text-amber-700 border-amber-200',
    qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    proposal: 'bg-purple-50 text-purple-700 border-purple-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-rose-50 text-rose-700 border-rose-200',
};

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_MB = 5;
const MAX_ROWS    = 1000;
const BATCH_SIZE  = 50;

// ─── ImportLeadsDrawer ────────────────────────────────────────────────────────
/**
 * Production-grade CSV bulk-import drawer.
 *
 * Fixes applied vs. the previous inline implementation:
 *   1. Uses shared parseCSV() + normalizeHeader() from lib/csvParser.js
 *      (which now strips BOM produced by Excel exports)
 *   2. Wires CrmLeadCsvRowSchema.safeParse() – Zod is no longer bypassed
 *   3. File-size guard: rejects files > MAX_FILE_MB MB before reading
 *   4. Row-limit gate: truncates to MAX_ROWS data rows, shows warning
 *   5. Structured per-row error panel in the UI (row number + field + reason)
 *   6. Detects within-CSV duplicate phone/email values; warns user
 *   7. Batch insert: one supabase.insert(batch) call per 50 rows (was N×1)
 *   8. Template includes a comment-row guideline for the user
 */
function ImportLeadsDrawer({ onClose, onSave }) {
    const { user } = useAuth();
    const [file, setFile]           = useState(null);
    const [uploading, setUploading] = useState(false);
    // null  = initial state
    // object = { imported, skipped, truncated, duplicateCount, rowErrors[] }
    const [importResult, setImportResult] = useState(null);

    // ── Template Download ─────────────────────────────────────────────────────
    const handleDownloadTemplate = () => {
        const commentRow  = '# Required: contact_name | Phone: 10-digit Indian mobile starting with 6-9 (e.g. 9876543210) | Status auto-set to "new"\n';
        const headerRow   = 'title,contact_name,phone,email,source,notes\n';
        const sampleRow   = 'Insurance Inquiry,Ravi Kumar,9876543210,ravi@example.com,Referral,Interested in Gold Plan\n';

        const blob = new Blob([commentRow + headerRow + sampleRow], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'crm_leads_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Upload & Parse ────────────────────────────────────────────────────────
    const handleUpload = async () => {
        if (!file) { toast.error('Please select a CSV file first.'); return; }

        // Guard 1 — File size
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

                // ── Step 1: Parse CSV (shared, BOM-safe parser) ───────────────
                const allRows = parseCSV(text);

                if (allRows.length < 2) {
                    throw new Error('File appears empty or only contains a header row.');
                }

                // Normalise headers — strips symbols, spaces, case-insensitive
                const headerRow    = allRows[0];
                const normHeaders  = headerRow.map(normalizeHeader);

                // Build column-index map
                const col = (key) => normHeaders.indexOf(normalizeHeader(key));
                const nameIdx   = col('contact_name');
                const titleIdx  = col('title');
                const phoneIdx  = col('phone');
                const emailIdx  = col('email');
                const sourceIdx = col('source');
                const notesIdx  = col('notes');

                if (nameIdx === -1 && phoneIdx === -1 && emailIdx === -1) {
                    throw new Error(
                        'CSV must contain at least one of: contact_name, phone, email. ' +
                        'Please download the template and check your column headers.'
                    );
                }

                // ── Step 2: Row-count guard (truncate, don't reject) ──────────
                let dataRows  = allRows.slice(1);
                let truncated = 0;
                if (dataRows.length > MAX_ROWS) {
                    truncated = dataRows.length - MAX_ROWS;
                    dataRows  = dataRows.slice(0, MAX_ROWS);
                }

                // ── Step 3: Validate each row via Zod + collect errors ────────
                const leadsToInsert  = [];
                const rowMeta        = [];    // parallel array: which CSV row each lead came from
                const rowErrors      = [];    // { row, field, reason }
                const seenPhones     = new Map(); // for intra-CSV duplicate detection
                const seenEmails     = new Map();
                const duplicateRows  = new Set();

                for (let i = 0; i < dataRows.length; i++) {
                    const csvRowNumber = i + 2; // +1 header, +1 for 1-indexed display
                    const cols         = dataRows[i];
                    const get          = (idx) => (idx !== -1 ? (cols[idx] ?? '') : '');

                    const rawContact = get(nameIdx).trim();
                    const rawTitle   = get(titleIdx).trim();
                    const rawPhone   = get(phoneIdx).trim();
                    const rawEmail   = get(emailIdx).trim().toLowerCase();
                    const rawSource  = get(sourceIdx).trim();
                    const rawNotes   = get(notesIdx).trim();

                    // Validate via CrmLeadCsvRowSchema (the authoritative Zod schema)
                    const parsed = CrmLeadCsvRowSchema.safeParse({
                        contact_name: rawContact || undefined,
                        title:        rawTitle   || undefined,
                        phone:        rawPhone   || undefined,
                        email:        rawEmail   || undefined,
                        source:       rawSource  || undefined,
                        notes:        rawNotes   || undefined,
                    });

                    if (!parsed.success) {
                        // Surface each Zod issue as a distinct row error
                        parsed.error.issues.forEach((issue) => {
                            rowErrors.push({
                                row:    csvRowNumber,
                                field:  issue.path[0] ?? 'unknown',
                                reason: issue.message,
                            });
                        });
                        continue; // skip this row
                    }

                    // Minimum identity check: at least one of name/phone/email required
                    if (!rawContact && !rawPhone && !rawEmail) {
                        rowErrors.push({
                            row:    csvRowNumber,
                            field:  'contact_name / phone / email',
                            reason: 'Row is empty — at least one identifier is required',
                        });
                        continue;
                    }

                    // Intra-CSV duplicate detection
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
                        created_by:   user.id,
                        assigned_to:  user.id,
                    });
                    rowMeta.push(csvRowNumber);
                }

                if (leadsToInsert.length === 0) {
                    setImportResult({ imported: 0, skipped: rowErrors.length, truncated, duplicateCount: duplicateRows.size, rowErrors });
                    toast.error('No valid rows to import. See the error panel below.');
                    return;
                }

                // ── Step 4: Batch insert (one call per BATCH_SIZE rows) ────────
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
                        // Entire batch failed — attribute error to all rows in batch
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
                    onSave(successfullyImported);
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
        reader.readAsText(file, 'UTF-8');
    };

    const handleReset = () => { setFile(null); setImportResult(null); };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-lg bg-white flex flex-col h-full shadow-2xl"
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Import Leads</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Bulk upload via CSV · max {MAX_ROWS} rows · {MAX_FILE_MB} MB</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* ── Result Panel ── */}
                    {importResult && (
                        <div className="space-y-3">
                            {/* Summary row */}
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

                            {/* Per-row error table */}
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

                            {/* Try again button */}
                            <button
                                onClick={handleReset}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                            >
                                Upload a different file
                            </button>
                        </div>
                    )}

                    {/* ── Upload Flow (hidden after result) ── */}
                    {!importResult && (
                        <>
                            {/* Step 1 */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                                <h3 className="font-bold text-indigo-900 mb-1 text-sm">1. Download Template</h3>
                                <p className="text-xs text-indigo-700 mb-3">
                                    Columns: <code className="font-mono bg-indigo-100 px-1 rounded">title, contact_name, phone, email, source, notes</code>
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

                            {/* Step 2 */}
                            <div className="space-y-2">
                                <h3 className="font-bold text-gray-900 text-sm">2. Upload Your File</h3>
                                <label className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${file ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'}`}>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="sr-only"
                                        onChange={(e) => { setFile(e.target.files[0]); setImportResult(null); }}
                                    />
                                    <UploadCloud size={28} className={`mb-2 ${file ? 'text-indigo-500' : 'text-gray-300'}`} />
                                    <p className={`text-sm font-semibold ${file ? 'text-indigo-700' : 'text-gray-500'}`}>
                                        {file ? file.name : 'Click or drag a .csv file here'}
                                    </p>
                                    {file
                                        ? <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                        : <p className="text-xs text-gray-400 mt-1">Max {MAX_FILE_MB} MB · {MAX_ROWS} rows · UTF-8 or Excel CSV</p>
                                    }
                                </label>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
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

function AddLeadDrawer({ onClose, onSave }) {
    const { user } = useAuth();
    const [form, setForm] = useState({ title: '', contact_name: '', phone: '', email: '', source: '', status: 'new', notes: '' });
    const [saving, setSaving] = useState(false);
    const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        const validation = CrmLeadCreateSchema.safeParse(form);
        if (!validation.success) {
            toast.error(validation.error.issues[0]?.message || 'Invalid lead details');
            return;
        }
        setSaving(true);
        try {
            const valid = validation.data;
            const { data, error } = await supabase.from('crm_leads').insert([{
                ...valid,
                title: valid.title || valid.contact_name,
                created_by: user?.id,
                assigned_to: user?.id,
            }]).select().single();
            if (error) throw error;
            toast.success('Lead added successfully!');
            onSave(data);
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl"
            >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Add New Lead</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Fill in the prospect&apos;s details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {[
                        { label: 'Contact Name *', key: 'contact_name', icon: User, placeholder: 'Full name' },
                        { label: 'Lead Title', key: 'title', icon: Briefcase, placeholder: 'e.g. Insurance inquiry' },
                        { label: 'Phone', key: 'phone', icon: Phone, placeholder: '10-digit mobile' },
                        { label: 'Email', key: 'email', icon: Mail, placeholder: 'email@example.com', type: 'email' },
                        { label: 'Source', key: 'source', icon: MapPin, placeholder: 'e.g. Referral, Website' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">{f.label}</label>
                            <div className="relative">
                                <f.icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={f.type || 'text'}
                                    value={form[f.key]}
                                    onChange={e => up(f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                    ))}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Status</label>
                        <select value={form.status} onChange={e => up('status', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Notes</label>
                        <textarea value={form.notes} onChange={e => up('notes', e.target.value)} rows={3} placeholder="Initial notes..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : 'Add Lead'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function UpdateStatusDrawer({ lead, salesTeam = [], isManager = false, onClose, onUpdate }) {
    const [status, setStatus] = useState(lead?.status || 'new');
    const [assignedTo, setAssignedTo] = useState(lead?.assigned_to || '');
    const [notes, setNotes] = useState(lead?.notes || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = { status, notes, updated_at: new Date().toISOString() };
            if (isManager && assignedTo) {
                updates.assigned_to = assignedTo;
            }
            const { error } = await supabase.from('crm_leads').update(updates).eq('id', lead.id);
            if (error) throw error;
            toast.success('Lead updated!');
            onUpdate({ ...lead, ...updates });
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{lead?.contact_name || lead?.title}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Update lead status, owner & notes</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
                        {lead?.phone && <p className="flex items-center gap-2 text-gray-600"><Phone size={13} className="text-gray-400" />{lead.phone}</p>}
                        {lead?.email && <p className="flex items-center gap-2 text-gray-600"><Mail size={13} className="text-gray-400" />{lead.email}</p>}
                        {lead?.source && <p className="flex items-center gap-2 text-gray-600"><MapPin size={13} className="text-gray-400" />Source: {lead.source}</p>}
                        
                        <div className="pt-2 border-t border-gray-200/60">
                            <ContactActions phone={lead?.phone} email={lead?.email} name={lead?.contact_name || lead?.title} />
                        </div>
                    </div>

                    {isManager && salesTeam.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Assigned Sales Executive</label>
                            <select
                                value={assignedTo}
                                onChange={e => setAssignedTo(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-800"
                            >
                                <option value="">Unassigned</option>
                                {salesTeam.map(user => (
                                    <option key={user.id} value={user.id}>{user.full_name || user.email} ({user.role})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Pipeline Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {STATUSES.map(s => (
                                <button key={s} onClick={() => setStatus(s)} className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all capitalize ${status === s ? STATUS_STYLE[s] + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Add call notes, follow-up reminders..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function LeadsPage() {
    const router = useRouter();
    const { profile } = useAuth();
    
    const [leads, setLeads] = useState([]);
    const [salesTeam, setSalesTeam] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAdd, setShowAdd] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);

    const isManager = profile && ['relationship_manager', 'admin', 'super_admin'].includes(profile.role);

    const fetchSalesTeam = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('user_profiles')
                .select('id, full_name, role, email')
                .in('role', ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'])
                .order('full_name', { ascending: true });
            if (data) setSalesTeam(data);
        } catch (err) {
            console.error('Failed to fetch sales team:', err);
        }
    }, []);

    const fetchLeads = useCallback(async () => {
        try {
            let q = supabase
                .from('crm_leads')
                .select('*')
                .is('archived_at', null)
                .neq('source', 'App User')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') q = q.eq('status', statusFilter);
            
            // RBAC: Executives only see assigned leads
            if (profile && !['relationship_manager', 'admin', 'super_admin'].includes(profile.role)) {
                q = q.eq('assigned_to', profile.id);
            }
            
            const { data, error } = await q;
            if (error) throw error;

            const leadsMapped = (data || []).map(l => ({
                ...l,
                user_profiles: l.assigned_to ? { full_name: salesTeam.find(s => s.id === l.assigned_to)?.full_name } : null
            }));

            setLeads(leadsMapped);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load leads');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, profile, salesTeam]);

    useEffect(() => {
        fetchLeads();
        fetchSalesTeam();
        let timer;
        const debouncedFetch = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                fetchLeads();
            }, 300);
        };
        const ch = supabase.channel('crm_leads_list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, debouncedFetch)
            .subscribe();
        return () => {
            clearTimeout(timer);
            supabase.removeChannel(ch);
        };
    }, [fetchLeads, fetchSalesTeam]);

    const filtered = leads.filter(l =>
        !search ||
        l.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.phone?.includes(search)
    );

    const handleLeadAdded = (newLead) => setLeads(prev => [newLead, ...prev]);
    const handleLeadsImported = (newLeads) => setLeads(prev => [...newLeads, ...prev]);
    const handleLeadUpdated = (updated) => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-screen">
            <AnimatePresence>
                {showAdd && <AddLeadDrawer onClose={() => setShowAdd(false)} onSave={handleLeadAdded} />}
                {showImport && <ImportLeadsDrawer onClose={() => setShowImport(false)} onSave={handleLeadsImported} />}
                {selectedLead && <UpdateStatusDrawer lead={selectedLead} salesTeam={salesTeam} isManager={isManager} onClose={() => setSelectedLead(null)} onUpdate={handleLeadUpdated} />}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Leads</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{filtered.length} lead{filtered.length !== 1 ? 's' : ''} · tap a row to update status or assign owner</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={fetchLeads} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                    <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm">
                        <UploadCloud size={16} /> Import CSV
                    </button>
                    <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 text-sm">
                        <Plus size={16} /> New Lead
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[2rem] border-none shadow-xl shadow-gray-200/40 p-4 flex flex-col sm:flex-row gap-4 mb-2">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text" placeholder="Search by name, phone, email..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Status</option>
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
            </div>

            {/* Mobile cards + Desktop table */}
            {isLoading ? (
                <>
                    {/* Mobile skeleton cards */}
                    <div className="space-y-4 lg:hidden">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-white rounded-[2rem] border-none shadow-xl shadow-gray-200/40 p-5 animate-pulse">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                                        <div className="space-y-2">
                                            <div className="h-4 bg-gray-200 rounded-lg w-32" />
                                            <div className="h-3 bg-gray-100 rounded w-24" />
                                        </div>
                                    </div>
                                    <div className="h-6 w-16 bg-gray-100 rounded-lg flex-shrink-0" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop skeleton table */}
                    <div className="hidden lg:block bg-white rounded-[2.5rem] border-none shadow-xl shadow-gray-200/40 overflow-hidden animate-pulse">
                        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex gap-6">
                            {['w-48', 'w-36', 'w-28', 'w-20', 'w-20', 'w-16'].map((w, i) => (
                                <div key={i} className={`h-3 ${w} bg-gray-200 rounded`} />
                            ))}
                        </div>
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="flex items-center gap-6 px-6 py-4 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                                    <div className="space-y-1.5">
                                        <div className="h-3.5 bg-gray-200 rounded w-32" />
                                        <div className="h-2.5 bg-gray-100 rounded w-24" />
                                    </div>
                                </div>
                                <div className="space-y-1.5 w-36">
                                    <div className="h-3 bg-gray-100 rounded w-full" />
                                    <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                                </div>
                                <div className="h-3 bg-gray-100 rounded w-24" />
                                <div className="h-6 bg-gray-100 rounded-lg w-20" />
                                <div className="h-3 bg-gray-100 rounded w-16" />
                                <div className="h-8 w-8 bg-gray-100 rounded-xl" />
                            </div>
                        ))}
                    </div>
                </>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border-none shadow-xl shadow-gray-200/40 p-16 text-center">
                    <Briefcase size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium">No leads found</p>
                    <p className="text-sm text-gray-400 mt-1">{search ? 'Try a different search' : 'Add your first lead to get started'}</p>
                    <button onClick={() => setShowAdd(true)} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
                        <Plus size={15} /> Add Lead
                    </button>
                </div>
            ) : (
                <>
                    {/* Mobile: cards */}
                    <div className="space-y-4 lg:hidden">
                        {filtered.map(lead => (
                            <motion.div key={lead.id} layout onClick={() => router.push('/crm/leads/' + lead.id)}
                                className="bg-white rounded-[2rem] border-none shadow-xl shadow-gray-200/40 p-5 cursor-pointer hover:shadow-2xl hover:shadow-indigo-200/40 hover:-translate-y-1 transition-all duration-300 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                                            {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate">{lead.contact_name || lead.title}</p>
                                            {lead.title && lead.contact_name && <p className="text-xs text-gray-400 truncate">{lead.title}</p>}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }} 
                                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border capitalize flex-shrink-0 transition-transform active:scale-95 ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                        title="Quick Update Status"
                                    >
                                        {lead.status}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-xs text-gray-500">
                                    <span>Assigned: {lead.user_profiles?.full_name || 'Unassigned'}</span>
                                    <ContactActions phone={lead.phone} email={lead.email} name={lead.contact_name || lead.title} compact />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden lg:block bg-white rounded-[2.5rem] border-none shadow-xl shadow-gray-200/40 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <tr>
                                    <th className="p-4 pl-6">Lead Contact</th>
                                    <th className="p-4">Contact Info</th>
                                    <th className="p-4">Assigned Rep</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Actions</th>
                                    <th className="p-4 pr-6">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(lead => (
                                    <tr key={lead.id} onClick={() => router.push('/crm/leads/' + lead.id)} className="hover:bg-indigo-50/20 transition-colors cursor-pointer group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                    {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{lead.contact_name || lead.title}</p>
                                                    {lead.title && lead.contact_name && <p className="text-xs text-gray-400">{lead.title}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {lead.phone && <p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={11} />{lead.phone}</p>}
                                            {lead.email && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={11} />{lead.email}</p>}
                                        </td>
                                        <td className="p-4 text-xs font-semibold text-gray-700">
                                            {lead.user_profiles?.full_name || 'Unassigned'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <ContactActions phone={lead.phone} email={lead.email} name={lead.contact_name || lead.title} compact />
                                        </td>
                                        <td className="p-4 pr-6 flex gap-2 justify-end items-center">
                                            <span className="text-xs text-gray-400">
                                                {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }} 
                                                className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Quick Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
