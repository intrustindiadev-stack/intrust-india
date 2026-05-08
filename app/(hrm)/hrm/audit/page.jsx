'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Search, Clock, Filter, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = async (currentPage, isLoadMore = false) => {
        setIsLoading(true);
        try {
            let q = supabase
                .from('audit_logs_hrm')
                .select('*, user_profiles!actor_id(full_name, role)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

            if (moduleFilter !== 'all') {
                q = q.eq('module', moduleFilter);
            }
            if (severityFilter !== 'all') {
                q = q.eq('severity', severityFilter);
            }

            const { data, error, count } = await q;

            if (error) throw error;

            if (isLoadMore) {
                setLogs(prev => [...prev, ...(data || [])]);
            } else {
                setLogs(data || []);
            }
            
            setHasMore((data?.length || 0) === PAGE_SIZE && count > (currentPage + 1) * PAGE_SIZE);
        } catch (err) {
            console.error('Audit Log fetch error:', err);
            toast.error('Could not load audit logs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setPage(0);
        fetchLogs(0, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moduleFilter, severityFilter]);

    useEffect(() => {
        if (page > 0) {
            fetchLogs(page, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const getSeverityColor = (severity) => {
        switch(severity) {
            case 'high': return 'bg-rose-100 text-rose-700';
            case 'medium': return 'bg-amber-100 text-amber-700';
            case 'low': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredLogs = logs.filter(log =>
        !search ||
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">Track all system changes and administrative actions.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search logs by action, user, or table..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl transition-colors font-medium ${showFilters ? 'bg-gray-100 border-gray-300 text-gray-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Filter size={18} /> Filters
                </button>
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Module</label>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'Payroll', 'Leaves', 'Core HR', 'Access Control', 'Attendance'].map(mod => (
                                <button 
                                    key={mod}
                                    onClick={() => setModuleFilter(mod)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${moduleFilter === mod ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {mod === 'all' ? 'All Modules' : mod}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Severity</label>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'low', 'medium', 'high'].map(sev => (
                                <button 
                                    key={sev}
                                    onClick={() => setSeverityFilter(sev)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${severityFilter === sev ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {sev}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Logs List */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action Details</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Performed By</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && page === 0 ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse bg-white">
                                        <td className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-lg w-3/4"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-28"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-16"></div></td>
                                    </tr>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex justify-center mb-3"><ShieldAlert size={32} className="text-gray-300" /></div>
                                        <h3 className="text-sm font-semibold text-gray-700">No logs found</h3>
                                        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search query.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5"><ShieldAlert size={16} className="text-gray-400" /></div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{log.action}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Target: {log.record_id ? log.record_id.substring(0, 8) + '...' : 'N/A'} 
                                                        {log.table_name && ` in ${log.table_name}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">{log.module || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <User size={14} className="text-gray-400" /> {log.actor_name || log.user_profiles?.full_name || 'System'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock size={14} className="text-gray-400" /> {new Date(log.created_at).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(log.severity)}`}>
                                                {log.severity || 'low'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Pagination Load More */}
            {hasMore && !isLoading && !search && (
                <div className="flex justify-center pt-2">
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Load More
                    </button>
                </div>
            )}
            {isLoading && page > 0 && (
                <div className="flex justify-center pt-2">
                    <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
