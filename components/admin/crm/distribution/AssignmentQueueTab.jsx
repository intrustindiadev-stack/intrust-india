'use client';

import { useState, useEffect } from 'react';
import { fetchExtendedLeadsForDistribution } from '@/app/actions/admin-distribution';
import { Loader2, Search, Filter, ChevronLeft, ChevronRight, MapPin, User, CheckCircle2, AlertCircle } from 'lucide-react';
import MemberAssignDrawer from '@/components/admin/teams/MemberAssignDrawer';

export default function AssignmentQueueTab({ onAction }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all, unassigned, reroute_pending
    const [selectedLeadForAssign, setSelectedLeadForAssign] = useState(null);

    const LIMIT = 20;

    const loadLeads = async () => {
        setLoading(true);
        const { data, total: count, error } = await fetchExtendedLeadsForDistribution(page, search, filter, null, LIMIT);
        if (!error) {
            setLeads(data);
            setTotal(count);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadLeads();
    }, [page, filter]);

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) loadLeads();
            else setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleAssignSuccess = () => {
        setSelectedLeadForAssign(null);
        loadLeads();
        if (onAction) onAction();
    };

    const getStatusBadge = (routingStatus) => {
        if (routingStatus === 'auto_matched') return <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 flex items-center gap-1"><CheckCircle2 size={12}/> Auto</span>;
        if (routingStatus === 'reroute_pending') return <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100 flex items-center gap-1"><AlertCircle size={12}/> Pending</span>;
        if (routingStatus === 'manual_override') return <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 flex items-center gap-1"><User size={12}/> Manual</span>;
        return <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">{routingStatus || 'Unknown'}</span>;
    };

    return (
        <div className="p-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search by name, email, phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-slate-400" />
                            <select 
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="all">All Leads</option>
                                <option value="unassigned">Unassigned Only</option>
                                <option value="needs_action">Needs Action</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 pl-6">Contact</th>
                                <th className="p-4">Territory</th>
                                <th className="p-4">Team</th>
                                <th className="p-4">Employee</th>
                                <th className="p-4">Routing Status</th>
                                <th className="p-4 pr-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && leads.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        <p>Loading queue...</p>
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-500">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Target className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="font-semibold text-slate-900">No leads found</p>
                                        <p className="text-sm">Try adjusting your filters or search terms.</p>
                                    </td>
                                </tr>
                            ) : leads.map(lead => (
                                <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="font-bold text-slate-900">{lead.contact_name}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{lead.phone || lead.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-start gap-1.5 text-sm">
                                            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-medium text-slate-700">{lead.city || 'Unknown City'}</div>
                                                <div className="text-xs text-slate-500">{[lead.area, lead.pincode].filter(Boolean).join(', ')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {lead.assigned_team_id ? (
                                            <div className="font-semibold text-slate-700 text-sm">{lead.assigned_team_name}</div>
                                        ) : (
                                            <span className="text-slate-400 text-sm italic">Unmatched</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {lead.assigned_to ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">
                                                    {lead.assigned_rep_name?.[0]}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{lead.assigned_rep_name}</span>
                                            </div>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-bold">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(lead.routing_status)}
                                    </td>
                                    <td className="p-4 pr-6 text-right">
                                        <button
                                            onClick={() => setSelectedLeadForAssign(lead)}
                                            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            {lead.assigned_to ? 'Reassign' : 'Assign'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Showing <span className="font-bold text-slate-900">{Math.min(1 + (page - 1) * LIMIT, total)}</span> to <span className="font-bold text-slate-900">{Math.min(page * LIMIT, total)}</span> of <span className="font-bold text-slate-900">{total}</span> leads
                    </div>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button 
                            disabled={page * LIMIT >= total}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Member Assign Drawer */}
            {selectedLeadForAssign && (
                <MemberAssignDrawer 
                    isOpen={!!selectedLeadForAssign}
                    onClose={() => setSelectedLeadForAssign(null)}
                    leadId={selectedLeadForAssign.id}
                    currentAssignee={selectedLeadForAssign.assigned_to}
                    onSuccess={handleAssignSuccess}
                />
            )}
        </div>
    );
}
