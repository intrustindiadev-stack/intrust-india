'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall, CalendarCheck, CheckCircle, Sun, Bell, FileCheck2, TrendingUp, XCircle, Ban } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { BILL_RANGES } from '@/lib/solar/estimator';
import { SOLAR_STATUSES, SOLAR_STATUS_FLOW } from '@/lib/solar/statuses';
import { SOLAR_CONFIG } from '@/lib/solar/config';

export default function SolarRequestTracker({ existingLead }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    if (!existingLead) return null;

    const currentIdx = SOLAR_STATUS_FLOW.findIndex(s => s === existingLead.status);
    const currentStep = SOLAR_STATUSES[existingLead.status] ?? SOLAR_STATUSES.new;
    
    // Determine active UI states based on canonical model
    const isClosed = existingLead.status === 'lost' || existingLead.status === 'cancelled';
    const isConverted = existingLead.status === 'converted';

    const billRangeLabel = BILL_RANGES.find(r => r.id === existingLead.monthly_bill_range)?.label || existingLead.monthly_bill_range;

    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`mx-4 mt-24 mb-2 rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'
                } shadow-xl max-w-4xl lg:mx-auto`}
        >
            {/* Header strip */}
            <div className={`flex items-center gap-3 px-5 py-4 border-b ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-100'
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${currentStep.bg} border ${currentStep.border}`}>
                    <currentStep.icon size={16} className={currentStep.color} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Your Solar Request</p>
                    <p className={`font-black text-sm leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {currentStep.label}
                    </p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isConverted ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : isClosed ? 'bg-red-500/15 border-red-500/30 text-red-400'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}>
                    {isConverted ? '✓ Done' : isClosed ? 'Closed' : 'In Progress'}
                </div>
            </div>

            {/* Progress timeline */}
            {!isClosed && (
                <div className="px-5 py-4 overflow-x-auto">
                    <div className="flex items-center gap-0 min-w-max">
                        {SOLAR_STATUS_FLOW.filter(s => !SOLAR_STATUSES[s].terminal || s === 'converted').map((sKey, i) => {
                            const s = SOLAR_STATUSES[sKey];
                            const done = i <= currentIdx;
                            const active = i === currentIdx;
                            const isLast = i === SOLAR_STATUS_FLOW.filter(x => !SOLAR_STATUSES[x].terminal || x === 'converted').length - 1;
                            return (
                                <div key={sKey} className="flex items-center flex-1">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${done
                                            ? `${s.bg} ${s.border} ${s.color}`
                                            : isDark ? 'bg-white/5 border-white/10 text-white/20' : 'bg-slate-100 border-slate-200 text-slate-300'
                                        } ${active ? 'ring-2 ring-offset-1 ring-amber-400/50' : ''}`}>
                                        <s.icon size={13} />
                                    </div>
                                    {!isLast && (
                                        <div className={`w-12 sm:flex-1 h-0.5 mx-1 rounded-full ${i < currentIdx
                                                ? 'bg-amber-400'
                                                : isDark ? 'bg-white/10' : 'bg-slate-200'
                                            }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <p className={`text-xs font-medium mt-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                        {currentStep.label}
                    </p>
                </div>
            )}

            {/* Details row */}
            <div className={`flex flex-wrap gap-x-6 gap-y-1 px-5 pb-4 text-[11px] font-medium ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                <span>📋 {billRangeLabel}</span>
                <span>📍 {existingLead.city || existingLead.pincode || '—'}</span>
                <span>📞 {existingLead.mobile}</span>
            </div>

            {/* Public Customer Message (NOT internal notes) */}
            {existingLead.customer_message && (
                <div className={`mx-4 mb-4 p-3 rounded-2xl text-xs font-medium leading-relaxed border ${isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-700'
                    }`}>
                    <span className="font-black">💬 Team Update: </span>{existingLead.customer_message}
                </div>
            )}

            {/* Standard contact note */}
            {!isClosed && !isConverted && (
                <div className={`flex items-center gap-2 mx-4 mb-4 p-3 rounded-2xl border ${isDark ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                    <PhoneCall size={14} className="text-emerald-500 shrink-0" />
                    <p className={`text-xs font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        Our {SOLAR_CONFIG.COMPANY_NAME} team will contact you at <span className="font-black">{existingLead.mobile}</span> within {SOLAR_CONFIG.CONTACT_SLA_HOURS} hours.
                    </p>
                </div>
            )}
        </motion.div>
    );
}
