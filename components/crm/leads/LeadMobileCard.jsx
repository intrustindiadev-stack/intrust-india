'use client';

import { Phone, Mail, MoreVertical, IndianRupee } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const STATUS_STYLE = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-amber-50 text-amber-700 border-amber-200',
    qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    proposal: 'bg-purple-50 text-purple-700 border-purple-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function LeadMobileCard({ lead, isSelected, onToggleSelect }) {
    const router = useRouter();
    const repName = lead.user_profiles?.full_name || 'Unassigned';
    const slug = lead.contact_name ? lead.contact_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'unknown';

    return (
        <div 
            onClick={(e) => {
                if (e.target.closest('input[type="checkbox"]') || e.target.closest('a') || e.target.closest('button')) return;
                router.push(`/crm/leads/${lead.id}-${slug}`);
            }}
            className={`p-4 rounded-[2rem] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer ${isSelected ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200/80 shadow-xl shadow-slate-200/40'}`}
        >
            <div className="flex items-start gap-3">
                <input 
                    type="checkbox" 
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    checked={isSelected}
                    onChange={() => onToggleSelect(lead.id)}
                    aria-label={`Select ${lead.contact_name}`}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                        <div>
                            <Link href={`/crm/leads/${lead.id}-${slug}`} className="font-bold text-gray-900 text-base hover:text-indigo-600 transition-colors truncate block">
                                {lead.contact_name || 'Unknown'}
                            </Link>
                            {lead.title && <p className="text-xs text-gray-500 font-medium truncate">{lead.title}</p>}
                        </div>
                        <button className="p-1 -mr-1 text-gray-400 hover:text-gray-900 rounded-lg">
                            <MoreVertical size={18} />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                            {lead.status}
                        </span>
                        {lead.temperature && (
                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                                • {lead.temperature}
                            </span>
                        )}
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                            • {format(new Date(lead.created_at), 'MMM d')}
                        </span>
                    </div>

                    <div className="space-y-1.5 mb-3 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                        {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="text-xs text-gray-700 font-semibold flex items-center gap-2 hover:text-indigo-600">
                                <Phone size={12} className="text-gray-400" /> {lead.phone}
                            </a>
                        )}
                        {lead.email && (
                            <a href={`mailto:${lead.email}`} className="text-xs text-gray-600 flex items-center gap-2 truncate">
                                <Mail size={12} className="text-gray-400 shrink-0" /> {lead.email}
                            </a>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                        <div className="flex items-center gap-2">
                            {lead.assigned_to ? (
                                <>
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold shrink-0">
                                        {repName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[120px]">{repName}</span>
                                </>
                            ) : (
                                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Unassigned</span>
                            )}
                        </div>
                        {lead.deal_value > 0 && (
                            <span className="text-xs font-bold text-gray-900 flex items-center bg-gray-50 px-2 py-1 rounded-lg">
                                <IndianRupee size={10} className="mr-0.5 text-gray-500" />
                                {lead.deal_value.toLocaleString('en-IN')}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
