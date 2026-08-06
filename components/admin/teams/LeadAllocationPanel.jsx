'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, ShieldAlert, CheckCircle, BarChart2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function LeadAllocationPanel({ isManager }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reallocating, setReallocating] = useState(false);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/crm/territory/metrics');
            if (res.ok) setMetrics(await res.json());
        } catch (e) {
            // silent — panel is non-critical
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMetrics(); }, []);

    const handleReallocate = async () => {
        setReallocating(true);
        try {
            const res = await fetch('/api/crm/leads/reroute', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Reallocation initiated — ${data.rerouted_count ?? 0} lead(s) queued`);
                fetchMetrics();
            } else {
                toast.error(data.error || 'Reallocation failed');
            }
        } catch (e) {
            toast.error('Reallocation failed');
        } finally {
            setReallocating(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 flex items-center gap-3 text-slate-400 text-sm animate-pulse">
                <BarChart2 size={16} />
                <span>Loading allocation summary…</span>
            </div>
        );
    }

    if (!metrics) return null;

    const hasPending = (metrics.unmatched || 0) > 0;

    const stats = [
        {
            label: 'Total in Scope',
            value: metrics.total || 0,
            color: 'text-slate-200',
            subtle: 'text-slate-400',
        },
        {
            label: 'Auto-Allocated',
            value: metrics.auto || 0,
            color: 'text-emerald-300',
            subtle: 'text-emerald-500',
            icon: <CheckCircle size={12} className="text-emerald-400" />,
        },
        {
            label: 'Manually Allocated',
            value: metrics.manual || 0,
            color: 'text-amber-300',
            subtle: 'text-amber-500',
        },
        {
            label: 'Pending Allocation',
            value: metrics.unmatched || 0,
            color: hasPending ? 'text-rose-300' : 'text-slate-300',
            subtle: hasPending ? 'text-rose-500' : 'text-slate-500',
            icon: hasPending ? <ShieldAlert size={12} className="text-rose-400" /> : null,
            link: hasPending && isManager ? '/crm/leads?routing_status=unmatched' : null,
        },
    ];

    return (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700/50 shadow-lg">
            <div className="flex items-center gap-2 shrink-0">
                <BarChart2 size={15} className="text-indigo-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lead Allocation</span>
            </div>

            <div className="flex flex-wrap items-center gap-5 flex-1">
                {stats.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                        <div className="text-right">
                            <div className={`text-xl font-black leading-none ${s.color}`}>{s.value}</div>
                            <div className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1 ${s.subtle}`}>
                                {s.icon}
                                {s.label}
                            </div>
                        </div>
                        {s.link && (
                            <Link href={s.link} className="text-[10px] font-bold text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg px-2 py-1 hover:border-rose-400/50 transition-all">
                                View →
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {isManager && (
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={fetchMetrics}
                        className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-500 hover:text-slate-300"
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                    {hasPending && (
                        <button
                            onClick={handleReallocate}
                            disabled={reallocating}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 shadow-md shadow-indigo-900/40"
                        >
                            <ArrowRightLeft size={12} />
                            {reallocating ? 'Reallocating…' : 'Reallocate Pending'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
