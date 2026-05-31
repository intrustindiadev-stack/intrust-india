'use client';

import { useState } from 'react';
import { ChevronDown, TrendingUp, Calendar, Clock } from 'lucide-react';

const STATUS_COLORS = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-400' },
    active: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-400' },
    completed: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-400' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', dot: 'bg-red-400' },
};

const STATUS_LABELS = { pending: 'Under Review', active: 'Active', completed: 'Completed', rejected: 'Rejected' };

// SVG circular progress ring
function ROIRing({ pct, size = 72, stroke = 6, color = '#10B981' }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const filled = Math.min(Math.max(pct, 0), 100);
    const offset = circ - (filled / 100) * circ;
    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
        </svg>
    );
}

export default function FundROICard({ inv, orders, isSelected, onClick }) {
    const [expanded, setExpanded] = useState(false);
    const principal = inv.amount_paise / 100;
    const totalProfit = orders.reduce((s, o) => s + (o.profit_paise || 0), 0) / 100;
    const roiPct = principal > 0 ? (totalProfit / principal) * 100 : 0;
    const daysActive = inv.approved_at
        ? Math.floor((Date.now() - new Date(inv.approved_at)) / (1000 * 60 * 60 * 24))
        : 0;
    const statusStyle = STATUS_COLORS[inv.status] || STATUS_COLORS.pending;
    const ringColor = inv.status === 'active' ? '#10B981' : inv.status === 'completed' ? '#3B82F6' : '#F59E0B';

    return (
        <div
            className={`bg-white border rounded-[2rem] transition-all duration-300 overflow-hidden ${isSelected
                ? 'border-indigo-300 shadow-lg shadow-indigo-100/50'
                : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
                }`}
        >
            {/* Card header — clickable to select */}
            <button
                onClick={onClick}
                className="w-full text-left p-5 flex items-start gap-4"
            >
                {/* ROI Ring */}
                <div className="relative shrink-0">
                    <ROIRing pct={roiPct} color={ringColor} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black text-slate-800 leading-none">{roiPct.toFixed(1)}%</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase leading-none mt-0.5">ROI</span>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xl font-black text-slate-900 tracking-tight">₹{principal.toLocaleString('en-IN')}</p>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${inv.status === 'active' ? 'animate-pulse' : ''}`} />
                            {STATUS_LABELS[inv.status] || inv.status}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1">
                            <TrendingUp size={11} className="text-emerald-500" />
                            <span className="text-xs font-black text-emerald-600">+₹{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                        {daysActive > 0 && (
                            <div className="flex items-center gap-1">
                                <Clock size={10} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500">{daysActive}d active</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Calendar size={10} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500">
                                {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            </button>

            {/* Expand toggle for related orders */}
            {orders.length > 0 && (
                <>
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="w-full flex items-center justify-between px-5 py-2.5 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                    >
                        <span>{orders.length} trade order{orders.length > 1 ? 's' : ''}</span>
                        <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>

                    {expanded && (
                        <div className="divide-y divide-slate-50 border-t border-slate-50">
                            {orders.slice(0, 5).map(order => (
                                <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{order.order_details}</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                            {new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            {order.category ? ` · ${order.category}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-black text-emerald-600">+₹{(order.profit_paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                                        <p className="text-[9px] font-bold text-slate-400">profit</p>
                                    </div>
                                </div>
                            ))}
                            {orders.length > 5 && (
                                <p className="text-center py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    +{orders.length - 5} more orders
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
