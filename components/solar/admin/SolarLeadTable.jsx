'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Phone, Mail, MapPin, User, MessageSquare, Save, RefreshCw, Loader2, Home, Building2, Factory } from 'lucide-react';
import { SOLAR_STATUS_FLOW, SOLAR_STATUSES, isValidTransition } from '@/lib/solar/statuses';
import { BILL_RANGES } from '@/lib/solar/estimator';

const PROP_ICON = { residential: Home, commercial: Building2, industrial: Factory };

export default function SolarLeadTable({ leads, onUpdateStatus, onSaveNotes, updatingId, savingNotesId }) {
    const [expanded, setExpanded] = useState(null);
    const [notes, setNotes] = useState({});

    return (
        <div className="space-y-4">
            {leads.map(lead => {
                const status = SOLAR_STATUSES[lead.status] || SOLAR_STATUSES.new;
                const StatusIcon = status.icon;
                const PropIcon = PROP_ICON[lead.property_type] || Home;
                const isExp = expanded === lead.id;
                const billLabel = BILL_RANGES.find(r => r.id === lead.monthly_bill_range)?.label || lead.monthly_bill_range;

                return (
                    <div key={lead.id} className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                        {/* Row Header */}
                        <button 
                            className="w-full flex items-center gap-4 p-5 cursor-pointer text-left select-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            onClick={() => setExpanded(isExp ? null : lead.id)}
                            aria-expanded={isExp}
                            aria-controls={`lead-details-${lead.id}`}
                        >
                            {/* Status Icon */}
                            <div className={`w-12 h-12 rounded-2xl ${status.bg} border ${status.border} flex items-center justify-center shrink-0`}>
                                <StatusIcon size={22} className={status.color} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-black text-slate-900 dark:text-white text-base truncate">{lead.name}</p>
                                    <PropIcon size={13} className="text-slate-400 shrink-0" />
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 flex-wrap">
                                    <span className="flex items-center gap-1"><Phone size={10} />{lead.mobile}</span>
                                    {lead.city && <span className="flex items-center gap-1"><MapPin size={10} />{lead.city}</span>}
                                    <span className="text-amber-500">{billLabel}</span>
                                </div>
                            </div>

                            {/* Status badge + date */}
                            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border}`}>
                                    {status.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>

                            <div className={`text-slate-400 transition-transform duration-200 ${isExp ? 'rotate-180' : ''}`}>
                                <ChevronDown size={18} />
                            </div>
                        </button>

                        {/* Expanded Details */}
                        <AnimatePresence>
                            {isExp && (
                                <motion.div 
                                    id={`lead-details-${lead.id}`}
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-slate-100 dark:border-white/5"
                                >
                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Lead Details */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <User size={12} /> Contact Details
                                            </h4>
                                            <div className={`p-4 rounded-2xl space-y-2 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5`}>
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Ref: <span className="font-black">{lead.reference_code || lead.id.split('-')[0]}</span></p>
                                                {lead.email && <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2"><Mail size={13} className="text-slate-400" />{lead.email}</p>}
                                                {lead.pincode && <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2"><MapPin size={13} className="text-slate-400" />{lead.address || ''} {lead.city} - {lead.pincode}</p>}
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Bill: <span className="text-amber-600 dark:text-amber-400 font-black">{billLabel}</span></p>
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Type: <span className="font-black text-slate-900 dark:text-white capitalize">{lead.property_type}</span></p>
                                                <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-white/10">Submitted: {new Date(lead.created_at).toLocaleString('en-IN')}</p>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2">
                                                    <MessageSquare size={12} /> Internal Notes (Private)
                                                </h4>
                                                <textarea
                                                    rows={3}
                                                    placeholder="Add internal notes..."
                                                    defaultValue={lead.internal_notes || ''}
                                                    onChange={e => setNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none transition-all"
                                                />
                                                <button onClick={() => onSaveNotes(lead.id, notes[lead.id] || lead.internal_notes)} disabled={savingNotesId === lead.id}
                                                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest disabled:opacity-60 transition-all">
                                                    {savingNotesId === lead.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                    Save Notes
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status Controls */}
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                                                <RefreshCw size={12} /> Update Status
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {SOLAR_STATUS_FLOW.map(s => {
                                                    const isValid = isValidTransition(lead.status, s);
                                                    const isCurrent = lead.status === s;
                                                    
                                                    return (
                                                        <button key={s} 
                                                            disabled={updatingId === lead.id || (!isValid && !isCurrent)}
                                                            onClick={() => {
                                                                if(s === 'lost' || s === 'cancelled') {
                                                                    if(window.confirm(`Are you sure you want to mark this as ${SOLAR_STATUSES[s].label}?`)) {
                                                                        onUpdateStatus(lead.id, s);
                                                                    }
                                                                } else {
                                                                    onUpdateStatus(lead.id, s);
                                                                }
                                                            }}
                                                            className={`py-3 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 
                                                                ${isCurrent ? 'bg-slate-950 dark:bg-white text-white dark:text-black border-slate-950 dark:border-white shadow-lg' 
                                                                : (!isValid ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-400')}`}>
                                                            {updatingId === lead.id && s === lead.status ? <Loader2 size={10} className="animate-spin" /> : null}
                                                            {SOLAR_STATUSES[s].label}
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* Quick Call CTA */}
                                            <a href={`tel:${lead.mobile}`}
                                                className="mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                                                <Phone size={16} /> Call {lead.name.split(' ')[0]}
                                            </a>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
