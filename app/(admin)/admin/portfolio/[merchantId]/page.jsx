'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
    Briefcase, ShieldCheck, TrendingUp, Clock, Calendar, Wallet, CheckCircle, XCircle, ArrowLeft,
    Activity, ArrowUpRight, Eye, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import FeedOrderModal from '@/components/admin/investment/FeedOrderModal';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function MerchantPortfolioPage({ params }) {
    const { merchantId } = use(params);
    const router = useRouter();
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    
    // For Modals
    const [showFeedModal, setShowFeedModal] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState(null);

    const fetchPortfolio = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/portfolio/${merchantId}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            const result = await res.json();
            
            if (!res.ok) throw new Error(result.error);
            setData(result.data);
        } catch (err) {
            console.error('Error:', err);
            toast.error('Failed to load merchant portfolio');
            router.push('/admin/investments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, [merchantId, router]);

    const handleReleaseInvestment = async (id, type) => {
        const confirmMsg = type === 'lockin' 
            ? 'Are you sure you want to release this Lockin back to the merchant portfolio?'
            : 'Are you sure you want to release this AI Grow Investment back to the merchant portfolio?';
            
        if (!confirm(confirmMsg)) return;
        
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const endpoint = type === 'lockin' 
                ? `/api/admin/lockin/${id}/release`
                : `/api/admin/investments/${id}/release`;
                
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error);
            }
            toast.success(`${type === 'lockin' ? 'Lockin' : 'Investment'} released to portfolio`);
            fetchPortfolio();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleUpdateStatus = async (id, type, newStatus) => {
        if (!confirm(`Are you sure you want to mark this request as ${newStatus}?`)) return;
        
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const endpoint = type === 'lockin' 
                ? `/api/admin/lockin`
                : `/api/admin/investments`;
                
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}` 
                },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error);
            }
            toast.success(`Marked as ${newStatus}`);
            fetchPortfolio();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleSettleCash = async (id, type) => {
        if (!confirm(`Are you sure you want to settle this ${type === 'lockin' ? 'Lockin' : 'Investment'} in cash? This will mark it as completed without crediting the merchant's wallet.`)) return;
        
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const endpoint = type === 'lockin' 
                ? `/api/admin/lockin/${id}/settle-cash`
                : `/api/admin/investments/${id}/settle-cash`;
                
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error);
            }
            toast.success(`Settled in cash successfully`);
            fetchPortfolio();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Loading Portfolio...</p>
            </div>
        );
    }

    const { merchant, investments, lockins } = data;

    const pieData = [
        { name: 'AI Grow', value: merchant.total_ai_grow_paise / 100, color: '#4f46e5' }, // indigo-600
        { name: 'Lockin', value: merchant.total_lockin_paise / 100, color: '#10b981' }    // emerald-500
    ].filter(d => d.value > 0);

    return (
        <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen font-sans">
            <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.back()}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <ArrowLeft size={18} className="text-slate-600" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{merchant.business_name}</h1>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1">
                                    <CheckCircle size={10} /> Verified
                                </span>
                            </div>
                            <p className="text-xs font-medium text-slate-500">{merchant.user_profiles?.full_name} • {merchant.user_profiles?.phone}</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={fetchPortfolio}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:text-indigo-600 transition-all shadow-sm text-xs font-bold"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                {/* Summary Stats & Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl">
                            <div className="absolute right-4 top-4 opacity-10"><Briefcase size={64} /></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Deployed Capital</p>
                            <p className="text-3xl font-black tracking-tight">₹{(merchant.total_active_capital_paise / 100).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                                    <TrendingUp size={16} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Grow Funds</p>
                            </div>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">₹{(merchant.total_ai_grow_paise / 100).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                                    <ShieldCheck size={16} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Secured Lockin</p>
                            </div>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">₹{(merchant.total_lockin_paise / 100).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm lg:col-span-1 h-[200px] flex flex-col relative overflow-hidden">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 z-10">Asset Distribution</p>
                        {pieData.length > 0 ? (
                            <div className="flex-1 w-full h-full absolute inset-0 pt-8 pb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-300">No active assets</div>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    
                    {/* AI Grow Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Activity size={18} className="text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-900">AI Grow Investments</h2>
                        </div>
                        
                        {investments.length === 0 ? (
                            <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-8 text-center text-slate-400">
                                No AI Grow investments found.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {investments.map(inv => (
                                    <div key={inv.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">₹{(inv.amount_paise / 100).toLocaleString('en-IN')}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    Invested {new Date(inv.created_at).toLocaleDateString('en-IN')}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                inv.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                inv.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
                                            {inv.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(inv.id, 'ai_grow', 'active')}
                                                        disabled={processingId === inv.id}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all"
                                                    >
                                                        {processingId === inv.id ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(inv.id, 'ai_grow', 'rejected')}
                                                        disabled={processingId === inv.id}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all"
                                                    >
                                                        {processingId === inv.id ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />} Reject
                                                    </button>
                                                </>
                                            )}
                                            {inv.status === 'active' && (
                                                <>
                                                    <button 
                                                        onClick={() => { setSelectedInvestment({ ...inv, merchant }); setShowFeedModal(true); }}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all"
                                                    >
                                                        <Activity size={14} /> Feed Orders
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReleaseInvestment(inv.id, 'ai_grow')}
                                                        disabled={processingId === inv.id}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        {processingId === inv.id ? <RefreshCw size={14} className="animate-spin" /> : <Wallet size={14} />} Release
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSettleCash(inv.id, 'ai_grow')}
                                                        disabled={processingId === inv.id}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        {processingId === inv.id ? <RefreshCw size={14} className="animate-spin" /> : <Briefcase size={14} />} Settled in Cash
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Lockin Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <ShieldCheck size={18} className="text-emerald-600" />
                            <h2 className="text-lg font-bold text-slate-900">Lockin Balances</h2>
                        </div>

                        {lockins.length === 0 ? (
                            <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-8 text-center text-slate-400">
                                No Lockin balances found.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {lockins.map(lockin => {
                                    const startDate = new Date(lockin.start_date);
                                    const endDate = new Date(lockin.end_date);
                                    const today = new Date();
                                    const elapsed = Math.min(endDate - startDate, Math.max(0, today - startDate));
                                    const progress = (elapsed / (endDate - startDate)) * 100;

                                    const projectionData = [];
                                    if (lockin.status === 'active') {
                                        for (let i = 0; i <= lockin.lockin_period_months; i++) {
                                            const d = new Date(startDate);
                                            d.setMonth(d.getMonth() + i);
                                            const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                                            const principal = lockin.amount_paise / 100;
                                            const interest = principal * (lockin.interest_rate / 100) * (i / 12);
                                            projectionData.push({ month: label, value: principal + interest });
                                        }
                                    }

                                    return (
                                        <div key={lockin.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">₹{(lockin.amount_paise / 100).toLocaleString('en-IN')}</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                                                        <TrendingUp size={12} className="text-emerald-500" /> {lockin.interest_rate}% Bonus Rate
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    lockin.status === 'active' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    lockin.status === 'matured' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>
                                                    {lockin.status}
                                                </span>
                                            </div>

                                            {lockin.status === 'active' && (
                                                <div className="mb-6 space-y-4">
                                                    <div className="h-[120px] w-full -mx-2">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={projectionData}>
                                                                <defs>
                                                                    <linearGradient id={`colorValue-${lockin.id}`} x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                                    </linearGradient>
                                                                </defs>
                                                                <XAxis dataKey="month" hide />
                                                                <RechartsTooltip 
                                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                                    formatter={(value) => [`₹${Math.round(value).toLocaleString('en-IN')}`, 'Projected']}
                                                                    labelStyle={{ display: 'none' }}
                                                                />
                                                                <Area 
                                                                    type="monotone" 
                                                                    dataKey="value" 
                                                                    stroke="#10b981" 
                                                                    strokeWidth={2}
                                                                    fillOpacity={1} 
                                                                    fill={`url(#colorValue-${lockin.id})`} 
                                                                    isAnimationActive={false}
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                            <span>Progress</span>
                                                            <span>{Math.round(progress)}%</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                                        </div>
                                                        <p className="text-[10px] font-medium text-slate-400 text-right">
                                                            Matures on {endDate.toLocaleDateString('en-IN')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
                                                {lockin.status === 'pending' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(lockin.id, 'lockin', 'active')}
                                                            disabled={processingId === lockin.id}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            {processingId === lockin.id ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(lockin.id, 'lockin', 'rejected')}
                                                            disabled={processingId === lockin.id}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            {processingId === lockin.id ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />} Reject
                                                        </button>
                                                    </>
                                                )}
                                                {lockin.status === 'active' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleReleaseInvestment(lockin.id, 'lockin')}
                                                            disabled={processingId === lockin.id}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
                                                        >
                                                            {processingId === lockin.id ? <RefreshCw size={14} className="animate-spin" /> : <Wallet size={14} />} Release Lockin to Wallet
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSettleCash(lockin.id, 'lockin')}
                                                            disabled={processingId === lockin.id}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                                        >
                                                            {processingId === lockin.id ? <RefreshCw size={14} className="animate-spin" /> : <Briefcase size={14} />} Settled in Cash
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showFeedModal && selectedInvestment && (
                <FeedOrderModal 
                    investment={selectedInvestment} 
                    onClose={(refresh) => {
                        setShowFeedModal(false);
                        setSelectedInvestment(null);
                        if (refresh) fetchPortfolio();
                    }} 
                />
            )}
        </div>
    );
}
