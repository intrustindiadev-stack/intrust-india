'use client';

import { useEffect, useState } from 'react';
import { FileCheck, Download, Eye, Copy, Check } from 'lucide-react';
import { listUserAgreements } from '@/app/actions/agreements';

export default function AgreementSection({ userId }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState('');
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        listUserAgreements(userId).then((res) => {
            if (res?.success) setRows(res.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [userId]);

    const copyHash = async (id, hash) => {
        try { await navigator.clipboard.writeText(hash || ''); setCopied(id); setTimeout(() => setCopied(''), 1500); } catch { /* ignore */ }
    };

    if (!userId || (!loading && rows.length === 0)) return null;

    return (
        <div className="mt-6 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 tracking-tight mb-4">
                <FileCheck className="text-emerald-600" /> Signed Customer Agreements
                <span className="ml-auto text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">{rows.length}</span>
            </h3>
            {loading ? (
                <p className="text-sm text-gray-400 font-medium">Loading agreements…</p>
            ) : (
                <div className="space-y-3">
                    {rows.map((a) => (
                        <div key={a.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900 text-sm">{a.doc_title}</span>
                                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{a.doc_version}</span>
                                <span className="text-[11px] text-gray-400 font-medium ml-auto">
                                    {a.accepted_at ? new Date(a.accepted_at).toLocaleString('en-IN') : ''}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 mb-3">
                                <span className="truncate">SHA-256: {a.pdf_hash_sha256 || '—'}</span>
                                {a.pdf_hash_sha256 && (
                                    <button onClick={() => copyHash(a.id, a.pdf_hash_sha256)} className="ml-auto text-gray-400 hover:text-gray-700">
                                        {copied === a.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mb-3">IP: {a.accepted_ip || '—'} • PDF: {a.pdf_storage_path || '—'}</p>
                            <div className="flex gap-2">
                                {a.pdfUrl && (
                                    <>
                                        <a href={a.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">
                                            <Eye size={13} /> View PDF
                                        </a>
                                        <a href={a.pdfUrl} download className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black">
                                            <Download size={13} /> Download
                                        </a>
                                    </>
                                )}
                                <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50">
                                    {expanded === a.id ? 'Hide text' : 'View accepted text'}
                                </button>
                            </div>
                            {expanded === a.id && (
                                <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed bg-white border border-gray-200 rounded-xl p-3 text-gray-600">{a.full_text_snapshot}</pre>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
