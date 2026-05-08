'use client';

import { useState, useEffect, useMemo } from 'react';
import { animate, motionValue, motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import {
    TrendingUp, ShieldCheck, Plus, AlertTriangle, CheckCircle2,
    Eye, EyeOff, RefreshCw, MapPin, Tag, Clock, Info, Percent
} from 'lucide-react';

const STATUS_LABELS = { pending: 'Review Mein', active: 'Active', completed: 'Completed', rejected: 'Rejected' };
const STATUS_COLORS = {
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    completed: 'bg-blue-50 text-blue-600 border-blue-100',
    rejected: 'bg-red-50 text-red-600 border-red-100',
};
const CATEGORY_COLORS = {
    FMCG: 'bg-orange-100 text-orange-700',
    Electronics: 'bg-blue-100 text-blue-700',
    Pharma: 'bg-teal-100 text-teal-700',
    Agriculture: 'bg-green-100 text-green-700',
    Logistics: 'bg-purple-100 text-purple-700',
    Textile: 'bg-pink-100 text-pink-700',
    Retail: 'bg-indigo-100 text-indigo-700',
    General: 'bg-slate-100 text-slate-600',
};

function AnimatedNumber({ value, decimals = 0 }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        animate(0, value, { duration: 1.2, ease: 'easeOut', onUpdate: v => setDisplay(v) });
    }, [value]);
    return <span>{display.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}</span>;
}

