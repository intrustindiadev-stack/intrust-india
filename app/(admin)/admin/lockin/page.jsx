'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
    Clock, 
    Plus, 
    Search, 
    RefreshCw, 
    Calendar, 
    TrendingUp, 
    ChevronRight, 
    AlertCircle,
    Building2,
    CheckCircle,
    XCircle,
    ArrowUpRight,
    Filter,
    ArrowRight,
    Eye,
    LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import LockinTransferModal from '@/components/admin/LockinTransferModal';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';

export default function AdminLockinPage() {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchBalances = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/admin/lockin', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to load balances');

            setBalances(result.data || []);
        } catch (err) {
            console.error('Error:', err);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    const filteredBalances = balances.filter(b => 
        b.merchant?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.merchant?.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Analytics Data
    const totalLockedPaise = balances.reduce((sum, b) => sum + (b.amount_paise || 0), 0);
    const activeBalances = balances.filter(b => b.status === 'active');
    const activeCount = activeBalances.length;
    
    const chartData = useMemo(() => {
        if (activeBalances.length === 0) return [];
        
        // Group by maturity month
        const groups = activeBalances.reduce((acc, b) => {
            const date = new Date(b.end_date);
            const monthYear = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
            acc[monthYear] = (acc[monthYear] || 0) + (b.amount_paise / 100);
            return acc;
        }, {});

        return Object.entries(groups)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => new Date(a.month) - new Date(b.month));
    }, [activeBalances]);

    return (
        <div className="p-6 bg-slate-50/50 min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Minimal Header */}
            <div className="max-w-[1600px] mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lockin Manager</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Portfolio oversight and yield distribution pipeline
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search inventory..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none w-full md:w-72 transition-all shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Deploy Capital
                        </button>
                    </div>
                </div>

                {/* Performance Summary Bar */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 w-full space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Yield Pipeline (Maturity Schedule)</h2>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Real-time projection</span>
                            </div>
                            <div className="h-[180px] w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis 
                                                dataKey="month" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{fontSize: 10, fill: '#64748b'}} 
                                                dy={10}
                                            />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Maturity Amount']}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="amount" 
                                                stroke="#2563eb" 
                                                strokeWidth={2}
                                                fillOpacity={1} 
                                                fill="url(#colorAmount)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-300 text-xs italic">
                                        Insufficient active data for projection
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-full md:w-[240px] border-t md:border-t-0 md:border-l border-slate-100 md:pl-8 pt-6 md:pt-0 space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AUM Total</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">₹{(totalLockedPaise / 100).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Terms</p>
                                    <p className="text-lg font-bold text-slate-900">{activeCount}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bonus Avg</p>
                                    <p className="text-lg font-bold text-blue-600">
                                        {balances.length > 0 ? (balances.reduce((a, b) => a + Number(b.interest_rate), 0) / balances.length).toFixed(1) : 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 bg-slate-900 rounded-2xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-8 transform translate-x-4 -translate-y-4 opacity-10 transition-transform group-hover:scale-110">
                            <Clock size={120} className="text-white" />
                        </div>
                        <div className="relative z-10 space-y-1">
                            <h3 className="text-white font-bold">Priority Actions</h3>
                            <p className="text-slate-400 text-xs">Maturity alerts & system health</p>
                        </div>
                        <div className="relative z-10 space-y-3 mt-4">
                            {balances.filter(b => b.status === 'active').slice(0, 2).map(b => (
                                <div key={b.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                            <Calendar size={14} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white truncate w-32">{b.merchant?.business_name}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(b.end_date).toLocaleDateString('en-IN')}</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-600" />
                                </div>
                            ))}
                            <button className="w-full py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors border border-white/5 rounded-xl mt-2">
                                View Full Schedule
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sleek Data Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-slate-900">Portfolio Ledger</h3>
                            <div className="h-4 w-px bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Updates</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={fetchBalances}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                disabled={loading}
                            >
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            </button>
                            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all">
                                <Filter size={16} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-96 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Ledger...</p>
                        </div>
                    ) : filteredBalances.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merchant Details</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Fund Value</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retention Bonus %</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Term</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unlock Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Protections</th>
                                        <th className="px-6 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredBalances.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm shadow-slate-100">
                                                        {item.merchant?.business_name?.[0] || 'M'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 text-sm">{item.merchant?.business_name}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">{item.merchant?.user_profiles?.full_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-bold text-slate-900 text-sm tracking-tight">₹{(item.amount_paise / 100).toLocaleString('en-IN')}</p>
                                                <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 inline-block rounded">SECURED</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-bold text-blue-600">{item.interest_rate}%</span>
                                                    <ArrowUpRight size={10} className="text-blue-400" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-semibold text-slate-600">{item.lockin_period_months}M</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                                    {new Date(item.end_date).toLocaleDateString('hi-IN', { month: '2-digit', year: 'numeric', day: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                                                    item.status === 'active' 
                                                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                        : item.status === 'matured'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                    {item.status === 'active' ? <Clock size={10} /> : item.status === 'matured' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                    {item.status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link 
                                                    href={`/admin/lockin/${item.id}`}
                                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center w-fit"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center p-12 text-center bg-slate-50/20">
                            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <AlertCircle size={32} className="text-slate-300" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">Portfolio Empty</h4>
                            <p className="text-slate-500 text-xs mt-1 max-w-xs font-medium">
                                No capital has been deployed to merchant lockin accounts yet.
                            </p>
                            <button 
                                onClick={() => setShowModal(true)}
                                className="mt-6 bg-white border border-slate-200 px-6 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                            >
                                Initiate First Transfer
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <LockinTransferModal 
                    onClose={(refresh) => {
                        setShowModal(false);
                        if (refresh) fetchBalances();
                    }} 
                />
            )}
        </div>
    );
}
