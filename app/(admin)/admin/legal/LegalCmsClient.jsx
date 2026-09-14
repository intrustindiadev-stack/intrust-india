'use client';
import { useEffect, useState } from 'react';
import { Scale, Save, Loader2, Eye, History, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { listLegalDocsAdmin, publishLegalDoc } from '@/app/actions/legal';
import { LEGAL_META, LEGAL_SLUGS } from '@/lib/legalDefaults';

export default function LegalCmsClient() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSlug, setActiveSlug] = useState('kyc_terms');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);

    const load = async () => {
        setLoading(true);
        const res = await listLegalDocsAdmin();
        if (res?.success) setDocs(res.data || []);
        else toast.error(res?.error || 'Failed to load documents');
        setLoading(false);
    };
    useEffect(() => { load(); }, []);
    useEffect(() => {
        const active = docs.find((d) => d.slug === activeSlug && d.is_active);
        setTitle(active?.title || LEGAL_META[activeSlug]?.title || '');
        setBody(active?.body_markdown || '');
    }, [docs, activeSlug]);

    const history = docs.filter((d) => d.slug === activeSlug);
    const handlePublish = async () => {
        if (!title.trim() || !body.trim()) { toast.error('Title and body required'); return; }
        if (!confirm('Publish new version? It goes live on /legal and KYC modal instantly.')) return;
        setSaving(true);
        const res = await publishLegalDoc({ slug: activeSlug, title, body_markdown: body });
        setSaving(false);
        if (res?.success) { toast.success('Published ' + res.data.version); load(); }
        else toast.error(res?.error || 'Publish failed');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white"><Scale size={20} /></div>
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Legal Documents (CMS)</h1>
                    <p className="text-xs text-gray-500 font-medium">Publishing goes live on /legal and the KYC modal instantly. Old versions stay in history.</p>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                {LEGAL_SLUGS.map((slug) => (
                    <button key={slug} onClick={() => setActiveSlug(slug)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold ${activeSlug === slug ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600'}`}>
                        {LEGAL_META[slug]?.label}
                    </button>
                ))}
            </div>
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 font-medium"><Loader2 className="animate-spin" size={18} /> Loading…</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Title</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 mb-4" />
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Body (Markdown)</label>
                            <button onClick={() => setPreview(!preview)} className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600"><Eye size={13} /> {preview ? 'Edit' : 'Preview'}</button>
                        </div>
                        {preview ? (
                            <div className="min-h-[320px] max-h-[480px] overflow-y-auto border border-gray-200 rounded-xl p-4 text-sm text-gray-700"><ReactMarkdown>{body}</ReactMarkdown></div>
                        ) : (
                            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={18} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500" />
                        )}
                        <button onClick={handlePublish} disabled={saving} className="mt-4 w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? (<><Loader2 size={17} className="animate-spin" /> Publishing…</>) : (<><Save size={17} /> Publish new version</>)}
                        </button>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm h-fit">
                        <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2"><History size={15} /> Version history</h3>
                        <div className="space-y-2">
                            {history.map((h) => (
                                <div key={h.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                                    <span className="font-extrabold text-gray-900">{h.version}</span>
                                    {h.is_active && <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><CheckCircle size={12} /> Live</span>}
                                    <span className="text-gray-400 ml-auto">{h.effective_from ? new Date(h.effective_from).toLocaleDateString('en-IN') : ''}</span>
                                </div>
                            ))}
                            {history.length === 0 && <p className="text-xs text-gray-400">No versions in DB yet — fallback content is live. Publish to create v1.0.</p>}
                        </div>
                        <a href="/legal" target="_blank" rel="noopener noreferrer" className="block text-center text-xs font-bold text-indigo-600 hover:underline mt-4">View live /legal page</a>
                    </div>
                </div>
            )}
        </div>
    );
}
