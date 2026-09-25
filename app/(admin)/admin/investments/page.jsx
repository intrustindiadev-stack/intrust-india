'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Search, RefreshCw, Plus, CheckCircle, XCircle,
    TrendingUp, Briefcase, Activity, Percent, Eye, ChevronRight, 
    Wallet, Banknote, Edit3, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import AddInvestmentModal from '@/components/admin/investment/AddInvestmentModal';
import FeedOrderModal from '@/components/admin/investment/FeedOrderModal';
import InvestmentSettlementFlow from '@/components/admin/investment/InvestmentSettlementFlow';
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
    const [showAnalyticsMobile, setShowAnalyticsMobile] = useState(false);

    // Modal state for Feed Simulated Order
    const [showFeedModal, setShowFeedModal] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [feedModalMode, setFeedModalMode] = useState('create'); // 'create' | 'edit'

    // Settlement state
    const [confirmModalData, setConfirmModalData] = useState(null);
    const [settlingInvestment, setSettlingInvestment] = useState(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const router = useRouter();

    const openCreateOrder = (inv) => {
        setSelectedInvestment(inv);
        setSelectedOrder(null);
        setFeedModalMode('create');
        setShowFeedModal(true);
    };

    const openEditOrder = (inv, order) => {
        setSelectedInvestment(inv);
        setSelectedOrder(order || inv.latest_order || null);
        setFeedModalMode('edit');
        setShowFeedModal(true);
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
        } catch (err) { 
            toast.error(err.message); 
        } finally { 
            setProcessingId(null); 
        }
    };

    const fetchInvestments = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
            setIsSuperAdmin(profile?.role === 'super_admin');

            const res = await fetch('/api/admin/investments', { 
                headers: { Authorization: `Bearer ${session.access_token}` } 
            });
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
        if (inv.status === 'completed') {
            acc[mId].completedCount = (acc[mId].completedCount || 0) + 1;
        }
        if (inv.status === 'rejected') {
            acc[mId].rejectedCount = (acc[mId].rejectedCount || 0) + 1;
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
                           (activeTab === 'pending' && g.pendingCount > 0) ||
                           (activeTab === 'completed' && (g.completedCount || 0) > 0) ||
                           (activeTab === 'rejected' && (g.rejectedCount || 0) > 0);
        return matchesSearch && matchesTab;
    });

    const stats = useMemo(() => {
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
        <div className="p-3 sm:p-5 md:p-6 bg-[#f8fafc] min-h-screen">
            <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6 md:space-y-8 pb-20">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
                    <div className="space-y-0.5 sm:space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 mb-1">
                            <Activity size={11} className="text-indigo-600" />
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Command Center</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">AI Grow</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Manage capital deployments, simulated orders, and settlements.</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
                        <PageGuideWrapper pageKey="/admin/investments" />
                        <button 
                            onClick={fetchInvestments} 
                            className="p-2.5 sm:p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-xs"
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={() => router.push('/admin/ai-grow/wallets')}
                            className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-indigo-50 text-indigo-700 font-black text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-all shadow-xs active:scale-95"
                        >
                            <Wallet size={15} /> Wallets
                        </button>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-95"
                        >
                            <Plus size={15} /> Deploy Capital
                        </button>
                    </div>
                </div>

                {/* Important Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 text-white relative overflow-hidden shadow-lg">
                        <div className="absolute right-3 top-3 opacity-10"><Briefcase size={48} /></div>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-3">Total AUM</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-black">₹{stats.totalAUM.toLocaleString('en-IN')}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-3">Active Plans</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">{stats.totalActive}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs relative overflow-hidden">
                        {stats.totalPending > 0 && <div className="absolute top-0 right-0 w-12 h-12 bg-amber-400/20 blur-xl rounded-full" />}
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-3">Pending Review</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-500">{stats.totalPending}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-3">Total Paid Out</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600">₹{stats.totalPaid.toLocaleString('en-IN')}</p>
                    </motion.div>
                </div>

                {/* Growth Analytics (Collapsible on mobile to prioritize order management) */}
                <div className="block md:hidden">
                    <button 
                        type="button"
                        onClick={() => setShowAnalyticsMobile(!showAnalyticsMobile)}
                        className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-between shadow-xs transition-colors hover:bg-slate-50"
                    >
                        <span className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-indigo-600" />
                            {showAnalyticsMobile ? 'Hide Analytics Charts' : 'View Analytics & Performance Charts'}
                        </span>
                        {showAnalyticsMobile ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <AnimatePresence>
                        {showAnalyticsMobile && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                                <GrowthAnalytics investments={investments} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="hidden md:block">
                    <GrowthAnalytics investments={investments} />
                </div>

                {/* Plans & Simulated Orders Area */}
                <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] shadow-xs overflow-hidden">
                    {/* Controls & Filters Header */}
                    <div className="p-3 sm:p-5 lg:px-8 lg:py-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 bg-slate-50/50">
                        
                        {/* Tabs + View Mode */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                            {/* Status Filter Chips */}
                            <div className="flex p-1 bg-slate-100/90 rounded-xl overflow-x-auto no-scrollbar">
                                {['all', 'active', 'pending', 'completed', 'rejected'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap ${
                                            activeTab === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            {/* View Mode Toggle */}
                            <div className="flex p-1 bg-slate-200/60 rounded-xl self-start sm:self-auto">
                                <button
                                    onClick={() => setViewMode('individual')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        viewMode === 'individual' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Each Plan ({filteredIndividual.length})
                                </button>
                                <button
                                    onClick={() => setViewMode('grouped')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        viewMode === 'grouped' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    By Merchant ({filtered.length})
                                </button>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-72">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search merchant..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none w-full transition-all shadow-xs" 
                            />
                        </div>
                    </div>

                    <div className="min-h-[350px]">
                        {loading && investments.length === 0 ? (
                            <div className="px-8 py-24 text-center">
                                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Growth Plans...</p>
                            </div>
                        ) : (viewMode === 'individual' ? filteredIndividual.length === 0 : filtered.length === 0) ? (
                            <div className="px-8 py-24 text-center">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <Briefcase className="text-slate-300" size={28} />
                                </div>
                                <p className="text-sm font-black text-slate-700 mb-1">No plans found</p>
                                <p className="text-xs font-medium text-slate-400">Try adjusting your filters or search query.</p>
                            </div>
                        ) : viewMode === 'individual' ? (
                            /* Individual Investments View */
                            <>
                                {/* Mobile Card Layout (< md) */}
                                <div className="block md:hidden divide-y divide-slate-100">
                                    {filteredIndividual.map(inv => (
                                        <div key={inv.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                                            {/* Merchant and Status */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
                                                        {inv.merchant?.business_name?.[0] || 'M'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{inv.merchant?.business_name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {inv.id.slice(0, 8)}...</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${STATUS_CHIP[inv.status] || 'bg-slate-50 text-slate-600'}`}>
                                                    {inv.status}
                                                </span>
                                            </div>

                                            {/* Capital & Total Simulated Profit Metrics */}
                                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capital Deployment</p>
                                                    <p className="text-base font-black text-slate-900">₹{(inv.amount_paise / 100).toLocaleString('en-IN')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Simulated Profit</p>
                                                    <p className="text-base font-black text-emerald-600">₹{((inv.total_profit_paid_paise || 0) / 100).toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>

                                            {/* Simulated Orders List */}
                                            {inv.orders && inv.orders.length > 0 ? (
                                                <div className="mt-3.5 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            Simulated Orders ({inv.orders.length})
                                                        </p>
                                                    </div>
                                                    {inv.orders.map((ord, idx) => (
                                                        <div key={ord.id} className="p-3 bg-slate-50/90 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                                                            <div className="min-w-0 pr-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-slate-900">Order #{idx + 1}</span>
                                                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold">
                                                                        {ord.category || 'General'}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {new Date(ord.order_date).toLocaleDateString('en-IN')}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                                                    <span>Capital: <strong className="text-slate-800">₹{(ord.amount_paise / 100).toLocaleString('en-IN')}</strong></span>
                                                                    <span>Profit: <strong className="text-emerald-600">+₹{(ord.profit_paise / 100).toLocaleString('en-IN')}</strong></span>
                                                                </div>
                                                                {ord.location && (
                                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">📍 {ord.location}</p>
                                                                )}
                                                            </div>
                                                            {inv.status === 'active' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditOrder(inv, ord)}
                                                                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/50 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 flex items-center gap-1"
                                                                >
                                                                    <Edit3 size={11} /> Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="mt-3.5 py-2 px-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                                    <span className="font-bold uppercase text-[9px] tracking-wider text-slate-400">Simulated Orders</span>
                                                    <span className="italic">No orders recorded yet</span>
                                                </div>
                                            )}

                                            {/* Mobile Action Controls */}
                                            <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                                                {inv.status === 'active' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => openCreateOrder(inv)}
                                                            className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                                        >
                                                            <Plus size={14} /> Feed Order
                                                        </button>
                                                        {isSuperAdmin && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setSettlingInvestment(inv)}
                                                                className="py-2.5 px-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                                                            >
                                                                <Banknote size={14} /> Settle
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {isSuperAdmin && inv.status === 'pending' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleUpdateStatus(inv.id, 'active')}
                                                            className="py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleUpdateStatus(inv.id, 'rejected')}
                                                            className="py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                <button 
                                                    type="button"
                                                    onClick={() => router.push(`/admin/portfolio/${inv.merchant_id}`)}
                                                    className="w-full py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                                >
                                                    <Eye size={14} /> View Merchant Portfolio
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table Layout (>= md) */}
                                <div className="hidden md:block overflow-x-auto">
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
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] text-slate-400 font-mono">ID: {inv.id.slice(0, 8)}...</span>
                                                                        {inv.latest_order?.category && (
                                                                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">
                                                                                {inv.latest_order.category}
                                                                            </span>
                                                                        )}
                                                                    </div>
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
                                                                {isSuperAdmin && inv.status === 'pending' && (
                                                                    <>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(inv.id, 'active'); }} 
                                                                            disabled={processingId === inv.id} 
                                                                            title="Approve" 
                                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                                                        >
                                                                            <CheckCircle size={13}/> Approve
                                                                        </button>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(inv.id, 'rejected'); }} 
                                                                            disabled={processingId === inv.id} 
                                                                            title="Reject" 
                                                                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                                                        >
                                                                            <XCircle size={13}/> Reject
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {inv.status === 'active' && (
                                                                    <>
                                                                        {inv.orders && inv.orders.length === 1 && (
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); openEditOrder(inv, inv.orders[0]); }} 
                                                                                title="Edit Simulated Order" 
                                                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 border border-amber-200/50"
                                                                            >
                                                                                <Edit3 size={13} /> Edit Order
                                                                            </button>
                                                                        )}
                                                                        {inv.orders && inv.orders.length > 1 && (
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); router.push(`/admin/portfolio/${inv.merchant_id}`); }} 
                                                                                title="Manage Orders in Portfolio" 
                                                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 border border-amber-200/50"
                                                                            >
                                                                                <Edit3 size={13} /> Orders ({inv.orders.length})
                                                                            </button>
                                                                        )}
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); openCreateOrder(inv); }} 
                                                                            title="Feed New Order" 
                                                                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95"
                                                                        >
                                                                            <Plus size={13} /> Feed Order
                                                                        </button>
                                                                        {isSuperAdmin && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setSettlingInvestment(inv); }}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95"
                                                                                title="Settle Growth Plan (Wallet or Offline Cash)"
                                                                            >
                                                                                <Banknote size={13} /> Settle
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); router.push(`/admin/portfolio/${inv.merchant_id}`); }}
                                                                    title="View Full Portfolio"
                                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-xs"
                                                                >
                                                                    <Eye size={13} /> View
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            /* Grouped View */
                            <>
                                {/* Mobile Grouped Card Layout (< md) */}
                                <div className="block md:hidden divide-y divide-slate-100">
                                    {filtered.map(group => (
                                        <div key={group.merchant.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-sm shrink-0">
                                                        {group.merchant?.business_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{group.merchant?.business_name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{group.merchant?.user_profiles?.full_name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {group.activeCount > 0 && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">{group.activeCount} Active</span>}
                                                    {group.pendingCount > 0 && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">{group.pendingCount} Pending</span>}
                                                    {group.completedCount > 0 && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">{group.completedCount} Completed</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total AUM</p>
                                                    <p className="text-base font-black text-slate-900">₹{(group.totalAUM / 100).toLocaleString('en-IN')}</p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => router.push(`/admin/portfolio/${group.merchant.id}`)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-xs"
                                                >
                                                    <Eye size={13} /> Open Portfolio
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Grouped Table Layout (>= md) */}
                                <div className="hidden md:block overflow-x-auto">
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
                                                                {group.completedCount > 0 && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">Completed</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 md:px-8 py-5 text-right">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); router.push(`/admin/portfolio/${group.merchant.id}`); }}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-xs"
                                                            >
                                                                <Eye size={14} /> Open Portfolio
                                                            </button>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </tbody>
                                    </table>
                                </div>
                            </>
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
                        order={selectedOrder}
                        mode={feedModalMode}
                        onClose={(refresh) => { 
                            setShowFeedModal(false); 
                            setSelectedInvestment(null); 
                            setSelectedOrder(null);
                            if (refresh) fetchInvestments(); 
                        }} 
                    />
                )}
                {settlingInvestment && (
                    <InvestmentSettlementFlow
                        investment={settlingInvestment}
                        merchant={settlingInvestment.merchant}
                        onClose={() => setSettlingInvestment(null)}
                        onSuccess={() => {
                            setSettlingInvestment(null);
                            fetchInvestments();
                        }}
                    />
                )}
                {confirmModalData && (
                    <SettleConfirmModal
                        item={confirmModalData.item}
                        type={confirmModalData.type}
                        merchant={confirmModalData.merchant}
                        onClose={() => setConfirmModalData(null)}
                        onConfirm={() => {
                            if (confirmModalData.actionType === 'release') handleReleaseInvestment(confirmModalData.item.id);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
