'use client';
import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, ShieldAlert, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function TerritoryDashboard({ isManager }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/crm/territory/metrics');
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            }
        } catch (e) {
            toast.error('Failed to load metrics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    const handleReroute = async () => {
        try {
            const res = await fetch('/api/crm/leads/reroute', { method: 'POST' });
            if (res.ok) {
                toast.success('Reroute job started');
                fetchMetrics();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Reroute failed');
            }
        } catch(e) {
            toast.error('Reroute failed');
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24 lg:pb-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                        <MapPin className="text-indigo-600" />
                        Lead Allocation Overview
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Regional coverage performance and lead distribution</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchMetrics} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isManager && (
                        <button onClick={handleReroute} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 text-sm">
                            Reroute Unmatched
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : metrics ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Leads in Scope</h3>
                        <div className="text-4xl font-black text-slate-900">{metrics.total || 0}</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckCircle size={14} /> Auto-Matched</h3>
                        <div className="text-4xl font-black text-slate-900">{metrics.auto || 0}</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Manual Override</h3>
                        <div className="text-4xl font-black text-slate-900">{metrics.manual || 0}</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-rose-200 bg-rose-50 shadow-sm">
                        <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ShieldAlert size={14} /> Unmatched
                        </h3>
                        <div className="text-4xl font-black text-rose-700">{metrics.unmatched || 0}</div>
                        {metrics.unmatched > 0 && isManager && (
                            <Link href="/crm/leads?routing_status=unmatched" className="text-xs font-bold text-rose-600 hover:underline mt-2 inline-block">
                                View Unmatched Leads &rarr;
                            </Link>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
