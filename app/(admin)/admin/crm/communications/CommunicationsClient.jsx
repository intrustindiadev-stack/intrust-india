'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Search, Filter, MessageSquare, CheckCircle2, AlertCircle, Users, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { format, isToday } from 'date-fns';

export default function CommunicationsClient({ initialLogs = [] }) {
    const [logs, setLogs] = useState(initialLogs);
    const [loading, setLoading] = useState(false);
    
    // Stats
    const stats = useMemo(() => {
        const todayLogs = logs.filter(l => isToday(new Date(l.created_at)));
        return {
            todayTotal: todayLogs.length,
            todaySuccess: todayLogs.filter(l => l.status === 'sent' || l.status === 'delivered' || l.status === 'read').length,
            todayFailed: todayLogs.filter(l => l.status === 'failed').length,
            activeUsers: new Set(todayLogs.map(l => l.agent_id)).size
        };
    }, [logs]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateRange, setDateRange] = useState('today');

    const supabase = createClient();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('whatsapp_message_logs')
                .select('*')
                .not('agent_id', 'is', null)
                .order('created_at', { ascending: false });

            // Date filtering
            const now = new Date();
            if (dateRange === 'today') {
                now.setHours(0,0,0,0);
                query = query.gte('created_at', now.toISOString());
            } else if (dateRange === '7d') {
                now.setDate(now.getDate() - 7);
                query = query.gte('created_at', now.toISOString());
            } else if (dateRange === '30d') {
                now.setDate(now.getDate() - 30);
                query = query.gte('created_at', now.toISOString());
            }

            if (statusFilter !== 'all') query = query.eq('status', statusFilter);
            if (typeFilter !== 'all') query = query.eq('recipient_type', typeFilter);

            const { data, error } = await query.limit(500); // Limit to prevent massive payloads
            if (!error && data) {
                let enrichedLogs = data;
                if (enrichedLogs.length > 0) {
                    const agentIds = [...new Set(enrichedLogs.map(l => l.agent_id))];
                    const { data: profiles } = await supabase
                        .from('user_profiles')
                        .select('id, full_name, role')
                        .in('id', agentIds);
                        
                    if (profiles) {
                        const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
                        enrichedLogs = enrichedLogs.map(log => ({
                            ...log,
                            crm_agent: profileMap[log.agent_id] || null
                        }));
                    }
                }
                setLogs(enrichedLogs);
            }
        } catch (err) {
            console.error('Error fetching logs', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch if filters change and we're not on the initial load state, but since we rely on client side filtering mostly, 
        // we'll just refetch when dateRange changes.
        fetchLogs();
    }, [dateRange, statusFilter, typeFilter]);

    // Client-side search filtering
    const filteredLogs = logs.filter(log => {
        const query = searchQuery.toLowerCase();
        const employeeMatch = log.crm_agent?.full_name?.toLowerCase().includes(query) || false;
        const phoneMatch = log.recipient_phone_e164?.toLowerCase().includes(query) || false;
        const templateMatch = log.template_name?.toLowerCase().includes(query) || false;
        return employeeMatch || phoneMatch || templateMatch;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-[family-name:var(--font-outfit)] space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM Communication Logs</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Audit WhatsApp usage across the CRM team.</p>
                </div>
                <button onClick={fetchLogs} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><MessageSquare size={48} /></div>
                    <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Today's Messages</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{stats.todayTotal}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500"><CheckCircle2 size={48} /></div>
                    <p className="text-xs font-black uppercase text-emerald-600 tracking-wider">Successful</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{stats.todaySuccess}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-500"><AlertCircle size={48} /></div>
                    <p className="text-xs font-black uppercase text-rose-600 tracking-wider">Failed</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{stats.todayFailed}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500"><Users size={48} /></div>
                    <p className="text-xs font-black uppercase text-blue-600 tracking-wider">Active CRM Users</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{stats.activeUsers}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 items-stretch md:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search employee, phone, or template..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-transparent border-none text-sm font-semibold text-slate-900 focus:ring-0 placeholder-slate-400"
                    />
                </div>
                <div className="hidden md:block w-px h-6 bg-slate-200" />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Types</option>
                    <option value="contact">Lead</option>
                    <option value="custom_number">Custom (User/Merchant)</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="delivered">Delivered</option>
                    <option value="read">Read</option>
                    <option value="failed">Failed</option>
                    <option value="queued">Queued</option>
                </select>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="today">Today</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500">
                                <th className="p-4">Employee</th>
                                <th className="p-4">Recipient</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Template</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 text-sm font-semibold">
                                        {loading ? 'Loading logs...' : 'No communication logs found.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-slate-900">{log.crm_agent?.full_name || 'Unknown'}</div>
                                            <div className="text-[10px] text-slate-500">{log.agent_id?.substring(0,8)}...</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-semibold text-slate-700">{log.recipient_phone_e164}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                                {log.recipient_type === 'contact' ? 'Lead' : 'Custom'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-semibold text-indigo-700">{log.template_name}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                                ['sent', 'delivered', 'read'].includes(log.status) ? 'bg-emerald-100 text-emerald-700' :
                                                log.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {log.status}
                                            </span>
                                            {log.status === 'failed' && log.error_message && (
                                                <div className="text-[9px] text-rose-500 mt-1 max-w-[150px] truncate" title={log.error_message}>
                                                    {log.error_message}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs font-semibold text-slate-500">
                                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
