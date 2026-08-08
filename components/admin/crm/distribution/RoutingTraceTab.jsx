'use client';

import { useState } from 'react';
import { fetchRoutingLog } from '@/app/actions/admin-distribution';
import { Loader2, Search, History, ArrowRight, User, Network, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function RoutingTraceTab() {
    const [searchId, setSearchId] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchId.trim()) return;

        setLoading(true);
        setHasSearched(true);
        const { data, error } = await fetchRoutingLog(searchId.trim());
        if (!error) {
            setLogs(data);
        } else {
            setLogs([]);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 h-full overflow-y-auto max-w-4xl mx-auto">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2 mb-2">
                    <Network className="text-blue-600" />
                    Routing Trace
                </h2>
                <p className="text-slate-500">Investigate the assignment history and routing decisions for a specific lead.</p>
            </div>

            <form onSubmit={handleSearch} className="mb-10 relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Paste Lead UUID here..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="w-full pl-12 pr-32 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                />
                <button
                    type="submit"
                    disabled={loading || !searchId.trim()}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                    {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Trace'}
                </button>
            </form>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
                    <p className="text-slate-500 font-medium">Querying routing logs...</p>
                </div>
            ) : hasSearched && logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <History className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">No routing history found for this ID.</p>
                </div>
            ) : logs.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {logs.map((log, index) => (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-slate-400 group-hover:text-blue-500 group-hover:border-blue-50 transition-colors">
                                <History size={16} />
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                                    </span>
                                    {log.match_type && log.match_type !== 'none' && (
                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-md">
                                            {log.match_type} match
                                        </span>
                                    )}
                                </div>

                                <p className="text-slate-800 font-medium text-sm mb-4">
                                    {log.reason}
                                </p>

                                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex-1 text-center">
                                        <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">From Team</div>
                                        <div className="text-xs font-semibold text-slate-700 truncate" title={log.from_team?.name || 'Unassigned'}>
                                            {log.from_team?.name || 'Unassigned'}
                                        </div>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-300 shrink-0" />
                                    <div className="flex-1 text-center">
                                        <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">To Team</div>
                                        <div className="text-xs font-semibold text-slate-700 truncate" title={log.to_team?.name || 'Unassigned'}>
                                            {log.to_team?.name || 'Unassigned'}
                                        </div>
                                    </div>
                                </div>

                                {log.actor_id && (
                                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 justify-end">
                                        <User size={12} />
                                        Action by: <span className="font-semibold text-slate-700">{log.actor?.full_name || 'Unknown'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
