'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { fetchSalesReps, updateLeadAssignment, fetchLeadsForAssignment } from '@/app/actions/admin-crm';
import { Phone, Mail, Loader2, ArrowRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import ContactActions from '@/components/shared/ContactActions';

const STATUS_STYLE = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-violet-50 text-violet-700 border-violet-200',
    qualified: 'bg-amber-50 text-amber-700 border-amber-200',
    proposal: 'bg-orange-50 text-orange-700 border-orange-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-red-50 text-red-700 border-red-200',
};

export default function ActiveLeadsPipelineClient({ initialLeads = [] }) {
    const [leads, setLeads] = useState(initialLeads);
    const [reps, setReps] = useState([]);
    const [updatingId, setUpdatingId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [isPending, startTransition] = useTransition();

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 4000);
    }, []);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [leadsRes, repsRes] = await Promise.all([
                fetchLeadsForAssignment(1, '', 'all', 20),
                reps.length === 0 ? fetchSalesReps() : Promise.resolve({ data: reps }),
            ]);

            if (leadsRes.error) {
                showToast(leadsRes.error, 'error');
            } else {
                setLeads(leadsRes.data || []);
            }
            if (repsRes.data) setReps(repsRes.data);
        } catch (err) {
            showToast('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [reps.length, showToast]);

    useEffect(() => {
        // Fetch reps initially if we only have initialLeads
        if (reps.length === 0) {
            fetchSalesReps().then(res => {
                if (res.data) setReps(res.data);
            });
        }
    }, [reps.length]);

    const handleAssign = async (leadId, newRepId) => {
        const repId = newRepId === '' ? null : newRepId;
        setUpdatingId(leadId);

        // Optimistic update
        const prevLeads = [...leads];
        const rep = reps.find(r => r.id === repId);
        
        setLeads(leads.map(l =>
            l.id === leadId
                ? { ...l, assigned_to: repId, user_profiles: rep ? { full_name: rep.full_name } : null }
                : l
        ));

        startTransition(async () => {
            const result = await updateLeadAssignment(leadId, repId);
            if (!result.success) {
                // Rollback
                setLeads(prevLeads);
                showToast(result.error || 'Failed to update assignment', 'error');
            } else {
                showToast(result.message || 'Lead assignment updated', 'success');
            }
            setUpdatingId(null);
        });
    };

    return (
        <div className="bg-white/90 backdrop-blur-2xl rounded-[2rem] border border-white/50 shadow-2xl shadow-indigo-200/20 overflow-hidden transition-all duration-300 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
            {toast.message && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-bold transition-all animate-fade-in ${
                    toast.type === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-emerald-600 text-white'
                }`}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    {toast.message}
                </div>
            )}
            
            <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gradient-to-br from-white to-indigo-50/30">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        Active Leads Pipeline
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage and assign recent leads directly</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadData()}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-50 text-gray-500 rounded-xl transition-all border border-gray-200 shadow-sm"
                        title="Refresh Leads"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin text-indigo-500' : ''} />
                    </button>
                    <Link href="/admin/crm/leads" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 border border-blue-500 hover:-translate-y-0.5">
                        View All <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
            
            <div className="overflow-x-auto relative min-h-[300px]">
                {isLoading && leads.length === 0 && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                )}
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 text-[11px] uppercase tracking-widest text-gray-500 font-black border-b border-gray-100">
                        <tr>
                            <th className="p-5 pl-8">Lead Name</th>
                            <th className="p-5">Contact</th>
                            <th className="p-5 min-w-[200px]">Assigned Rep</th>
                            <th className="p-5">Status</th>
                            <th className="p-5">Actions</th>
                            <th className="p-5 pr-8">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/80">
                        {leads.length > 0 ? leads.map(lead => (
                            <tr key={lead.id} className="hover:bg-indigo-50/40 transition-colors group">
                                <td className="p-5 pl-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0 shadow-inner border border-indigo-200/50">
                                            {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <Link href={`/crm/leads/${lead.id}`} className="font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm block tracking-tight">
                                                {lead.contact_name || lead.title}
                                            </Link>
                                            {lead.title && lead.contact_name && <p className="text-xs text-gray-400 mt-0.5 font-medium">{lead.title}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="space-y-1.5">
                                        {lead.phone && <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5"><Phone size={12} className="text-indigo-400" /> {lead.phone}</p>}
                                        {lead.email && <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5"><Mail size={12} className="text-indigo-400" /> {lead.email}</p>}
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="relative">
                                        {updatingId === lead.id ? (
                                            <div className="flex items-center gap-2 text-indigo-600 py-1.5 bg-indigo-50 rounded-xl px-3 border border-indigo-100 w-fit">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span className="text-[11px] font-black uppercase tracking-wider">Assigning</span>
                                            </div>
                                        ) : (
                                            <select
                                                value={lead.assigned_to || ''}
                                                onChange={e => handleAssign(lead.id, e.target.value)}
                                                className={`w-full text-xs font-bold border rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 p-2.5 transition-all outline-none cursor-pointer hover:border-gray-300 ${
                                                    lead.assigned_to
                                                        ? 'bg-gray-50/50 border-gray-200 text-gray-800'
                                                        : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300'
                                                }`}
                                            >
                                                <option value="">— Unassigned —</option>
                                                {reps.map(rep => (
                                                    <option key={rep.id} value={rep.id}>
                                                        {rep.full_name || rep.email}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className={`inline-flex text-[10px] font-black px-3 py-1.5 rounded-lg border capitalize tracking-widest shadow-sm ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200'}`}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <ContactActions phone={lead.phone} email={lead.email} name={lead.contact_name || lead.title} compact />
                                </td>
                                <td className="p-5 pr-8 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                    {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" className="p-20 text-center">
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 mb-5 border border-gray-200 shadow-inner">
                                        <RefreshCw className="text-gray-300" size={32} />
                                    </div>
                                    <p className="text-gray-900 font-extrabold text-lg">No active leads</p>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">The CRM pipeline is currently empty or fully processed.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
