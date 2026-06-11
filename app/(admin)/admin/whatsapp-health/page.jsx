'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Activity, 
    Loader2, 
    RefreshCw, 
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Smartphone,
    MessageSquare,
    Users,
    Store,
    Calendar,
    ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminWhatsAppHealthPage() {
    const [window, setWindow] = useState('24h');
    const [channel, setChannel] = useState('all');
    const [audience, setAudience] = useState('all');
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHealthData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const params = new URLSearchParams({
                window,
                channel,
                audience
            });
            const response = await fetch(`/api/admin/whatsapp-delivery-health?${params.toString()}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch delivery health stats');
            }
            const resData = await response.json();
            setData(resData);
        } catch (error) {
            console.error('Error fetching whatsapp health data:', error);
            toast.error(error.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [window, channel, audience]);

    useEffect(() => {
        fetchHealthData();
    }, [fetchHealthData]);

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch {
            return dateStr;
        }
    };

    const successRate = data?.summary?.total > 0
        ? ((data.summary.delivered / data.summary.total) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-[family-name:var(--font-outfit)]">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                            <Activity size={26} />
                        </div>
                        WhatsApp Delivery Health
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1.5 ml-1">
                        Monitor real-time WhatsApp and webchat delivery outcomes, success rates, and failure logs.
                    </p>
                </div>

                <button
                    onClick={() => fetchHealthData(true)}
                    disabled={loading || refreshing}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition-all hover:border-slate-300 disabled:opacity-60 shrink-0"
                >
                    <RefreshCw size={16} className={`${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4">
                {/* Time Window Filter */}
                <div className="flex flex-col gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Calendar size={10} /> Time Window
                    </label>
                    <div className="relative">
                        <select
                            value={window}
                            onChange={(e) => setWindow(e.target.value)}
                            className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2 px-3 pr-8 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="24h">Past 24 Hours</option>
                            <option value="7d">Past 7 Days</option>
                            <option value="30d">Past 30 Days</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                </div>

                {/* Channel Filter */}
                <div className="flex flex-col gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Smartphone size={10} /> Channel
                    </label>
                    <div className="relative">
                        <select
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                            className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2 px-3 pr-8 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">All Channels</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="web">Web Chat</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                </div>

                {/* Audience Filter */}
                <div className="flex flex-col gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Users size={10} /> Audience
                    </label>
                    <div className="relative">
                        <select
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2 px-3 pr-8 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">All Audiences</option>
                            <option value="customer">Customer</option>
                            <option value="merchant">Merchant</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center gap-4 shadow-sm">
                    <Loader2 className="animate-spin text-blue-600" size={40} />
                    <span className="text-sm font-black text-slate-600 tracking-widest uppercase animate-pulse">
                        Analyzing delivery metrics...
                    </span>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Delivered Card */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivered</span>
                                <h3 className="text-3xl font-black text-slate-800">{data?.summary?.delivered || 0}</h3>
                                <p className="text-xs text-emerald-600 font-extrabold flex items-center gap-1">
                                    {successRate}% Success Rate
                                </p>
                            </div>
                            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm">
                                <CheckCircle size={22} />
                            </div>
                        </div>

                        {/* Failed Card */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Failed</span>
                                <h3 className="text-3xl font-black text-slate-800">{data?.summary?.failed || 0}</h3>
                                <p className="text-xs text-rose-500 font-bold">
                                    Requires investigation
                                </p>
                            </div>
                            <div className="p-3.5 bg-rose-50 text-rose-500 rounded-xl shadow-sm">
                                <XCircle size={22} />
                            </div>
                        </div>

                        {/* Pending Card */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
                                <h3 className="text-3xl font-black text-slate-800">{data?.summary?.pending || 0}</h3>
                                <p className="text-xs text-amber-600 font-medium">
                                    Awaiting provider update
                                </p>
                            </div>
                            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl shadow-sm">
                                <Clock size={22} />
                            </div>
                        </div>

                        {/* Total Card */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Messages</span>
                                <h3 className="text-3xl font-black text-slate-800">{data?.summary?.total || 0}</h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Triggered in time window
                                </p>
                            </div>
                            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
                                <MessageSquare size={22} />
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Graphs & Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Channel Breakdown */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                <h4 className="font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                    <Smartphone size={16} className="text-blue-500" />
                                    Channel Distribution
                                </h4>
                            </div>
                            <div className="space-y-4">
                                {Object.entries(data?.breakdown?.channel || {}).map(([key, val]) => {
                                    const pct = data.summary.total > 0 ? ((val / data.summary.total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={key} className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold text-slate-600 capitalize">
                                                <span>{key === 'web' ? 'Web Chat' : 'WhatsApp'}</span>
                                                <span>{val} ({pct}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!data?.breakdown?.channel || Object.keys(data.breakdown.channel).length === 0) && (
                                    <p className="text-xs text-slate-400 text-center py-4 font-semibold">No channel data available</p>
                                )}
                            </div>
                        </div>

                        {/* Audience Breakdown */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                <h4 className="font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                    <Users size={16} className="text-indigo-500" />
                                    Audience Distribution
                                </h4>
                            </div>
                            <div className="space-y-4">
                                {Object.entries(data?.breakdown?.audience || {}).map(([key, val]) => {
                                    const pct = data.summary.total > 0 ? ((val / data.summary.total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={key} className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold text-slate-600 capitalize">
                                                <span>{key}</span>
                                                <span>{val} ({pct}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!data?.breakdown?.audience || Object.keys(data.breakdown.audience).length === 0) && (
                                    <p className="text-xs text-slate-400 text-center py-4 font-semibold">No audience data available</p>
                                )}
                            </div>
                        </div>

                        {/* Message Type Breakdown */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                <h4 className="font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                    <MessageSquare size={16} className="text-emerald-500" />
                                    Message Types
                                </h4>
                            </div>
                            <div className="space-y-4">
                                {Object.entries(data?.breakdown?.message_type || {}).map(([key, val]) => {
                                    const pct = data.summary.total > 0 ? ((val / data.summary.total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={key} className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold text-slate-600 capitalize">
                                                <span>{key}</span>
                                                <span>{val} ({pct}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!data?.breakdown?.message_type || Object.keys(data.breakdown.message_type).length === 0) && (
                                    <p className="text-xs text-slate-400 text-center py-4 font-semibold">No message type data available</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Failures Log */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                            <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 tracking-tight text-base">Recent Failures Log</h4>
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                    Detailed error codes and previews of the last 50 failed messages in this filter.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50/20">
                                        <th className="p-4 pl-6">Timestamp</th>
                                        <th className="p-4">Audience</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Error Code</th>
                                        <th className="p-4">Error Details</th>
                                        <th className="p-4 pr-6">Content Preview</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                                    {data?.recent_failures?.map((fail, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 pl-6 font-bold text-xs text-slate-500 whitespace-nowrap">
                                                {formatDateTime(fail.created_at)}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold tracking-wide ${
                                                    fail.audience === 'merchant'
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                }`}>
                                                    {fail.audience === 'merchant' ? (
                                                        <>
                                                            <Store size={10} /> Merchant
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Users size={10} /> Customer
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap font-bold text-slate-600 capitalize text-xs">
                                                {fail.message_type || 'N/A'}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {fail.error_code ? (
                                                    <span className="font-extrabold text-xs text-rose-600 px-2 py-0.5 bg-rose-50 border border-rose-100 rounded-lg">
                                                        {fail.error_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">N/A</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-xs font-semibold text-slate-500 max-w-[250px] truncate" title={fail.error_detail}>
                                                {fail.error_detail || 'No details provided'}
                                            </td>
                                            <td className="p-4 pr-6 text-xs text-slate-600 max-w-[200px] truncate" title={fail.content_preview}>
                                                {fail.content_preview || 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!data?.recent_failures || data.recent_failures.length === 0) && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-12 text-slate-400 font-bold text-xs">
                                                No failures logged in this window. High five! 🙌
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
