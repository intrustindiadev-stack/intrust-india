'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Video, FileText, Search, RefreshCw, Layers, X, Check, AlertCircle, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_CONFIG = {
    video: { icon: Video, color: 'bg-violet-50 text-violet-600' },
    document: { icon: FileText, color: 'bg-amber-50 text-amber-600' },
    interactive: { icon: Layers, color: 'bg-blue-50 text-blue-600' },
};

function AddModuleModal({ onClose, onSave }) {
    const { user } = useAuth();
    const [form, setForm] = useState({
        title: '', description: '', category: '',
        content_type: 'video', content_url: '', is_mandatory: false
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.title.trim()) { toast.error('Title is required'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('training_materials').insert([{
                title: form.title,
                description: form.description || null,
                category: form.category || null,
                content_type: form.content_type,
                content_url: form.content_url || null,
                is_mandatory: form.is_mandatory,
                created_by: user?.id,
            }]);
            if (error) throw error;
            toast.success('Training module added!');
            onSave();
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold text-gray-900">Add Training Module</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Title *</label>
                        <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="e.g. Anti-Harassment Training 2026"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                        <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Brief description of the module..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
                            <select value={form.content_type} onChange={e => setForm(p => ({ ...p, content_type: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none">
                                <option value="video">Video</option>
                                <option value="document">Document</option>
                                <option value="interactive">Interactive</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                placeholder="e.g. Compliance"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Content URL</label>
                        <input value={form.content_url} onChange={e => setForm(p => ({ ...p, content_url: e.target.value }))}
                            placeholder="https://..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <input type="checkbox" id="mandatory" checked={form.is_mandatory} onChange={e => setForm(p => ({ ...p, is_mandatory: e.target.checked }))}
                            className="w-4 h-4 accent-rose-500" />
                        <label htmlFor="mandatory" className="text-sm font-medium text-rose-700">Mark as Mandatory (required for all employees)</label>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={16} /> Save Module</>}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function HRMTrainingPage() {
    const [modules, setModules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchModules = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('training_materials')
                .select('*')
                .order('is_mandatory', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            setModules(data || []);
        } catch (err) {
            console.error(err);
            toast.error('Could not load training materials');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchModules(); }, [fetchModules]);

    const handleDelete = async (id) => {
        if (!confirm('Delete this training module? This cannot be undone.')) return;
        try {
            const { error } = await supabase.from('training_materials').delete().eq('id', id);
            if (error) throw error;
            setModules(prev => prev.filter(m => m.id !== id));
            toast.success('Module deleted');
        } catch (err) { toast.error(err.message); }
    };

    const filtered = modules.filter(m =>
        !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <AnimatePresence>
                {showAddModal && <AddModuleModal onClose={() => setShowAddModal(false)} onSave={fetchModules} />}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Training Materials</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and publish training modules for employees.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchModules} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                    <button onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30">
                        <Plus size={18} /> Add Module
                    </button>
                </div>
            </div>

            {/* Summary pills */}
            {!isLoading && modules.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-sm font-bold">
                        <BookOpen size={14} /> {modules.length} Total
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-sm font-bold">
                        <AlertCircle size={14} /> {modules.filter(m => m.is_mandatory).length} Mandatory
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or category..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-white border border-gray-100 rounded-3xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
                    <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <FileText size={28} className="text-emerald-400" />
                    </div>
                    <p className="font-semibold text-gray-700">{search ? 'No results found' : 'No training modules yet'}</p>
                    <p className="text-sm text-gray-400 mt-1">{search ? 'Try a different search' : 'Click "Add Module" to create your first training material.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((mod, i) => {
                        const type = mod.content_type?.toLowerCase() || 'document';
                        const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.document;
                        const Icon = cfg.icon;
                        return (
                            <motion.div key={mod.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
                                <div className="p-5 border-b border-gray-100 flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl ${cfg.color} flex items-center justify-center shrink-0`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight mb-1 text-sm pr-2">{mod.title}</h3>
                                            <button onClick={() => handleDelete(mod.id)} className="text-gray-300 hover:text-rose-500 transition-colors flex-shrink-0 p-0.5 rounded">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md capitalize">{type}</span>
                                            {mod.category && <span className="text-xs text-gray-400">{mod.category}</span>}
                                            {mod.is_mandatory && (
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100">Mandatory</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {mod.description && (
                                    <div className="px-5 py-3 bg-gray-50/50">
                                        <p className="text-sm text-gray-500 line-clamp-2">{mod.description}</p>
                                    </div>
                                )}
                                <div className="p-4 mt-auto">
                                    {mod.content_url ? (
                                        <a href={mod.content_url} target="_blank" rel="noreferrer"
                                            className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 py-2.5 rounded-xl text-sm font-bold transition-colors">
                                            View Content
                                        </a>
                                    ) : (
                                        <div className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-400 border border-gray-100 py-2.5 rounded-xl text-sm font-medium cursor-not-allowed">
                                            No URL set
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
