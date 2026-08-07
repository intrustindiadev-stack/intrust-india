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
            <div className="bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-900 rounded-[2rem] p-6 flex items-center gap-3 text-indigo-200/50 text-sm animate-pulse border border-white/5">
                <BarChart2 size={18} className="animate-pulse" />
                <span className="font-medium tracking-wide">Initializing allocation command center...</span>
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
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950/90 to-slate-900 rounded-[2rem] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-indigo-500/10 shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-2 shrink-0 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <BarChart2 size={16} className="text-indigo-400" />
                </div>
                <span className="text-xs font-black text-indigo-100 uppercase tracking-[0.2em]">Allocation Center</span>
            </div>

            <div className="flex flex-wrap items-center gap-8 flex-1 relative z-10">
                {stats.map((s) => (
                    <div key={s.label} className="flex items-center gap-3">
                        <div className="text-right">
                            <div className={`text-2xl font-black leading-none tracking-tight ${s.color} drop-shadow-sm`}>{s.value}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1 ${s.subtle}`}>
                                {s.icon}
                                {s.label}
                            </div>
                        </div>
                        {s.link && (
                            <Link href={s.link} className="text-[10px] font-bold text-rose-300 hover:text-rose-100 border border-rose-500/30 bg-rose-500/10 rounded-xl px-2.5 py-1 hover:border-rose-400 hover:bg-rose-500/20 transition-all">
                                View &rarr;
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {isManager && (
                <div className="flex items-center gap-2 shrink-0 relative z-10">
                    <button
                        onClick={fetchMetrics}
                        className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200 border border-slate-700/50"
                        title="Refresh Data"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {hasPending && (
                        <button
                            onClick={handleReallocate}
                            disabled={reallocating}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-xs font-black tracking-wide uppercase rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/30"
                        >
                            <ArrowRightLeft size={13} />
                            {reallocating ? 'Processing...' : 'Reallocate Pending'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
