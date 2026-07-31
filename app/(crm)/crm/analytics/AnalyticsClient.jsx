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
                .select('id, status, deal_value, created_at, assigned_to')
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
    const totalRevenue = leads.filter(l => l.status === 'won').reduce((sum, l) => sum + Number(l.deal_value || 0), 0);

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
                                <CalendarDays size={64} />
                            </div>
                            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Revenue</h3>
                            <p className="text-3xl font-black text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
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
                </div>
            )}
        </div>
    );
}
