'use client';

import React from 'react';
import { Phone, Mail, MoreHorizontal, User, Calendar, IndianRupee } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const STATUS_STYLE = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-amber-50 text-amber-700 border-amber-200',
    qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    proposal: 'bg-purple-50 text-purple-700 border-purple-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-rose-50 text-rose-700 border-rose-200',
};

const TEMP_STYLE = {
    hot: 'text-rose-600 bg-rose-50',
    warm: 'text-amber-600 bg-amber-50',
    cold: 'text-sky-600 bg-sky-50'
};

const groupLeadsByDate = (leads) => {
    const groups = {
        'Today': [],
        'Yesterday': [],
        'This Week': [],
        'Older': []
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    leads.forEach(lead => {
        const leadDate = new Date(lead.created_at);
        if (leadDate >= today) groups['Today'].push(lead);
        else if (leadDate >= yesterday) groups['Yesterday'].push(lead);
        else if (leadDate >= last7Days) groups['This Week'].push(lead);
        else groups['Older'].push(lead);
    });

    return groups;
};

export default function LeadsTable({ 
    leads, 
    isLoading, 
    selectedIds, 
    onToggleSelect, 
    onToggleSelectAll,
    isAllPageSelected,
    isSomeSelected
}) {
    if (isLoading) {
        return (
            <div className="hidden lg:block bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden animate-pulse">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex gap-6">
                    {['w-6', 'w-48', 'w-36', 'w-24', 'w-20', 'w-28', 'w-16', 'w-10'].map((w, i) => (
                        <div key={i} className={`h-3 ${w} bg-gray-200 rounded-full`} />
                    ))}
                </div>
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="px-6 py-5 border-b border-gray-50 flex gap-6 items-center">
                        <div className="w-4 h-4 bg-gray-200 rounded shrink-0" />
                        <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                        <div className="space-y-2 flex-1"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-100 rounded w-1/4" /></div>
                        <div className="w-32 space-y-2"><div className="h-3 bg-gray-200 rounded w-full" /><div className="h-3 bg-gray-100 rounded w-3/4" /></div>
                        <div className="w-20 h-6 bg-gray-100 rounded-lg" />
                        <div className="w-20 h-4 bg-gray-100 rounded" />
                        <div className="w-32 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gray-200 shrink-0"/><div className="h-3 bg-gray-100 rounded w-20"/></div>
                        <div className="w-20 h-4 bg-gray-100 rounded" />
                        <div className="w-10 h-8 bg-gray-100 rounded-lg shrink-0" />
                    </div>
                ))}
            </div>
        );
    }

    if (!leads?.length) return null;

    const groupedLeads = groupLeadsByDate(leads);

    return (
        <div className="hidden lg:block bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gradient-to-r from-slate-50 to-white text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100 sticky top-0 z-10 shadow-sm shadow-slate-200/20">
                        <tr>
                            <th className="p-4 pl-6 w-12">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={isAllPageSelected}
                                    ref={input => { if (input) input.indeterminate = !isAllPageSelected && isSomeSelected; }}
                                    onChange={onToggleSelectAll}
                                    aria-label="Select all on page"
                                />
                            </th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Details</th>
                            <th className="p-4">Status / Temp</th>
                            <th className="p-4 min-w-[140px]">Assignee</th>
                            <th className="p-4">Deal Value</th>
                            <th className="p-4">Created</th>
                            <th className="p-4 pr-6 w-14"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/80 text-sm">
                        {Object.entries(groupedLeads).map(([groupName, groupLeads]) => {
                            if (groupLeads.length === 0) return null;
                            return (
                                <React.Fragment key={groupName}>
                                    <tr>
                                        <td colSpan="8" className="bg-slate-50/50 py-3 px-6 text-xs font-black uppercase tracking-wider text-slate-500 border-y border-slate-100">
                                            {groupName} <span className="ml-2 bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{groupLeads.length}</span>
                                        </td>
                                    </tr>
                                    {groupLeads.map(lead => {
                                        const isSelected = selectedIds.includes(lead.id);
                                        const repName = lead.user_profiles?.full_name || 'Unassigned';
                                        
                                        return (
                                            <tr 
                                                key={lead.id} 
                                                className={`group transition-all hover:shadow-md relative hover:z-10 ${isSelected ? 'bg-indigo-50/40 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50/60 border-l-2 border-l-transparent bg-white'}`}
                                            >
                                                <td className="p-4 pl-6">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => onToggleSelect(lead.id)}
                                                        aria-label={`Select ${lead.contact_name}`}
                                                    />
                                                </td>
                                                <td className="p-4 min-w-[200px]">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${isSelected ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'}`}>
                                                            {(lead.contact_name || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <Link href={`/crm/leads/${lead.id}`} className="font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                                                                {lead.contact_name || 'Unknown'}
                                                            </Link>
                                                            {lead.title && <p className="text-xs text-gray-500 font-medium truncate max-w-[180px]">{lead.title}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="space-y-1">
                                                        {lead.phone ? (
                                                            <p className="text-xs text-gray-700 font-medium flex items-center gap-1.5">
                                                                <Phone size={12} className="text-gray-400" /> {lead.phone}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                                                <Phone size={12} className="opacity-50" /> —
                                                            </p>
                                                        )}
                                                        {lead.email && (
                                                            <p className="text-[11px] text-gray-500 flex items-center gap-1.5 truncate max-w-[160px]">
                                                                <Mail size={12} className="text-gray-400" /> {lead.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col items-start gap-1.5">
                                                        <span className={`inline-flex text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                            {lead.status}
                                                        </span>
                                                        {lead.temperature && (
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${TEMP_STYLE[lead.temperature] || 'text-gray-500'}`}>
                                                                {lead.temperature}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        {lead.assigned_to ? (
                                                            <>
                                                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold shrink-0">
                                                                    {repName.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">{repName}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Unassigned</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {lead.deal_value > 0 ? (
                                                        <span className="text-xs font-bold text-gray-900 flex items-center">
                                                            <IndianRupee size={12} className="mr-0.5 text-gray-500" />
                                                            {lead.deal_value.toLocaleString('en-IN')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                                                        <Calendar size={12} className="text-gray-400" />
                                                        {format(new Date(lead.created_at), 'MMM d, yyyy')}
                                                    </div>
                                                </td>
                                                <td className="p-4 pr-6 text-right">
                                                    <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors" aria-label="Row actions">
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

