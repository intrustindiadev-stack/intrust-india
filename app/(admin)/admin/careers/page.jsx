'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Briefcase, Search, Filter, CheckCircle, XCircle, Clock, Eye,
    ChevronDown, Phone, Mail, MapPin, Star, Award, Users, Zap,
    TrendingUp, DollarSign, RefreshCw, AlertCircle, UserCheck, X
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
    pending:             { label: 'Pending',              color: 'text-amber-600 bg-amber-50 border-amber-200',     dot: 'bg-amber-500' },
    under_review:        { label: 'Under Review',         color: 'text-blue-600 bg-blue-50 border-blue-200',        dot: 'bg-blue-500' },
    interview_scheduled: { label: 'Interview Scheduled',  color: 'text-violet-600 bg-violet-50 border-violet-200',  dot: 'bg-violet-500' },
    offer_sent:          { label: 'Offer Sent',           color: 'text-indigo-600 bg-indigo-50 border-indigo-200',  dot: 'bg-indigo-500' },
    hired:               { label: 'Hired',                color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    rejected:            { label: 'Rejected',             color: 'text-red-600 bg-red-50 border-red-200',           dot: 'bg-red-500' },
};

const ROLE_CONFIG = {
    freelancer: { label: 'Freelancer', icon: Zap, color: 'text-violet-600 bg-violet-50 border-violet-200' },
    agent: { label: 'Field Agent', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    dsa: { label: 'DSA Partner', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    sales: { label: 'Sales', icon: DollarSign, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    other: { label: 'Other', icon: Briefcase, color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const PANEL_OPTIONS = [
    { value: '', label: 'No panel access' },
    { value: 'crm', label: 'CRM Panel (Sales)' },
    { value: 'employee', label: 'Employee Portal' },
    { value: 'merchant', label: 'Merchant Panel' },
];

function ApplicationDrawer({ app, onClose, onUpdate }) {
    const [status, setStatus] = useState(app?.status || 'pending');
    const [panelAccess, setPanelAccess] = useState(app?.panel_access_granted || '');
    const [adminNotes, setAdminNotes] = useState(app?.admin_notes || '');
    const [interviewDate, setInterviewDate] = useState(app?.interview_date ? app.interview_date.slice(0,16) : '');
    const [interviewNotes, setInterviewNotes] = useState(app?.interview_notes || '');
    const [offeredSalary, setOfferedSalary] = useState(app?.offered_salary || '');
    const [commissionPct, setCommissionPct] = useState(app?.commission_percent || '');
    const [joiningBonus, setJoiningBonus] = useState(app?.joining_bonus || '');
    const [offerNotes, setOfferNotes] = useState(app?.offer_letter_notes || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (app) {
            setStatus(app.status);
            setPanelAccess(app.panel_access_granted || '');
            setAdminNotes(app.admin_notes || '');
            setInterviewDate(app.interview_date ? app.interview_date.slice(0,16) : '');
            setInterviewNotes(app.interview_notes || '');
            setOfferedSalary(app.offered_salary || '');
            setCommissionPct(app.commission_percent || '');
            setJoiningBonus(app.joining_bonus || '');
            setOfferNotes(app.offer_letter_notes || '');
        }
    }, [app]);

    if (!app) return null;

    const roleConf = ROLE_CONFIG[app.role_category] || ROLE_CONFIG.other;
    const RoleIcon = roleConf.icon;

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = {
                status,
                admin_notes: adminNotes,
                panel_access_granted: panelAccess || null,
                reviewed_at: new Date().toISOString(),
            };
            if (status === 'interview_scheduled') {
                if (interviewDate) updates.interview_date = interviewDate;
                if (interviewNotes) updates.interview_notes = interviewNotes;
            }
            if (status === 'offer_sent' || status === 'hired') {
                if (offeredSalary) updates.offered_salary = parseInt(offeredSalary);
                if (commissionPct) updates.commission_percent = parseFloat(commissionPct);
                if (joiningBonus) updates.joining_bonus = parseInt(joiningBonus);
                if (offerNotes) updates.offer_letter_notes = offerNotes;
            }
            if (status === 'hired') {
                updates.hired_at = new Date().toISOString();
            }
            const { error } = await supabase.from('career_applications').update(updates).eq('id', app.id);
            if (error) throw error;

            if ((status === 'hired' || status === 'offer_sent') && panelAccess && app.user_id) {
                const response = await fetch('/api/admin/grant-hire-role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: app.id, panelAccess })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to assign role');
                }
                updates.access_granted_at = new Date().toISOString();
            }

            toast.success('Application updated successfully');
            onUpdate({ ...app, ...updates });
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex"
        >
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-y-auto"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${roleConf.color}`}>
                            <RoleIcon size={18} />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">{app.full_name}</h2>
                            <p className="text-sm text-gray-500">{app.career_job_roles?.title || app.role_category}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    {/* Contact Info */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Contact Details</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-700"><Phone size={14} className="text-gray-400" /> {app.phone}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-700"><Mail size={14} className="text-gray-400" /> {app.email}</div>
                        {app.city && <div className="flex items-center gap-2 text-sm text-gray-700"><MapPin size={14} className="text-gray-400" /> {app.city}{app.state ? `, ${app.state}` : ''}</div>}
                    </div>

                    {/* Professional Background */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Professional Background</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-400 text-xs">Experience</p>
                                <p className="font-semibold text-gray-800">{app.experience_years || 0} years</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Current Role</p>
                                <p className="font-semibold text-gray-800">{app.current_occupation || '—'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Education</p>
                                <p className="font-semibold text-gray-800">{app.education || '—'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Languages</p>
                                <p className="font-semibold text-gray-800">{app.languages_known?.join(', ') || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cover Message */}
                    {app.cover_message && (
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Cover Message</h3>
                            <p className="text-sm text-gray-700 leading-relaxed">{app.cover_message}</p>
                        </div>
                    )}

                    {/* Applied for */}
                    <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
                        <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">Applied For</h3>
                        <p className="font-semibold text-gray-800">{app.career_job_roles?.title || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-1">{app.career_job_roles?.commission_structure?.split('\n')[0] || ''}</p>
                    </div>

                    {/* Admin Actions */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Actions</h3>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Application Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                            >
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Interview fields */}
                        {status === 'interview_scheduled' && (
                            <div className="space-y-3 p-4 rounded-2xl bg-violet-50 border border-violet-200">
                                <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Interview Details</p>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Interview Date & Time</label>
                                    <input type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Interview Notes</label>
                                    <textarea value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} rows={2}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        placeholder="Round type, interviewer, location..." />
                                </div>
                            </div>
                        )}

                        {/* Offer fields */}
                        {(status === 'offer_sent' || status === 'hired') && (
                            <div className="space-y-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Offer Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Offered Salary (₹/mo)</label>
                                        <input type="number" value={offeredSalary} onChange={e => setOfferedSalary(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Commission %</label>
                                        <input type="number" value={commissionPct} onChange={e => setCommissionPct(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Joining Bonus (₹)</label>
                                        <input type="number" value={joiningBonus} onChange={e => setJoiningBonus(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Offer Letter Notes</label>
                                    <textarea value={offerNotes} onChange={e => setOfferNotes(e.target.value)} rows={2}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Conditions, start date, etc." />
                                </div>
                            </div>
                        )}

                        {/* Panel Access */}
                        {(status === 'offer_sent' || status === 'hired') && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Grant Panel Access</label>
                                <select value={panelAccess} onChange={e => setPanelAccess(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                                    {PANEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Grant panel access when hiring is confirmed.</p>
                            </div>
                        )}

                        {/* Admin Notes */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Notes <span className="text-gray-400 font-normal">(internal)</span></label>
                            <textarea
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                rows={3}
                                placeholder="Internal notes for this application..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold hover:opacity-90 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><UserCheck size={15} /> Save & Update</>}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function AdminCareersPage() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedApp, setSelectedApp] = useState(null);

    const [stats, setStats] = useState({ total: 0, pending: 0, hired: 0, under_review: 0, rejected: 0 });

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('career_applications')
                .select('*, career_job_roles(title, commission_structure, category)')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') query = query.eq('status', statusFilter);
            if (roleFilter !== 'all') query = query.eq('role_category', roleFilter);

            const { data } = await query;
            const apps = data || [];
            setApplications(apps);
            setStats({
                total: apps.length,
                pending: apps.filter(a => a.status === 'pending').length,
                hired: apps.filter(a => a.status === 'hired').length,
                under_review: apps.filter(a => a.status === 'under_review').length,
                rejected: apps.filter(a => a.status === 'rejected').length,
            });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, roleFilter]);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    const filtered = applications.filter(a =>
        !search ||
        a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.email?.toLowerCase().includes(search.toLowerCase()) ||
        a.city?.toLowerCase().includes(search.toLowerCase())
    );

    const handleUpdate = (updated) => {
        setApplications(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
        fetchApplications();
    };

    const quickApprove = async (appId, e) => {
        e.stopPropagation();
        const { error } = await supabase.from('career_applications').update({ status: 'under_review' }).eq('id', appId);
        if (!error) { toast.success('Moved to Under Review'); fetchApplications(); }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)]">
            <AnimatePresence>
                {selectedApp && (
                    <ApplicationDrawer
                        app={selectedApp}
                        onClose={() => setSelectedApp(null)}
                        onUpdate={handleUpdate}
                    />
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Career Applications</h1>
                        <p className="text-gray-500 mt-1">Review, approve, and grant panel access to applicants.</p>
                    </div>
                    <button onClick={fetchApplications} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-600 transition-all">
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                        { label: 'Total', value: stats.total, color: 'from-gray-500 to-slate-600' },
                        { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-orange-500' },
                        { label: 'Under Review', value: stats.under_review, color: 'from-blue-500 to-cyan-500' },
                        { label: 'Hired', value: stats.hired, color: 'from-emerald-500 to-teal-500' },
                        { label: 'Rejected', value: stats.rejected, color: 'from-red-500 to-rose-500' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                            <div className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${s.color} mb-3`} />
                            <p className="text-2xl font-black text-gray-900">{s.value}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, email, city..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-gray-700">
                            <option value="all">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-gray-700">
                            <option value="all">All Roles</option>
                            {Object.keys(ROLE_CONFIG).map(k => <option key={k} value={k}>{ROLE_CONFIG[k].label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-16 text-center">
                            <Briefcase size={40} className="text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No applications found</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 pl-6">Applicant</th>
                                        <th className="p-4">Role Applied</th>
                                        <th className="p-4">Contact</th>
                                        <th className="p-4">Experience</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Panel Access</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 pr-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map(app => {
                                        const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                                        const roleConf = ROLE_CONFIG[app.role_category] || ROLE_CONFIG.other;
                                        const RoleIcon = roleConf.icon;
                                        return (
                                            <tr
                                                key={app.id}
                                                onClick={() => setSelectedApp(app)}
                                                className="hover:bg-violet-50/30 transition-colors cursor-pointer group"
                                            >
                                                <td className="p-4 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center text-sm font-bold text-violet-700">
                                                            {app.full_name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-sm">{app.full_name}</p>
                                                            <p className="text-xs text-gray-400">{app.city || 'Location N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border ${roleConf.color}`}>
                                                        <RoleIcon size={11} /> {roleConf.label}
                                                    </span>
                                                    <p className="text-xs text-gray-400 mt-1 max-w-[140px] truncate">{app.career_job_roles?.title}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={11} /> {app.phone}</p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={11} /> {app.email}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm font-semibold text-gray-800">{app.experience_years || 0} yrs</p>
                                                    <p className="text-xs text-gray-400">{app.current_occupation || '—'}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border ${status.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {app.panel_access_granted ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle size={11} /> {app.panel_access_granted}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-xs text-gray-500">
                                                    {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="p-4 pr-6">
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {app.status === 'pending' && (
                                                            <button
                                                                onClick={e => quickApprove(app.id, e)}
                                                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                                title="Move to Under Review"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setSelectedApp(app); }}
                                                            className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                                                            title="Review Application"
                                                        >
                                                            <UserCheck size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
