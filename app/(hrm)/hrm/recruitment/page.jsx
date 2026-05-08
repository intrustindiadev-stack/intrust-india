'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, RefreshCw, Briefcase, Phone, Mail, ExternalLink, CheckCircle2, Clock, User, DollarSign, Calendar, MessageSquare, UserCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PIPELINE_STAGES = [
    { key: 'pending', label: 'New', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-100' },
    { key: 'under_review', label: 'Reviewing', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100' },
    { key: 'interview_scheduled', label: 'Interview', color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700 border-violet-100' },
    { key: 'offer_sent', label: 'Offer Sent', color: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { key: 'hired', label: 'Hired ✓', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { key: 'rejected', label: 'Rejected', color: 'bg-rose-500', light: 'bg-rose-50 text-rose-700 border-rose-100' },
];

function CandidateDrawer({ app, onClose, onUpdate }) {
    const { user } = useAuth();
    const [stage, setStage] = useState(app?.status || 'pending');
    const [form, setForm] = useState({
        interview_date: app?.interview_date ? app.interview_date.split('T')[0] : '',
        interview_notes: app?.interview_notes || '',
        offered_salary: app?.offered_salary || '',
        commission_percent: app?.commission_percent || '',
        joining_bonus: app?.joining_bonus || '',
        offer_letter_notes: app?.offer_letter_notes || '',
        panel_access_granted: app?.panel_access_granted || '',
    });
    const [saving, setSaving] = useState(false);
    const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const PANEL_OPTIONS = [
        { value: '', label: 'No panel access' },
        { value: 'crm', label: 'CRM Panel (Sales)' },
        { value: 'employee', label: 'Employee Portal' },
        { value: 'merchant', label: 'Merchant Panel' },
    ];

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                applicationId: app.id,
                stage: stage,
                panelAccessGranted: form.panel_access_granted,
                offeredSalary: form.offered_salary,
                commissionPercent: form.commission_percent,
                joiningBonus: form.joining_bonus,
                offerLetterNotes: form.offer_letter_notes,
                interviewDate: form.interview_date,
                interviewNotes: form.interview_notes
            };

            const response = await fetch('/api/hrm/hire-candidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update application');
            }
            
            // If HR marks as hired, it requires Admin to actually update user profile
            if (stage === 'hired') {
                toast.success('Candidate marked as hired. Admin approval required for final panel access.');
            } else {
                toast.success('Application updated');
            }
            
            const updates = {
                status: stage,
                ...form,
                interview_date: form.interview_date ? new Date(form.interview_date).toISOString() : null,
                offered_salary: form.offered_salary ? Number(form.offered_salary) : null,
                commission_percent: form.commission_percent ? Number(form.commission_percent) : null,
                joining_bonus: form.joining_bonus ? Number(form.joining_bonus) : null,
                hired_at: stage === 'hired' ? new Date().toISOString() : null,
            };

            onUpdate({ ...app, ...updates, status: stage });
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const stageConfig = PIPELINE_STAGES.find(s => s.key === stage);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-lg bg-gray-50 flex flex-col h-full shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-white p-5 border-b border-gray-100 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                            {(app?.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{app?.full_name}</h2>
                            <p className="text-sm text-gray-500">{app?.career_job_roles?.title || app?.role_category || 'General Application'}</p>
                            <span className={`inline-flex text-xs font-bold px-2.5 py-0.5 rounded-lg border mt-1 ${stageConfig?.light}`}>{stageConfig?.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl mt-1"><X size={18} className="text-gray-500" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Contact Info */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Contact</h3>
                        {app?.email && <a href={`mailto:${app.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-violet-600"><Mail size={15} className="text-gray-400" /> {app.email}</a>}
                        {app?.phone && <a href={`tel:${app.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-violet-600"><Phone size={15} className="text-gray-400" /> {app.phone}</a>}
                        {app?.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-violet-600 hover:underline"><ExternalLink size={15} /> LinkedIn Profile</a>}
                        {(app?.expected_salary_min || app?.expected_salary_max) && (
                            <p className="flex items-center gap-3 text-sm text-gray-600"><DollarSign size={15} className="text-gray-400" /> Expected ₹{app.expected_salary_min?.toLocaleString('en-IN')} – ₹{app.expected_salary_max?.toLocaleString('en-IN')}</p>
                        )}
                        {app?.cover_letter && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cover Letter</p>
                                <p className="text-sm text-gray-600 italic leading-relaxed">"{app.cover_letter}"</p>
                            </div>
                        )}
                    </div>

                    {/* Pipeline Stage */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Move to Stage</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {PIPELINE_STAGES.map(s => (
                                <button key={s.key} onClick={() => setStage(s.key)}
                                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${stage === s.key ? s.light + ' scale-105 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interview Details */}
                    {(stage === 'interview_scheduled' || stage === 'offer_sent' || stage === 'hired') && (
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Interview</h3>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Interview Date</label>
                                <input type="date" value={form.interview_date} onChange={e => up('interview_date', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Interview Notes</label>
                                <textarea value={form.interview_notes} onChange={e => up('interview_notes', e.target.value)} rows={3} placeholder="Notes from interview..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                            </div>
                        </div>
                    )}

                    {/* Offer Details */}
                    {(stage === 'offer_sent' || stage === 'hired') && (
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Offer Package</h3>
                            {[
                                { label: 'Offered Salary (₹/month)', key: 'offered_salary', placeholder: '35000' },
                                { label: 'Commission %', key: 'commission_percent', placeholder: '5' },
                                { label: 'Joining Bonus (₹)', key: 'joining_bonus', placeholder: '10000' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                                    <input type="number" value={form[f.key]} onChange={e => up(f.key, e.target.value)} placeholder={f.placeholder}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Offer Note</label>
                                <textarea value={form.offer_letter_notes} onChange={e => up('offer_letter_notes', e.target.value)} rows={2} placeholder="Note to send with offer..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                            </div>
                        </div>
                    )}

                    {/* Panel Access (for hired) */}
                    {stage === 'hired' && (
                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3">Recommend Panel Access</h3>
                            <p className="text-xs text-emerald-600 mb-3">Recommend which panel(s) this hire should access (requires Admin approval):</p>
                            <select value={form.panel_access_granted} onChange={e => up('panel_access_granted', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                                {PANEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-violet-500 disabled:opacity-60">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={16} /> Save & Update</>}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function RecruitmentPage() {
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState('all');
    const [selected, setSelected] = useState(null);

    const fetchApplications = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('career_applications')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setApplications(data || []);
        } catch (err) { console.error(err); toast.error('Could not load applications'); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    const handleUpdate = (updated) => setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));

    const filtered = applications.filter(a => {
        const matchStage = stageFilter === 'all' || a.status === stageFilter;
        const matchSearch = !search || a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.role_category?.toLowerCase().includes(search.toLowerCase());
        return matchStage && matchSearch;
    });

    const stageCounts = PIPELINE_STAGES.reduce((acc, s) => {
        acc[s.key] = applications.filter(a => a.status === s.key).length;
        return acc;
    }, {});

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <AnimatePresence>
                {selected && <CandidateDrawer app={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Recruitment</h1>
                    <p className="text-sm text-gray-500 mt-1">{applications.length} total applications</p>
                </div>
                <button onClick={fetchApplications} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Pipeline summary bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PIPELINE_STAGES.map(s => (
                    <button key={s.key} onClick={() => setStageFilter(prev => prev === s.key ? 'all' : s.key)}
                        className={`p-3 rounded-2xl border text-center transition-all ${stageFilter === s.key ? s.light + ' shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                        <p className="text-xl font-black text-gray-900">{stageCounts[s.key] || 0}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or position..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm" />
            </div>

            {/* Application Cards */}
            {isLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white rounded-3xl border border-gray-100 animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4"><Briefcase size={28} className="text-gray-400" /></div>
                    <p className="font-semibold text-gray-700">No applications found</p>
                    <p className="text-sm text-gray-400 mt-1">Applications from the careers page will appear here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((app, i) => {
                        const stage = PIPELINE_STAGES.find(s => s.key === app.status) || PIPELINE_STAGES[0];
                        return (
                            <motion.div key={app.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                onClick={() => setSelected(app)}
                                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-200 transition-all p-4 sm:p-5 cursor-pointer group">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-violet-700 font-bold text-lg flex-shrink-0 group-hover:from-violet-200 transition-all">
                                            {(app.full_name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 group-hover:text-violet-600 transition-colors">{app.full_name}</p>
                                            <p className="text-sm text-gray-500">{app.role_category || 'General Application'}</p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {app.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone size={11} /> {app.phone}</span>}
                                                {app.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail size={11} /> {app.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {app.offered_salary > 0 && (
                                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">₹{app.offered_salary.toLocaleString('en-IN')}/mo</span>
                                        )}
                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${stage.light}`}>{stage.label}</span>
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color.replace('bg-', '').replace('-500', '') }}></div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
