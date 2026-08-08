'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    Briefcase, Search, CheckCircle, XCircle, Eye,
    Phone, Mail, MapPin, Users, Zap,
    TrendingUp, DollarSign, RefreshCw, UserCheck, X,
    Shield, ShieldCheck, ShieldX, Clock, Building2, Calendar, User
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import ContactActions from '@/components/shared/ContactActions';

const STATUS_CONFIG = {
    pending:             { label: 'Pending',              color: 'text-amber-600 bg-amber-50 border-amber-200',     dot: 'bg-amber-500' },
    under_review:        { label: 'Under Review',         color: 'text-blue-600 bg-blue-50 border-blue-200',        dot: 'bg-blue-500' },
    interview_scheduled: { label: 'Interview Scheduled',  color: 'text-violet-600 bg-violet-50 border-violet-200',  dot: 'bg-violet-500' },
    offer_sent:          { label: 'Offer Sent',           color: 'text-indigo-600 bg-indigo-50 border-indigo-200',  dot: 'bg-indigo-500' },
    hired:               { label: 'Hired',                color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    rejected:            { label: 'Rejected',             color: 'text-red-600 bg-red-50 border-red-200',           dot: 'bg-red-500' },
};

const ACCESS_REQUEST_STATUS = {
    pending:  { label: 'Pending Admin Approval', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
    approved: { label: 'Approved',               color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: ShieldCheck },
    rejected: { label: 'Rejected',               color: 'text-red-700 bg-red-50 border-red-200', icon: ShieldX },
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
    { value: 'relationship_manager', label: 'CRM Panel (RM Manager)' },
    { value: 'relationship_exec', label: 'CRM Panel (RM Exec)' },
    { value: 'employee', label: 'Employee Portal (General)' },
    { value: 'freelancer', label: 'Employee Portal (Freelancer)' },
    { value: 'video_editor', label: 'Employee Portal (Video Editor)' },
    { value: 'social_media_manager', label: 'Employee Portal (Social Media Manager)' },
    { value: 'seo_specialist', label: 'Employee Portal (SEO Specialist)' },
    { value: 'advertiser', label: 'Employee Portal (Advertiser)' },
    { value: 'support_agent', label: 'Employee Portal (Support Agent)' },
];

function SystemAccessSection({ app, onAccessUpdate }) {
    const [accessRequest, setAccessRequest] = useState(null);
    const [loadingRequest, setLoadingRequest] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const fetchAccessRequest = useCallback(async () => {
        if (!app?.user_id) return;
        setLoadingRequest(true);
        try {
            const { data } = await supabase
                .from('panel_access_requests')
                .select('*, teams(name, city, state), hr:requested_by(full_name), approver:approved_by(full_name)')
                .eq('user_id', app.user_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            setAccessRequest(data || null);
        } catch (err) {
            console.error('Error fetching access request:', err);
        } finally {
            setLoadingRequest(false);
        }
    }, [app?.user_id]);

    useEffect(() => {
        if (app?.status === 'hired') {
            fetchAccessRequest();
        }
    }, [app?.status, fetchAccessRequest]);

    const handleApprove = async () => {
        if (!accessRequest) return;
        try {
            setProcessingId('approve');
            const res = await fetch('/api/admin/panel-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: accessRequest.id, action: 'approve' })
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to approve');
            toast.success('Panel access approved — employee is now active.');
            await fetchAccessRequest();
            onAccessUpdate?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) { toast.error('Please provide a rejection reason.'); return; }
        try {
            setProcessingId('reject');
            const res = await fetch('/api/admin/panel-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: accessRequest.id, action: 'reject', rejectReason: rejectReason.trim() })
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to reject');
            toast.success('Access request rejected. HR & candidate notified.');
            setShowRejectModal(false);
            setRejectReason('');
            await fetchAccessRequest();
            onAccessUpdate?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    // Only show for hired candidates
    if (app?.status !== 'hired') return null;

    if (loadingRequest) {
        return (
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 animate-pulse">
                <div className="h-4 bg-indigo-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-indigo-100 rounded w-2/3" />
            </div>
        );
    }

    if (!accessRequest) {
        return (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield size={13} /> System Access
                </h3>
                <p className="text-sm text-gray-500">No panel access request has been made for this candidate yet. HR can request access when processing the hire.</p>
            </div>
        );
    }

    const reqStatus = ACCESS_REQUEST_STATUS[accessRequest.status] || ACCESS_REQUEST_STATUS.pending;
    const ReqIcon = reqStatus.icon;

    return (
        <div className={`rounded-2xl border p-4 space-y-4 ${accessRequest.status === 'pending' ? 'bg-amber-50/50 border-amber-200' : accessRequest.status === 'approved' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                    <Shield size={13} /> System Access
                </h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${reqStatus.color}`}>
                    <ReqIcon size={11} /> {reqStatus.label}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/70 rounded-xl p-3 border border-white">
                    <p className="text-xs text-gray-400 mb-0.5">Requested Role</p>
                    <p className="font-semibold text-gray-800 text-xs">{accessRequest.requested_role}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-white">
                    <p className="text-xs text-gray-400 mb-0.5">Organization Unit</p>
                    <p className="font-semibold text-gray-800 text-xs">
                        {accessRequest.teams ? `${accessRequest.teams.name} (${accessRequest.teams.city || accessRequest.teams.state || '—'})` : '—'}
                    </p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-white">
                    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><User size={10}/> Requested By</p>
                    <p className="font-semibold text-gray-800 text-xs">{accessRequest.hr?.full_name || 'HR Manager'}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-white">
                    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Calendar size={10}/> Requested At</p>
                    <p className="font-semibold text-gray-800 text-xs">{new Date(accessRequest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>

                {accessRequest.status !== 'pending' && (accessRequest.approver || accessRequest.approved_at) && (
                    <>
                        <div className="bg-white/70 rounded-xl p-3 border border-white">
                            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><UserCheck size={10}/> {accessRequest.status === 'approved' ? 'Approved By' : 'Rejected By'}</p>
                            <p className="font-semibold text-gray-800 text-xs">{accessRequest.approver?.full_name || '—'}</p>
                        </div>
                        <div className="bg-white/70 rounded-xl p-3 border border-white">
                            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Calendar size={10}/> {accessRequest.status === 'approved' ? 'Approved At' : 'Rejected At'}</p>
                            <p className="font-semibold text-gray-800 text-xs">{accessRequest.approved_at ? new Date(accessRequest.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                        </div>
                    </>
                )}

                {accessRequest.rejected_reason && (
                    <div className="bg-white/70 rounded-xl p-3 border border-white col-span-2">
                        <p className="text-xs text-gray-400 mb-0.5">Rejection Reason</p>
                        <p className="font-medium text-gray-700 text-xs">{accessRequest.rejected_reason}</p>
                    </div>
                )}
            </div>

            {/* Admin Approve/Reject — only show if pending */}
            {accessRequest.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={!!processingId}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                        <XCircle size={14} /> Reject
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={!!processingId}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                        {processingId === 'approve' ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Approving...</> : <><CheckCircle size={14} /> Approve Access</>}
                    </button>
                </div>
            )}

            {/* Reject reason modal */}
            <AnimatePresence>
                {showRejectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="font-bold text-gray-900 text-lg">Reject Access Request</h3>
                                <p className="text-sm text-gray-500 mt-1">Provide a reason. The candidate and HR will be notified.</p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    placeholder="Reason for rejection..."
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    autoFocus
                                />
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                    className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-200 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={!!processingId || !rejectReason.trim()}
                                    className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {processingId === 'reject' ? 'Processing...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

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
                        
                        <div className="pt-2 border-t border-gray-200/60">
                            <ContactActions phone={app.phone} email={app.email} name={app.full_name} />
                        </div>
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

                    {/* System Access Section — merged approval workflow */}
                    <SystemAccessSection app={app} onAccessUpdate={() => {}} />

                    {/* Admin Actions */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Application Actions</h3>

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
    const searchParams = useSearchParams();
    const router = useRouter();

    const [applications, setApplications] = useState([]);
    const [accessRequestsMap, setAccessRequestsMap] = useState({}); // user_id -> request
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') === 'pending_access' ? 'hired' : (searchParams.get('status') || 'all'));
    const [pendingAccessFilter, setPendingAccessFilter] = useState(searchParams.get('filter') === 'pending_access');
    const [roleFilter, setRoleFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedApp, setSelectedApp] = useState(null);

    const [stats, setStats] = useState({ total: 0, pending: 0, hired: 0, under_review: 0, rejected: 0, pending_access: 0 });

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch filtered list for the table
            let query = supabase
                .from('career_applications')
                .select('*, career_job_roles(title, commission_structure, category)')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') query = query.eq('status', statusFilter);
            if (roleFilter !== 'all') query = query.eq('role_category', roleFilter);

            // Fetch unfiltered counts for stats (always reflects global state)
            const [{ data }, { data: allApps }] = await Promise.all([
                query,
                supabase
                    .from('career_applications')
                    .select('id, status, user_id')
                    .order('created_at', { ascending: false })
            ]);

            const apps = data || [];
            const allAppsData = allApps || [];
            setApplications(apps);

            // Fetch access requests for ALL hired candidates (not just filtered)
            const allHiredUserIds = allAppsData.filter(a => a.status === 'hired' && a.user_id).map(a => a.user_id);
            const hiredUserIds = apps.filter(a => a.status === 'hired' && a.user_id).map(a => a.user_id);

            let pendingAccessCount = 0;
            let map = {};

            if (allHiredUserIds.length > 0) {
                const { data: accessReqs } = await supabase
                    .from('panel_access_requests')
                    .select('*')
                    .in('user_id', allHiredUserIds)
                    .order('created_at', { ascending: false });

                (accessReqs || []).forEach(req => {
                    if (!map[req.user_id]) map[req.user_id] = req;
                });
                // Only set accessRequestsMap for candidates currently visible in table
                const filteredMap = {};
                hiredUserIds.forEach(id => { if (map[id]) filteredMap[id] = map[id]; });
                setAccessRequestsMap(filteredMap);
                pendingAccessCount = Object.values(map).filter(r => r.status === 'pending').length;
            } else {
                setAccessRequestsMap({});
            }

            // Stats always based on ALL applications, not filtered
            setStats({
                total: allAppsData.length,
                pending: allAppsData.filter(a => a.status === 'pending').length,
                hired: allAppsData.filter(a => a.status === 'hired').length,
                under_review: allAppsData.filter(a => a.status === 'under_review').length,
                rejected: allAppsData.filter(a => a.status === 'rejected').length,
                pending_access: pendingAccessCount,
            });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, roleFilter]);


    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    // If pending_access filter active, only show hired candidates with pending requests
    const filtered = applications.filter(a => {
        const matchSearch = !search ||
            a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            a.email?.toLowerCase().includes(search.toLowerCase()) ||
            a.city?.toLowerCase().includes(search.toLowerCase());

        if (!matchSearch) return false;

        if (pendingAccessFilter) {
            const req = accessRequestsMap[a.user_id];
            return req?.status === 'pending';
        }

        return true;
    });

    const handleUpdate = (updated) => {
        setApplications(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
        fetchApplications();
    };

    const quickApprove = async (appId, e) => {
        e.stopPropagation();
        const { error } = await supabase.from('career_applications').update({ status: 'under_review' }).eq('id', appId);
        if (!error) { toast.success('Moved to Under Review'); fetchApplications(); }
    };

    const handleStatusFilterChange = (val) => {
        setStatusFilter(val);
        setPendingAccessFilter(false);
    };

    const handlePendingAccessFilterClick = () => {
        setPendingAccessFilter(true);
        setStatusFilter('hired');
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 pb-5">
                    <div className="flex items-center gap-3.5">
                        <Image
                            src="/logo.png"
                            alt="InTrust Logo"
                            width={42}
                            height={42}
                            className="object-contain"
                        />
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Career & Hire Approvals</h1>
                            <p className="text-gray-500 text-sm mt-0.5">Review candidate pipeline, schedule interviews, and manage system access.</p>
                        </div>
                    </div>
                    <button onClick={fetchApplications} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-600 transition-all shadow-sm">
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    {[
                        { label: 'Total', value: stats.total, color: 'from-gray-500 to-slate-600', onClick: () => handleStatusFilterChange('all') },
                        { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-orange-500', onClick: () => handleStatusFilterChange('pending') },
                        { label: 'Under Review', value: stats.under_review, color: 'from-blue-500 to-cyan-500', onClick: () => handleStatusFilterChange('under_review') },
                        { label: 'Hired', value: stats.hired, color: 'from-emerald-500 to-teal-500', onClick: () => handleStatusFilterChange('hired') },
                        { label: 'Rejected', value: stats.rejected, color: 'from-red-500 to-rose-500', onClick: () => handleStatusFilterChange('rejected') },
                        { label: 'Pending Access', value: stats.pending_access, color: 'from-indigo-500 to-violet-500', onClick: handlePendingAccessFilterClick, highlight: pendingAccessFilter },
                    ].map(s => (
                        <button
                            key={s.label}
                            onClick={s.onClick}
                            className={`bg-white rounded-2xl border p-4 shadow-sm text-left transition-all hover:shadow-md ${s.highlight ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-gray-100'}`}
                        >
                            <div className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${s.color} mb-3`} />
                            <p className="text-2xl font-black text-gray-900">{s.value}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
                        </button>
                    ))}
                </div>

                {/* Pending access filter banner */}
                {pendingAccessFilter && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield size={16} className="text-indigo-600" />
                            <p className="text-sm font-semibold text-indigo-800">Filtering: Candidates with pending system access requests</p>
                        </div>
                        <button onClick={() => { setPendingAccessFilter(false); setStatusFilter('all'); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                            Clear filter ×
                        </button>
                    </div>
                )}

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
                        <select
                            value={statusFilter}
                            onChange={e => handleStatusFilterChange(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-gray-700"
                        >
                            <option value="all">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-gray-700"
                        >
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
                                        <th className="p-4">System Access</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 pr-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map(app => {
                                        const statusConf = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                                        const roleConf = ROLE_CONFIG[app.role_category] || ROLE_CONFIG.other;
                                        const RoleIcon = roleConf.icon;
                                        const accessReq = app.user_id ? accessRequestsMap[app.user_id] : null;
                                        const accessConf = accessReq ? ACCESS_REQUEST_STATUS[accessReq.status] : null;
                                        const AccessIcon = accessConf?.icon;
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
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border ${statusConf.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                                                        {statusConf.label}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {accessReq && accessConf ? (
                                                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border ${accessConf.color}`}>
                                                            <AccessIcon size={11} /> {accessConf.label}
                                                        </span>
                                                    ) : app.panel_access_granted ? (
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
