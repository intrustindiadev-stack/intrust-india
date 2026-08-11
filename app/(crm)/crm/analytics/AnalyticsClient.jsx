'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Loader2, AlertCircle, TrendingUp, Users, Target, CalendarDays } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsClient({ currentUserId, currentUserRole }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserRole);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            
            let query = supabase
                .from('crm_leads')
                .select('id, status, created_at, assigned_to, user_profiles(full_name, avatar_url)')
                .neq('source', 'App User');

            if (!isManager) {
                query = query.eq('assigned_to', currentUserId);
            }

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            
            setLeads(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isManager, currentUserId]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // Compute Metrics
    const totalLeads = leads.length;
    const wonLeads = leads.filter(l => l.status === 'won').length;
    const winRate = totalLeads ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;


    // Compute Team Metrics for Managers
    const teamMetrics = {};
    if (isManager) {
        leads.forEach(l => {
            const assigneeId = l.assigned_to || 'unassigned';
            const assigneeName = l.user_profiles?.full_name || 'Unassigned';
            const assigneeAvatar = l.user_profiles?.avatar_url;
            
            if (!teamMetrics[assigneeId]) {
                teamMetrics[assigneeId] = {
                    id: assigneeId,
                    name: assigneeName,
                    avatar: assigneeAvatar,
                    totalLeads: 0,
                    wonLeads: 0
                };
            }
            
            teamMetrics[assigneeId].totalLeads += 1;
            if (l.status === 'won') {
                teamMetrics[assigneeId].wonLeads += 1;
            }
        });
    }
    const teamLeaderboard = Object.values(teamMetrics)
        .map(t => ({
            ...t,
            winRate: t.totalLeads > 0 ? ((t.wonLeads / t.totalLeads) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.wonLeads - a.wonLeads);

    // Chart Data Generation (Last 7 days)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayLeads = leads.filter(l => l.created_at.startsWith(dateStr));
        chartData.push({
            name: d.toLocaleDateString('en-US', { weekday: 'short' }),
            leads: dayLeads.length,
            won: dayLeads.filter(l => l.status === 'won').length
        });
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-[family-name:var(--font-outfit)]">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Performance Analytics</h1>
                <p className="text-gray-500 text-sm mt-1">
                    {isManager ? 'Analyze team performance and revenue generation.' : 'Track your personal sales metrics and goals.'}
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <p className="text-sm font-medium">Crunching the numbers...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-red-50/50 rounded-3xl border border-red-100">
                    <AlertCircle size={32} className="text-red-400" />
                    <p className="text-red-900 font-semibold">{error}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Users size={64} />
                            </div>
                            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Leads</h3>
                            <p className="text-3xl font-black text-gray-900">{totalLeads}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 border border-emerald-400 shadow-sm text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Target size={64} />
                            </div>
                            <h3 className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2">Won Deals</h3>
                            <p className="text-3xl font-black">{wonLeads}</p>
                        </div>
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500">
                                <TrendingUp size={64} />
                            </div>
                            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Win Rate</h3>
                            <p className="text-3xl font-black text-indigo-600">{winRate}%</p>
                        </div>
                    </div>
                    {/* Charts */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-extrabold text-gray-900 mb-6 tracking-tight">Lead Generation (Last 7 Days)</h2>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                    <Area type="monotone" dataKey="won" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWon)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Team Leaderboard (Managers Only) */}
                    {isManager && teamLeaderboard.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                            <h2 className="text-lg font-extrabold text-gray-900 mb-6 tracking-tight">Team Performance Leaderboard</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 rounded-tl-xl">Team Member</th>
                                            <th className="p-4">Leads Assigned</th>
                                            <th className="p-4">Won Deals</th>
                                            <th className="p-4 rounded-tr-xl">Win Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {teamLeaderboard.map((member, index) => (
                                            <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0 overflow-hidden relative">
                                                            {member.avatar ? (
                                                                <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                member.name.charAt(0).toUpperCase()
                                                            )}
                                                            {index < 3 && (
                                                                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-gray-300' : 'bg-amber-700'}`} />
                                                            )}
                                                        </div>
                                                        <span className="font-semibold text-gray-900">{member.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-medium text-gray-600">{member.totalLeads}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-bold text-emerald-600">{member.wonLeads}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-bold text-indigo-600">{member.winRate}%</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
