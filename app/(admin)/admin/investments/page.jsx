'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Search, RefreshCw, Plus, CheckCircle, XCircle,
    TrendingUp, Briefcase, Activity, Percent
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import FeedOrderModal from '@/components/admin/investment/FeedOrderModal';
import AddInvestmentModal from '@/components/admin/investment/AddInvestmentModal';

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
        setProcessingId(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/investments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ id, status }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            toast.success(`Investment ${status}`);
            fetchInvestments();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const filtered = investments.filter(inv =>
        inv.merchant?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.merchant?.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        totalAUM: investments.filter(i => i.status === 'active').reduce((s, i) => s + i.amount_paise, 0) / 100,
        totalActive: investments.filter(i => i.status === 'active').length,
        totalPending: investments.filter(i => i.status === 'pending').length,
        totalPaid: investments.reduce((s, i) => s + (i.total_profit_paid_paise || 0), 0) / 100,
    };

    return (
        <div className="p-6 bg-slate-50/50 min-h-screen">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mera Paisa Management</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">Manage capital deployments and performance feeds</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search merchants..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none w-full md:w-72 transition-all shadow-sm" />
                        </div>
                        <button onClick={fetchInvestments} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
                            <Plus size={16} /> Deploy Fund
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group">
                        <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity"><Briefcase size={64} /></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total AUM</p>
                        <p className="text-2xl font-black">₹{stats.totalAUM.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Funds</p>
                        <p className="text-2xl font-black text-slate-900">{stats.totalActive}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pending Review</p>
                        <p className="text-2xl font-black text-amber-500">{stats.totalPending}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Paid Out</p>
                        <p className="text-2xl font-black text-emerald-600">₹{stats.totalPaid.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity size={18} className="text-indigo-600" />
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Fund Ledger</h3>
                        </div>
                        <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                            {filtered.length} Records
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Profit Shared</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Paid Out</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="7" className="px-8 py-20 text-center">
                                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
                                    </td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="7" className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No records found</td></tr>
                                ) : filtered.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
                                                    {inv.merchant?.business_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm">{inv.merchant?.business_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{inv.merchant?.user_profiles?.full_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">₹{(inv.amount_paise / 100).toLocaleString('en-IN')}</td>
                                        <td className="px-8 py-5 text-right font-black text-indigo-600 text-sm">
                                            ₹{((inv.total_profit_paid_paise || 0) / 100).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-emerald-600 text-sm">
                                            ₹{((inv.total_profit_paid_paise || 0) / 100).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-8 py-5 text-xs font-bold text-slate-500">
                                            {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_CHIP[inv.status] || STATUS_CHIP.pending}`}>
                                                <div className={`w-1 h-1 rounded-full ${inv.status === 'active' ? 'bg-emerald-500' : inv.status === 'pending' ? 'bg-amber-500' : inv.status === 'rejected' ? 'bg-red-500' : 'bg-slate-300'}`} />
                                                {inv.status}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-center gap-2">
                                                {inv.status === 'pending' ? (
                                                    <>
                                                        <button onClick={() => handleUpdateStatus(inv.id, 'active')} disabled={processingId === inv.id}
                                                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-100" title="Approve">
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button onClick={() => handleUpdateStatus(inv.id, 'rejected')} disabled={processingId === inv.id}
                                                            className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-100" title="Reject">
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                ) : inv.status === 'active' ? (
                                                    <button onClick={() => { setSelectedInvestment(inv); setShowFeedModal(true); }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 text-[10px] font-black uppercase tracking-widest">
                                                        <TrendingUp size={14} /> Feed Order
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase italic">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showFeedModal && (
                <FeedOrderModal investment={selectedInvestment} onClose={(refresh) => { setShowFeedModal(false); setSelectedInvestment(null); if (refresh) fetchInvestments(); }} />
            )}
            {showAddModal && (
                <AddInvestmentModal onClose={(refresh) => { setShowAddModal(false); if (refresh) fetchInvestments(); }} />
            )}
        </div>
    );
}
