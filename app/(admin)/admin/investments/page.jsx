'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Search, RefreshCw, Plus, CheckCircle, XCircle,
    TrendingUp, Briefcase, Activity, Percent, Eye, ChevronRight, Wallet
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import AddInvestmentModal from '@/components/admin/investment/AddInvestmentModal';
import FeedOrderModal from '@/components/admin/investment/FeedOrderModal';
import SettleConfirmModal from '@/components/admin/investment/SettleConfirmModal';
import GrowthAnalytics from '@/components/admin/investment/GrowthAnalytics';
import { motion, AnimatePresence } from 'framer-motion';
import PageGuideWrapper from '@/components/admin/PageGuideWrapper';

const STATUS_CHIP = {
    active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    rejected: 'bg-red-50 text-red-600 border-red-100',
    completed: 'bg-blue-50 text-blue-600 border-blue-100',
};

export default function AdminInvestmentsPage() {
    const [investments, setInvestments] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'grouped'
    const [processingId, setProcessingId] = useState(null);
    const [showFeedModal, setShowFeedModal] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [confirmModalData, setConfirmModalData] = useState(null);
    const router = useRouter();

    const handleReleaseInvestment = async (id) => {
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/investments/${id}/release`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Plan released to portfolio');
            setConfirmModalData(null);
            fetchInvestments();
        } catch (err) { toast.error(err.message); } finally { setProcessingId(null); }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        if (!confirm(`Are you sure you want to mark this request as ${newStatus}?`)) return;
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/investments`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(`Marked as ${newStatus}`);
            fetchInvestments();
        } catch (err) { toast.error(err.message); } finally { setProcessingId(null); }
    };

    const handleSettleCash = async (id) => {
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/investments/${id}/settle-cash`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Settled in cash successfully');
            setConfirmModalData(null);
            fetchInvestments();
        } catch (err) { toast.error(err.message); } finally { setProcessingId(null); }
    };

    const fetchInvestments = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/admin/investments', { headers: { Authorization: `Bearer ${session.access_token}` } });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to load');
            setInvestments(result.data || []);
            setWallets(result.wallets || []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvestments(); }, []);

    // Individual investments filtered
    const filteredIndividual = investments.filter(inv => {
        const matchesSearch = inv.merchant?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              inv.merchant?.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'all' || inv.status === activeTab;
        return matchesSearch && matchesTab;
    });

    // Group investments by merchant
    const merchantGroups = investments.reduce((acc, inv) => {
        const mId = inv.merchant?.id;
        if (!mId) return acc;
        if (!acc[mId]) {
            acc[mId] = {
                merchant: inv.merchant,
                totalAUM: 0,
                activeCount: 0,
                pendingCount: 0,
                totalPaid: 0,
                investments: []
            };
        }
        acc[mId].investments.push(inv);
        if (inv.status === 'active') {
            acc[mId].totalAUM += inv.amount_paise;
            acc[mId].activeCount++;
        }
        if (inv.status === 'pending') {
            acc[mId].pendingCount++;
        }
        acc[mId].totalPaid += (inv.total_profit_paid_paise || 0);
        return acc;
    }, {});

    const groupsArray = Object.values(merchantGroups);

    const filtered = groupsArray.filter(g => {
        const matchesSearch = g.merchant?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              g.merchant?.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'all' || 
                           (activeTab === 'active' && g.activeCount > 0) ||
                           (activeTab === 'pending' && g.pendingCount > 0);
        return matchesSearch && matchesTab;
    });

    const stats = useMemo(() => {
        // Find all unique merchant IDs from investments and wallets
        const mIds = new Set([...investments.map(i => i.merchant_id), ...wallets.map(w => w.merchant_id)]);
        
        let totalAUM = 0;
        let activePlans = 0;
        let pendingPlans = 0;
        let totalPaid = 0;

        for (const mId of mIds) {
            if (!mId) continue;
            const mWallets = wallets.find(w => w.merchant_id === mId);
            const mInv = investments.filter(i => i.merchant_id === mId);
            
            const activeInv = mInv.filter(i => i.status === 'active');
            const planTotal = activeInv.reduce((s, i) => s + i.amount_paise, 0);
            const walletBalPaise = (mWallets?.balance_paise || 0);
            
            totalAUM += Math.max(planTotal, walletBalPaise);
            
            activePlans += mInv.filter(i => i.status === 'active').length;
            pendingPlans += mInv.filter(i => i.status === 'pending').length;
            totalPaid += mInv.reduce((s, i) => s + (i.total_profit_paid_paise || 0), 0);
        }

        return {
            totalAUM: totalAUM / 100,
            totalActive: activePlans,
            totalPending: pendingPlans,
            totalPaid: totalPaid / 100,
        };
    }, [investments, wallets]);

    return (
        <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen">
            <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-20">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-2">
                            <Activity size={12} className="text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Command Center</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">AI Grow</h1>
                        <p className="text-sm text-slate-500 font-medium">Manage capital deployments, monitor ROI, and handle merchant requests.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <PageGuideWrapper pageKey="/admin/investments" />
                        <button onClick={fetchInvestments} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => router.push('/admin/ai-grow/wallets')}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 font-black text-xs uppercase tracking-widest rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-all shadow-sm active:scale-95">
                            <Wallet size={16} /> Wallets
                        </button>
                        <button onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
                            <Plus size={16} /> Deploy Capital
                        </button>
                    </div>
                </div>

                {/* Growth Analytics Charts */}
                <GrowthAnalytics investments={investments} />

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl">
                        <div className="absolute right-4 top-4 opacity-10"><Briefcase size={64} /></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total AUM</p>
                        <p className="text-2xl md:text-3xl font-black">₹{stats.totalAUM.toLocaleString('en-IN')}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Plans</p>
                        <p className="text-2xl md:text-3xl font-black text-slate-900">{stats.totalActive}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
                        {stats.totalPending > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/20 blur-2xl rounded-full" />}
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pending Review</p>
                        <p className="text-2xl md:text-3xl font-black text-amber-500">{stats.totalPending}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Paid Out</p>
                        <p className="text-2xl md:text-3xl font-black text-emerald-600">₹{stats.totalPaid.toLocaleString('en-IN')}</p>
                    </motion.div>
                </div>

                {/* Table & Controls */}
                <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                    <div className="p-4 md:p-6 lg:px-8 lg:py-6 border-b border-slate-50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50">
                        
                        {/* Tabs + View Mode */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex p-1 bg-slate-100/80 rounded-xl overflow-x-auto no-scrollbar">
                                {['all', 'active', 'pending', 'rejected'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="flex p-1 bg-slate-200/60 rounded-xl">
                                <button
                                    onClick={() => setViewMode('individual')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'individual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Each Plan ({filteredIndividual.length})
                                </button>
                                <button
                                    onClick={() => setViewMode('grouped')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'grouped' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    By Merchant ({filtered.length})
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full md:w-72">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search merchant..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none w-full transition-all shadow-sm" />
                        </div>
                    </div>

                    <div className="min-h-[400px]">
                        {loading && investments.length === 0 ? (
                            <div className="px-8 py-32 text-center">
                                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Plans...</p>
                            </div>
                        ) : (viewMode === 'individual' ? filteredIndividual.length === 0 : filtered.length === 0) ? (
                            <div className="px-8 py-32 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Briefcase className="text-slate-300" size={32} />
                                </div>
                                <p className="text-sm font-black text-slate-600 mb-1">No records found</p>
                                <p className="text-xs font-medium text-slate-400">Try adjusting your filters or search query.</p>
                            </div>
                        ) : viewMode === 'individual' ? (
                            /* Individual Investments View */
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-white border-b border-slate-100">
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant & Plan ID</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount (Capital)</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Profit Paid</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Deployed</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        <AnimatePresence>
                                            {filteredIndividual.map(inv => (
                                                <motion.tr 
                                                    key={inv.id} 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => router.push(`/admin/portfolio/${inv.merchant_id}`)}
                                                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 md:px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
                                                                {inv.merchant?.business_name?.[0] || 'I'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{inv.merchant?.business_name}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {inv.id.slice(0, 10)}...</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5 text-right font-black text-slate-900 text-[15px]">
                                                        ₹{(inv.amount_paise / 100).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5 text-right font-black text-emerald-600 text-sm">
                                                        ₹{((inv.total_profit_paid_paise || 0) / 100).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5 text-sm text-slate-500 font-medium">
                                                        {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_CHIP[inv.status] || 'bg-slate-50 text-slate-600'}`}>
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {inv.status === 'pending' && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(inv.id, 'active'); }} disabled={processingId === inv.id} title="Approve" className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle size={14}/></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(inv.id, 'rejected'); }} disabled={processingId === inv.id} title="Reject" className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><XCircle size={14}/></button>
                                                                </>
                                                            )}
                                                            {inv.status === 'active' && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedInvestment(inv); setShowFeedModal(true); }} disabled={processingId === inv.id} title="Feed Orders" className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Activity size={14}/></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setConfirmModalData({ item: inv, action: 'wallet', type: 'aigrow' }); }} disabled={processingId === inv.id} title="Release to Wallet" className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Wallet size={14}/></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setConfirmModalData({ item: inv, action: 'cash', type: 'aigrow' }); }} disabled={processingId === inv.id} title="Settle in Cash" className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Briefcase size={14}/></button>
                                                                </>
                                                            )}
                                                            <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/portfolio/${inv.merchant_id}`); }}
                                                                title="View Full Portfolio"
                                                                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                                <Eye size={14} /> View
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* Grouped View */
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-white border-b border-slate-100">
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total AUM</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Active Plans</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pending Review</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Summary</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        <AnimatePresence>
                                            {filtered.map(group => (
                                                <motion.tr 
                                                    key={group.merchant.id} 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => router.push(`/admin/portfolio/${group.merchant.id}`)}
                                                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 md:px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-sm shrink-0">
                                                                {group.merchant?.business_name?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{group.merchant?.business_name}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{group.merchant?.user_profiles?.full_name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5 text-right font-black text-slate-900 text-[15px]">
                                                        ₹{(group.totalAUM / 100).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5 text-right font-black text-indigo-600 text-sm">
                                                        {group.activeCount}
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5 text-right font-black text-amber-600 text-sm">
                                                        {group.pendingCount}
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            {group.activeCount > 0 && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">Active</span>}
                                                            {group.pendingCount > 0 && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">Pending</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 md:px-8 py-5 text-right">
                                                        <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/portfolio/${group.merchant.id}`); }}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                            <Eye size={14} /> Open Portfolio
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showAddModal && (
                    <AddInvestmentModal onClose={(refresh) => { setShowAddModal(false); if (refresh) fetchInvestments(); }} />
                )}
                {showFeedModal && selectedInvestment && (
                    <FeedOrderModal 
                        investment={selectedInvestment} 
                        onClose={(refresh) => { setShowFeedModal(false); setSelectedInvestment(null); if (refresh) fetchInvestments(); }} 
                    />
                )}
                {confirmModalData && (
                    <SettleConfirmModal
                        item={confirmModalData.item}
                        type={confirmModalData.type}
                        action={confirmModalData.action}
                        loading={processingId === confirmModalData.item.id}
                        onClose={() => setConfirmModalData(null)}
                        onConfirm={() => {
                            if (confirmModalData.action === 'wallet') handleReleaseInvestment(confirmModalData.item.id);
                            else handleSettleCash(confirmModalData.item.id);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
