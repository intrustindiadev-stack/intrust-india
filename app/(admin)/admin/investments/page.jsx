'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Search, RefreshCw, Plus, CheckCircle, XCircle,
    TrendingUp, Briefcase, Activity, Percent, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import FeedOrderModal from '@/components/admin/investment/FeedOrderModal';
import AddInvestmentModal from '@/components/admin/investment/AddInvestmentModal';
import GrowthAnalytics from '@/components/admin/investment/GrowthAnalytics';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CHIP = {
    active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    rejected: 'bg-red-50 text-red-600 border-red-100',
    completed: 'bg-blue-50 text-blue-600 border-blue-100',
};

export default function AdminInvestmentsPage() {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFeedModal, setShowFeedModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    const fetchInvestments = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/admin/investments', { headers: { Authorization: `Bearer ${session.access_token}` } });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to load');
            setInvestments(result.data || []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvestments(); }, []);

    const handleUpdateStatus = async (id, status) => {
        // Optimistic UI update
        const previousInvestments = [...investments];
        setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
        setProcessingId(id);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/investments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ id, status }),
            });
            if (!res.ok) { 
                const d = await res.json(); 
                throw new Error(d.error); 
            }
            toast.success(`Investment ${status}`);
        } catch (err) {
            // Revert optimistic update
            setInvestments(previousInvestments);
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const filtered = investments.filter(inv => {
        const matchesSearch = inv.merchant?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              inv.merchant?.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'all' || inv.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const stats = {
        totalAUM: investments.filter(i => i.status === 'active').reduce((s, i) => s + i.amount_paise, 0) / 100,
        totalActive: investments.filter(i => i.status === 'active').length,
        totalPending: investments.filter(i => i.status === 'pending').length,
        totalPaid: investments.reduce((s, i) => s + (i.total_profit_paid_paise || 0), 0) / 100,
    };

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
                        <button onClick={fetchInvestments} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Funds</p>
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
                    <div className="p-4 md:p-6 lg:px-8 lg:py-6 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
                        
                        {/* Tabs */}
                        <div className="flex p-1 bg-slate-100/80 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                            {['all', 'active', 'pending', 'rejected'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative w-full md:w-72">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search merchant..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none w-full transition-all shadow-sm" />
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant</th>
                                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Profit Shared</th>
                                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Paid Out</th>
                                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading && investments.length === 0 ? (
                                    <tr><td colSpan="7" className="px-8 py-32 text-center">
                                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Funds...</p>
                                    </td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="7" className="px-8 py-32 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Briefcase className="text-slate-300" size={32} />
                                        </div>
                                        <p className="text-sm font-black text-slate-600 mb-1">No records found</p>
                                        <p className="text-xs font-medium text-slate-400">Try adjusting your filters or search query.</p>
                                    </td></tr>
                                ) : (
                                    <AnimatePresence>
                                        {filtered.map(inv => (
                                            <motion.tr 
                                                key={inv.id} 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="hover:bg-slate-50/50 transition-colors group cursor-default"
                                            >
                                                <td className="px-6 md:px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-sm shrink-0">
                                                            {inv.merchant?.business_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-sm">{inv.merchant?.business_name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{inv.merchant?.user_profiles?.full_name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 md:px-8 py-5 text-right font-black text-slate-900 text-[15px]">
                                                    ₹{(inv.amount_paise / 100).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 md:px-8 py-5 text-right font-black text-indigo-600 text-sm bg-indigo-50/10">
                                                    ₹{((inv.total_profit_paid_paise || 0) / 100).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 md:px-8 py-5 text-right font-black text-emerald-600 text-sm">
                                                    ₹{((inv.total_profit_paid_paise || 0) / 100).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 md:px-8 py-5 text-xs font-bold text-slate-500">
                                                    {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 md:px-8 py-5">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_CHIP[inv.status] || STATUS_CHIP.pending}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${inv.status === 'active' ? 'bg-emerald-500' : inv.status === 'pending' ? 'bg-amber-500' : inv.status === 'rejected' ? 'bg-red-500' : 'bg-slate-400'}`} />
                                                        {inv.status}
                                                    </div>
                                                </td>
                                                <td className="px-6 md:px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {inv.status === 'pending' ? (
                                                            <>
                                                                <button onClick={() => handleUpdateStatus(inv.id, 'active')} disabled={processingId === inv.id}
                                                                    className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-100" title="Approve">
                                                                    <CheckCircle size={16} strokeWidth={2.5} />
                                                                </button>
                                                                <button onClick={() => handleUpdateStatus(inv.id, 'rejected')} disabled={processingId === inv.id}
                                                                    className="p-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100" title="Reject">
                                                                    <XCircle size={16} strokeWidth={2.5} />
                                                                </button>
                                                            </>
                                                        ) : inv.status === 'active' ? (
                                                            <button onClick={() => { setSelectedInvestment(inv); setShowFeedModal(true); }}
                                                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                                <Eye size={14} /> View Feed
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pr-4">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals are deferred to slide out / pop up properly */}
            <AnimatePresence>
                {showFeedModal && (
                    <FeedOrderModal investment={selectedInvestment} onClose={(refresh) => { setShowFeedModal(false); setSelectedInvestment(null); if (refresh) fetchInvestments(); }} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showAddModal && (
                    <AddInvestmentModal onClose={(refresh) => { setShowAddModal(false); if (refresh) fetchInvestments(); }} />
                )}
            </AnimatePresence>
        </div>
    );
}