export default function MerchantInvestmentsPage() {
    const [investments, setInvestments] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRevealed, setIsRevealed] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState(null);
    const [selectedInv, setSelectedInv] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/merchant/investments', { headers: { Authorization: `Bearer ${session.access_token}` } });
            const json = await res.json();
            const invs = json.data || [];
            setInvestments(invs);
            setAllOrders(json.allOrders || []);
            if (!selectedInv && invs.length > 0) setSelectedInv(invs[0].id);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // Calculate interest-based returns (not from order profit sums)
    const calcInterest = (inv) => {
        if (inv.status !== 'active' || !inv.approved_at) return 0;
        const principal = inv.amount_paise / 100;
        const rate = (inv.interest_rate_percent || 12) / 100;
        const daysElapsed = Math.max(0, (Date.now() - new Date(inv.approved_at)) / (1000 * 60 * 60 * 24));
        return principal * (rate / 365) * daysElapsed;
    };

    const stats = useMemo(() => {
        const active = investments.filter(i => i.status === 'active');
        const totalDeployed = active.reduce((s, i) => s + i.amount_paise / 100, 0);
        const totalInterestEarned = active.reduce((s, i) => s + calcInterest(i), 0);
        const avgRate = active.length ? active.reduce((s, i) => s + (i.interest_rate_percent || 12), 0) / active.length : 12;
        return { totalDeployed, totalProfit: totalInterestEarned, activeCount: active.length, avgRate };
    }, [investments]);

    const currentOrders = useMemo(() => {
        if (!selectedInv) return allOrders;
        return allOrders.filter(o => o.investment_id === selectedInv);
    }, [allOrders, selectedInv]);

    const handleRequest = async (e) => {
        e.preventDefault();
        if (Number(amount) < 10000) return showToast('Minimum ₹10,000 required', 'error');
        setProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/investments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ amountRupees: amount, description: desc }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            showToast('Request submitted! Admin will review soon.');
            setShowModal(false); setAmount(''); setDesc('');
            fetchData();
        } catch (err) { showToast(err.message, 'error'); } finally { setProcessing(false); }
    };

    if (loading) return (
        <div className="flex h-[70vh] items-center justify-center flex-col gap-4">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Your Fund...</p>
        </div>
    );

    const activeInvs = investments.filter(i => i.status === 'active');

    return (
        <div className="p-4 md:p-6 bg-[#FAFBFC] min-h-screen">
            <div className="max-w-6xl mx-auto space-y-10">

                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${toast.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Growth Fund</h1>
                        <p className="text-sm font-semibold text-slate-500 opacity-70">Your capital at work — earning returns through InTrust's trade network.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95">
                            <Plus size={16} /> New Request
                        </button>
                    </div>
                </div>

                {/* Hero Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 bg-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden group border border-white/5">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -mr-48 -mt-48" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -ml-32 -mb-32" />

                        <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em]">Capital Vault</p>
                                    </div>
                                    <button onClick={() => setIsRevealed(!isRevealed)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-slate-400 hover:text-white">
                                        {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div className="h-20 flex items-center">
                                    <AnimatePresence mode="wait">
                                        {!isRevealed ? (
                                            <motion.button key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                onClick={() => setIsRevealed(true)}
                                                className="flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 hover:scale-105 active:scale-95 transition-all">
                                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                                    <Eye size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Confidential</p>
                                                    <p className="text-sm font-extrabold text-white">Tap to View Balance</p>
                                                </div>
                                            </motion.button>
                                        ) : (
                                            <motion.div key="revealed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline gap-2">
                                                <span className="text-2xl font-bold text-slate-400 align-top mt-2">₹</span>
                                                <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white">
                                                    <AnimatedNumber value={stats.totalDeployed + stats.totalProfit} />
                                                </h2>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-10 pt-8 border-t border-white/5">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deployed Capital</p>
                                    <p className="text-2xl font-extrabold text-white">₹{isRevealed ? stats.totalDeployed.toLocaleString('en-IN') : '• • • •'}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Interest Accrued</p>
                                    <p className="text-2xl font-extrabold text-emerald-400">₹{isRevealed ? stats.totalProfit.toFixed(2) : '• • • •'}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest">Interest Rate</p>
                                    <p className="text-2xl font-extrabold text-indigo-300">{stats.avgRate.toFixed(1)}% p.a.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between group hover:border-indigo-400 transition-all flex-1">
                            <div className="flex items-center justify-between">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Percent size={24} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Rate</span>
                            </div>
                            <div className="mt-6">
                                <p className="text-5xl font-extrabold text-slate-900 tracking-tighter">{stats.avgRate.toFixed(1)}%<span className="text-[11px] text-indigo-500 font-bold ml-2 tracking-widest uppercase">p.a.</span></p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-tight">Guaranteed Returns</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 border border-white/5 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col justify-between group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/15 blur-2xl rounded-full -mr-12 -mt-12" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <p className="text-white font-extrabold text-sm tracking-tight uppercase">Secure Fund</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">InTrust Protected</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-400 text-[11px] font-medium leading-relaxed relative z-10 mt-6 pt-6 border-t border-white/5 opacity-80">
                                Your capital is deployed into verified supply chain orders, generating fixed returns.
                            </p>
                        </div>
                    </div>
                </div>

                {/* My Funds + Order Feed */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Fund Cards */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-bold text-slate-900">My Funds <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-2">{investments.length}</span></h3>
                        </div>

                        {investments.length === 0 ? (
                            <div className="bg-white border border-dashed border-slate-200 rounded-[2rem] p-12 text-center flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                                    <Info size={28} className="text-slate-300" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">No funds yet</h4>
                                    <p className="text-slate-400 text-xs mt-1">Submit a request to start earning</p>
                                </div>
                                <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all">
                                    Start Earning
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {investments.map(inv => {
                                    const principal = inv.amount_paise / 100;
                                    const isSelected = selectedInv === inv.id;

                                    return (
                                        <button key={inv.id} onClick={() => setSelectedInv(inv.id)} className={`w-full text-left bg-white border rounded-[2rem] p-6 transition-all group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 ${isSelected ? 'border-indigo-300 shadow-md shadow-indigo-100/50' : 'border-slate-200'}`}>
                                            <div className="flex items-start justify-between mb-4">
                                                <p className="text-2xl font-extrabold text-slate-900 tracking-tight">₹{principal.toLocaleString('en-IN')}</p>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[inv.status] || STATUS_COLORS.pending}`}>
                                                    {STATUS_LABELS[inv.status] || inv.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-[11px] font-bold">
                                                <span className="text-indigo-600">{inv.interest_rate_percent || 12}% p.a.</span>
                                                <span className="text-slate-300">|</span>
                                                <span className="text-emerald-600">+₹{calcInterest(inv).toFixed(2)} accrued</span>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                {inv.status === 'active' && inv.approved_at && (
                                                    <span className="text-[10px] font-black text-slate-500">{Math.floor((Date.now() - new Date(inv.approved_at)) / (1000 * 60 * 60 * 24))} days active</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Order Feed */}
                    <div className="lg:col-span-8">
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                <div>
                                    <h3 className="font-extrabold text-slate-900 text-lg">Capital Activity Feed</h3>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Showing where your capital is being deployed</p>
                                </div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{currentOrders.length} Orders</span>
                            </div>

                            <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-50">
                                {currentOrders.length === 0 ? (
                                    <div className="p-20 text-center flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                                            <TrendingUp size={28} className="text-slate-200" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Waiting for order feed...</p>
                                        <p className="text-xs text-slate-300 font-medium max-w-xs">Orders will appear here once admin allocates your capital to supply chain movements</p>
                                    </div>
                                ) : (
                                    currentOrders.map(order => (
                                        <div key={order.id} className="p-6 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                                            <div className="space-y-2 flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 line-clamp-1">{order.order_details}</p>
                                                <div className="flex items-center flex-wrap gap-2">
                                                    {order.location && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                                            <MapPin size={10} className="text-rose-400" />{order.location}
                                                        </span>
                                                    )}
                                                    {order.category && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${CATEGORY_COLORS[order.category] || CATEGORY_COLORS.General}`}>
                                                            {order.category}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                        <Clock size={9} />{new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-black text-slate-700">₹{(order.amount_paise / 100).toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Order Volume</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <div className="absolute inset-0" onClick={() => !processing && setShowModal(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-10 border border-slate-100">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">New Fund Request</h3>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Earn with InTrust</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all">✕</button>
                            </div>

                            <form onSubmit={handleRequest} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                                    <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="Min ₹10,000"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xl font-black focus:border-indigo-500 focus:bg-white outline-none transition-all" />
                                    <p className="text-[10px] text-slate-400 font-bold ml-1">Expected rate: ~12% p.a. (admin may adjust)</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes (Optional)</label>
                                    <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Any context for this request..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[100px] resize-none" />
                                </div>
                                <button type="submit" disabled={processing}
                                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                                    {processing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Submit Request'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
