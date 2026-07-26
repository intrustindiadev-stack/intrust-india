'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { fetchLeadsForAssignment, fetchSalesReps, updateLeadAssignment } from '@/app/actions/admin-crm';
import {
    Search, Loader2, CheckCircle, AlertCircle, Users, UserPlus,
    Phone, Mail, Filter, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

const STATUS_STYLE = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-violet-50 text-violet-700 border-violet-200',
    qualified: 'bg-amber-50 text-amber-700 border-amber-200',
    proposal: 'bg-orange-50 text-orange-700 border-orange-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-red-50 text-red-700 border-red-200',
};

export default function LeadAssignmentPanel() {
    const [leads, setLeads] = useState([]);
    const [reps, setReps] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [isPending, startTransition] = useTransition();
    const limit = 15;

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 4000);
    }, []);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [leadsRes, repsRes] = await Promise.all([
                fetchLeadsForAssignment(page, search, filter, limit),
                reps.length === 0 ? fetchSalesReps() : Promise.resolve({ data: reps }),
            ]);

            if (leadsRes.error) {
                showToast(leadsRes.error, 'error');
            } else {
                setLeads(leadsRes.data || []);
                setTotal(leadsRes.total || 0);
            }

            if (repsRes.data) setReps(repsRes.data);
        } catch (err) {
            showToast('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [page, search, filter, reps.length, showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleAssign = async (leadId, newRepId) => {
        const repId = newRepId === '' ? null : newRepId;
        setUpdatingId(leadId);

        // Optimistic update
        const prevLeads = [...leads];
        const rep = reps.find(r => r.id === repId);
        setLeads(leads.map(l =>
            l.id === leadId
                ? { ...l, assigned_to: repId, assigned_rep_name: rep?.full_name || null }
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

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Toast */}
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

            {/* Header */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <UserPlus size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Lead Assignment</h2>
                            <p className="text-xs text-gray-500 font-medium">Assign or reassign leads to sales representatives</p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadData()}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors border border-gray-200"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search leads by name, phone, or email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setFilter('all'); setPage(1); }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                                filter === 'all'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            All Leads
                        </button>
                        <button
                            onClick={() => { setFilter('unassigned'); setPage(1); }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-1.5 ${
                                filter === 'unassigned'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            <Filter size={14} />
                            Unassigned
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                            <th className="p-4 pl-6">Lead</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Source</th>
                            <th className="p-4 min-w-[220px]">Assigned Rep</th>
                            <th className="p-4 pr-6">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i}>
                                    <td colSpan="6" className="p-4">
                                        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : leads.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                                            <Users size={24} className="text-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">No leads found</p>
                                        <p className="text-xs text-gray-500">Try adjusting your search or filter</p>
                                    </div>
                                </td>
                            </tr>
                        ) : leads.map(lead => (
                            <tr key={lead.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm flex-shrink-0">
                                            {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                {lead.contact_name || lead.title}
                                            </p>
                                            {lead.title && lead.contact_name && (
                                                <p className="text-xs text-gray-400 mt-0.5">{lead.title}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="space-y-0.5">
                                        {lead.phone && (
                                            <p className="text-xs text-gray-600 flex items-center gap-1">
                                                <Phone size={10} /> {lead.phone}
                                            </p>
                                        )}
                                        {lead.email && (
                                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                                <Mail size={10} /> {lead.email}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="text-xs font-medium text-gray-500">{lead.source || '—'}</span>
                                </td>
                                <td className="p-4">
                                    <div className="relative">
                                        {updatingId === lead.id ? (
                                            <div className="flex items-center gap-2 text-indigo-600 py-2">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span className="text-xs font-bold">Updating...</span>
                                            </div>
                                        ) : (
                                            <select
                                                value={lead.assigned_to || ''}
                                                onChange={e => handleAssign(lead.id, e.target.value)}
                                                className={`w-full text-sm border rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 p-2.5 bg-white transition-all font-medium ${
                                                    lead.assigned_to
                                                        ? 'border-gray-200 text-gray-800'
                                                        : 'border-amber-200 text-amber-700 bg-amber-50/50'
                                                }`}
                                            >
                                                <option value="">— Unassigned —</option>
                                                {reps.map(rep => (
                                                    <option key={rep.id} value={rep.id}>
                                                        {rep.full_name || rep.email} ({rep.role.replace('_', ' ')})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 pr-6 text-xs text-gray-500 font-medium">
                                    {new Date(lead.created_at).toLocaleDateString('en-IN', {
                                        day: 'numeric', month: 'short', year: '2-digit'
                                    })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 sm:px-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-500 font-medium">
                        Showing <span className="font-bold text-gray-900">{leads.length}</span> of <span className="font-bold text-gray-900">{total}</span> leads
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-gray-700 px-3">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
