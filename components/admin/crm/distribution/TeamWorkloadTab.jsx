'use client';

import { useState, useEffect } from 'react';
import { fetchTeamWorkloadSummary } from '@/app/actions/admin-distribution';
import { Loader2, Users, Target, Activity, MapPin } from 'lucide-react';

export default function TeamWorkloadTab() {
    const [workload, setWorkload] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWorkload();
    }, []);

    const loadWorkload = async () => {
        setLoading(true);
        const { data, error } = await fetchTeamWorkloadSummary();
        if (!error && data) {
            setWorkload(data);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Team Workload</h2>
                <p className="text-sm text-slate-500">Pipeline distribution across all active operational teams.</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
                    <p className="text-slate-500 font-medium">Aggregating workload data...</p>
                </div>
            ) : workload.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
                    <Users className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">No active teams found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {workload.map(team => (
                        <div key={team.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col h-full">
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">{team.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                        <MapPin size={12} />
                                        {team.region_level}: {[team.area, team.city, team.state].filter(Boolean).join(', ') || 'Global'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg">
                                    <Users size={14} className="text-slate-600" />
                                    <span className="text-sm font-bold text-slate-700">{team.member_count}</span>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                                        <Activity size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Open Pipeline</span>
                                    </div>
                                    <div className="text-2xl font-black text-blue-900">{team.open_leads}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                        <Target size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Total Handled</span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-700">{team.total_leads}</div>
                                </div>
                            </div>
                            
                            {/* Pending warning if any */}
                            {team.pending_leads > 0 && (
                                <div className="mt-3 p-2 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-100 text-center">
                                    {team.pending_leads} leads currently pending reroute in this territory
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
