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
import { useRouter } from 'next/navigation';
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
    const router = useRouter();
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'grouped'

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

    // Filter individual lockins
    const filteredIndividual = balances.filter(b =>
        b.merchant?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.merchant?.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group balances by merchant
    const merchantGroups = balances.reduce((acc, b) => {
        const mId = b.merchant?.id;
        if (!mId) return acc;
        if (!acc[mId]) {
            acc[mId] = {
                merchant: b.merchant,
                totalAmount: 0,
                activeCount: 0,
                maturedCount: 0,
                interestRates: [],
                lockins: []
            };
        }
        acc[mId].lockins.push(b);
        if (b.status === 'active') {
            acc[mId].totalAmount += b.amount_paise;
            acc[mId].activeCount++;
            acc[mId].interestRates.push(Number(b.interest_rate));
        } else if (b.status === 'matured' || b.status === 'released') {
            acc[mId].maturedCount++;
        }
        return acc;
    }, {});

    const groupsArray = Object.values(merchantGroups);

    const filteredBalances = groupsArray.filter(g => 
        g.merchant?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.merchant?.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Analytics Data
    const activeBalances = balances.filter(b => b.status === 'active');
    const activeCount = activeBalances.length;
    const totalLockedPaise = activeBalances.reduce((sum, b) => sum + (b.amount_paise || 0), 0);
    
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

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="w-full md:w-auto">
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
                        </div>
                        <button 
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 justify-center"
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
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => `₹${val/1000}k`} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                                                formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Maturity Amount']}
                                            />
                                            <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                                        No active maturity schedules found
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-full md:w-64 bg-slate-900 rounded-xl p-5 text-white space-y-4 shrink-0 shadow-xl shadow-slate-900/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Active Lockin</p>
                            <div>
                                <h3 className="text-2xl font-bold font-mono tracking-tight text-white">₹{(totalLockedPaise / 100).toLocaleString('en-IN')}</h3>
                                <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                                    <TrendingUp size={12} />
                                    {activeCount} active merchant contracts
                                </p>
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                                <span>Yield Target</span>
                                <span className="font-bold text-white">Guaranteed</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Lockin Health Metrics</h2>
                            
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-medium text-slate-600">Avg Lock Duration</span>
                                    <span className="text-xs font-bold text-slate-900">12 Months</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-medium text-slate-600">Default Risk</span>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">0.0% (Zero)</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-medium text-slate-600">Early Release Fee</span>
                                    <span className="text-xs font-bold text-slate-900">Standard 2.5%</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button className="w-full py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors border border-slate-200 rounded-xl">
                                View Full Schedule
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sleek Data Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h3 className="font-bold text-slate-900">Portfolio Ledger</h3>
                            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                            <div className="flex p-1 bg-slate-100 rounded-lg">
                                <button
                                    onClick={() => setViewMode('individual')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'individual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Each Lockin ({filteredIndividual.length})
                                </button>
                                <button
                                    onClick={() => setViewMode('grouped')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'grouped' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    By Merchant ({filteredBalances.length})
                                </button>
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
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-96 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Ledger...</p>
                        </div>
                    ) : (viewMode === 'individual' ? filteredIndividual.length > 0 : filteredBalances.length > 0) ? (
                        <>
                            {viewMode === 'individual' ? (
                                /* Individual Lockin Items View */
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merchant</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Locked Amount</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Bonus %</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Term</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maturity Date</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredIndividual.map(b => (
                                                <tr 
                                                    key={b.id} 
                                                    onClick={() => router.push(`/admin/portfolio/${b.merchant_id}`)}
                                                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm">
                                                                {b.merchant?.business_name?.[0] || 'L'}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-900 text-sm">{b.merchant?.business_name}</p>
                                                                <p className="text-[10px] text-slate-500 font-mono">ID: {b.id.slice(0, 10)}...</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <p className="font-bold text-slate-900 text-sm tracking-tight">₹{(b.amount_paise / 100).toLocaleString('en-IN')}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-blue-600 text-sm">
                                                        {b.interest_rate}%
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-xs font-medium text-slate-600">
                                                        {b.term_months || 12} Months
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                                        {new Date(b.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${b.status === 'active' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link 
                                                            href={`/admin/portfolio/${b.merchant_id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all flex items-center justify-center w-fit ml-auto"
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
                                /* Grouped View */
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merchant Details</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Active Value</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Avg Bonus %</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Active Terms</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status Summary</th>
                                                <th className="px-6 py-4 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredBalances.map(group => {
                                                const avgBonus = group.interestRates.length > 0 
                                                    ? (group.interestRates.reduce((a, b) => a + b, 0) / group.interestRates.length).toFixed(1) 
                                                    : '-';
                                                    
                                                return (
                                                <tr 
                                                    key={group.merchant.id} 
                                                    onClick={() => router.push(`/admin/portfolio/${group.merchant.id}`)}
                                                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm shadow-slate-100">
                                                                {group.merchant?.business_name?.[0] || 'M'}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-900 text-sm">{group.merchant?.business_name}</p>
                                                                <p className="text-[10px] text-slate-500 font-medium">{group.merchant?.user_profiles?.full_name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <p className="font-bold text-slate-900 text-sm tracking-tight">₹{(group.totalAmount / 100).toLocaleString('en-IN')}</p>
                                                        {group.activeCount > 0 && <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 inline-block rounded mt-1">SECURED</p>}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-sm font-bold text-blue-600">{avgBonus}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-semibold text-slate-600">{group.activeCount}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {group.activeCount > 0 && <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">Active</span>}
                                                            {group.maturedCount > 0 && <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">Matured/Released</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link 
                                                            href={`/admin/portfolio/${group.merchant.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all flex items-center justify-center w-fit ml-auto"
                                                        >
                                                            <Eye size={16} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                            <Clock className="text-slate-300 mb-2" size={32} />
                            <p className="text-sm font-bold text-slate-700">No lockin records found</p>
                            <p className="text-xs text-slate-400 mt-1">Deploy capital or adjust search query to populate ledger.</p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <LockinTransferModal 
                    isOpen={showModal} 
                    onClose={() => setShowModal(false)} 
                    onSuccess={fetchBalances}
                />
            )}
        </div>
    );
}
