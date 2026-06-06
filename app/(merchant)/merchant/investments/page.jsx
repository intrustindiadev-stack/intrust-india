'use client';

import { useState, useEffect, useMemo } from 'react';
import { animate, motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import {
    Plus, AlertTriangle, CheckCircle2, Eye, EyeOff,
    RefreshCw, ShieldCheck, Sparkles, BarChart2, BookOpen, Layers
} from 'lucide-react';
import InvestmentAnalytics from '@/components/merchant/investment/InvestmentAnalytics';
import AIGrowHowItWorks from '@/components/merchant/investment/AIGrowHowItWorks';
import FundROICard from '@/components/merchant/investment/FundROICard';

function AnimatedNumber({ value, decimals = 0, prefix = '₹' }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const ctrl = animate(0, value, { duration: 1.4, ease: 'easeOut', onUpdate: v => setDisplay(v) });
        return () => ctrl.stop();
    }, [value]);
    return (
        <span>
            {prefix}{display.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
        </span>
    );
}

const MOBILE_TABS = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'how', label: 'How It Works', icon: BookOpen },
    { id: 'charts', label: 'Charts', icon: BarChart2 },
    { id: 'funds', label: 'My Funds', icon: Layers },
];

export default function AIGrowPage() {
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
    const [mobileTab, setMobileTab] = useState('overview');

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

    const stats = useMemo(() => {
        const active = investments.filter(i => i.status === 'active');
        const totalDeployed = active.reduce((s, i) => s + i.amount_paise / 100, 0);
        const totalProfit = allOrders.reduce((s, o) => s + (o.profit_paise || 0), 0) / 100;
        return { totalDeployed, totalProfit, activeCount: active.length, totalFunds: investments.length };
    }, [investments, allOrders]);

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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center animate-pulse">
                <Sparkles className="text-white" size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading AI Grow...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-[#FAFBFC] max-w-7xl mx-auto space-y-6">

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

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-emerald-50 to-indigo-50 text-indigo-600 border border-indigo-100">
                        <Sparkles size={11} /> AI-Powered Growth
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">AI Grow</h1>
                    <p className="text-sm font-medium text-slate-500 max-w-md">Your capital deployed into verified trade orders — earning profit while you focus on business.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-indigo-700 hover:from-indigo-700 hover:to-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-900/20 active:scale-95">
                        <Plus size={16} /> New Request
                    </button>
                </div>
            </div>

            {/* ── Mobile Tab Bar ── */}
            <div className="md:hidden flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-sm gap-0.5 overflow-x-auto no-scrollbar">
                {MOBILE_TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => setMobileTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-1 justify-center ${mobileTab === tab.id ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                            <Icon size={12} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Hero + Stats (Overview) ── */}
            <div className={`${mobileTab !== 'overview' ? 'hidden md:grid' : 'grid'} grid-cols-1 lg:grid-cols-12 gap-5`}>
                {/* Hero balance card */}
                <div className="lg:col-span-7 bg-slate-950 rounded-[2.5rem] p-7 md:p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full -mr-40 -mt-40 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -ml-32 -mb-32 pointer-events-none" />
                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em]">AI Grow Vault</p>
                            </div>
                            <button onClick={() => setIsRevealed(!isRevealed)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-slate-400 hover:text-white">
                                {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <div className="h-16 flex items-center">
                            <AnimatePresence mode="wait">
                                {!isRevealed ? (
                                    <motion.button key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        onClick={() => setIsRevealed(true)}
                                        className="flex items-center gap-3 px-5 py-3.5 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-white/10 transition-all">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                            <Eye size={15} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Confidential</p>
                                            <p className="text-sm font-extrabold">Tap to View Balance</p>
                                        </div>
                                    </motion.button>
                                ) : (
                                    <motion.div key="revealed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-baseline gap-2">
                                        <span className="text-xl font-bold text-slate-400 align-top mt-1">₹</span>
                                        <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter">
                                            <AnimatedNumber value={stats.totalDeployed + stats.totalProfit} prefix="" />
                                        </h2>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex flex-wrap gap-8 pt-6 border-t border-white/5">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Deployed Capital</p>
                                <p className="text-xl font-extrabold">{isRevealed ? `₹${stats.totalDeployed.toLocaleString('en-IN')}` : '• • • •'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest mb-1">Total Profit</p>
                                <p className="text-xl font-extrabold text-emerald-400">{isRevealed ? `₹${stats.totalProfit.toLocaleString('en-IN')}` : '• • • •'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mb-1">Active Funds</p>
                                <p className="text-xl font-extrabold text-indigo-300">{stats.activeCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right info cards */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    {/* Profit sharing model */}
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 flex flex-col justify-between group hover:border-indigo-300 transition-all shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <BarChart2 size={22} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dynamic Model</span>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-900 tracking-tighter uppercase">Profit Sharing</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-tight">Trade Performance Returns</p>
                            </div>
                        </div>
                    </div>

                    {/* Secure fund */}
                    <div className="bg-slate-950 border border-white/5 rounded-[2.5rem] p-6 text-white flex items-start gap-4 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-600/15 blur-xl rounded-full -mr-8 -mt-8" />
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0 relative z-10">
                            <ShieldCheck size={22} />
                        </div>
                        <div className="relative z-10">
                            <p className="font-extrabold text-sm tracking-tight uppercase">Secure Fund</p>
                            <div className="flex items-center gap-1.5 mt-0.5 mb-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">InTrust Protected</p>
                            </div>
                            <p className="text-slate-400 text-[11px] font-medium leading-relaxed opacity-80">
                                Capital deployed into verified supply chain orders.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── How It Works ── */}
            <div className={mobileTab !== 'how' ? 'hidden md:block' : 'block'}>
                <AIGrowHowItWorks />
            </div>

            {/* ── Charts Section ── */}
            <div className={mobileTab !== 'charts' ? 'hidden md:block' : 'block'}>
                {(allOrders.length > 0 || investments.length > 0) ? (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-2">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <BarChart2 size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Growth Analytics</h3>
                                <p className="text-slate-400 text-xs font-medium">Visualize your fund performance</p>
                            </div>
                        </div>
                        <InvestmentAnalytics orders={allOrders} investments={investments} />
                    </div>
                ) : (
                    <div className="bg-white border border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
                        <BarChart2 size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold text-sm">Charts will appear after your first fund is activated</p>
                    </div>
                )}
            </div>

            {/* ── Funds + Activity Feed (Desktop: 2-col, Mobile: tabbed) ── */}
            <div className={`${mobileTab !== 'funds' ? 'hidden md:grid' : 'grid'} grid-cols-1 lg:grid-cols-12 gap-5`}>
                {/* Fund Cards */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900">
                            My Funds
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-2">{investments.length}</span>
                        </h3>
                    </div>

                    {investments.length === 0 ? (
                        <div className="bg-white border border-dashed border-slate-200 rounded-[2rem] p-10 text-center flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-emerald-50 rounded-2xl flex items-center justify-center">
                                <Sparkles size={28} className="text-indigo-400" />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800">No funds yet</h4>
                                <p className="text-slate-400 text-xs mt-1 font-medium">Submit a request to start earning</p>
                            </div>
                            <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg">
                                Start Earning
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {investments.map(inv => (
                                <FundROICard
                                    key={inv.id}
                                    inv={inv}
                                    orders={allOrders.filter(o => o.investment_id === inv.id)}
                                    isSelected={selectedInv === inv.id}
                                    onClick={() => setSelectedInv(inv.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Activity Feed */}
                <div className="lg:col-span-7">
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-extrabold text-slate-900">Capital Activity Feed</h3>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    {selectedInv ? 'Showing selected fund orders' : 'All fund orders'}
                                </p>
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{currentOrders.length} Orders</span>
                        </div>

                        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
                            {currentOrders.length === 0 ? (
                                <div className="p-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                                        <Sparkles size={28} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800">
                                            {investments.length === 0 ? 'Start Your AI Grow Journey' : 'Select a Fund to View Orders'}
                                        </h4>
                                        <p className="text-slate-400 text-sm font-medium mt-1 max-w-[240px] mx-auto leading-relaxed">
                                            {investments.length === 0
                                                ? 'Create your first fund request to start earning.'
                                                : 'Tap on a fund card to see its trade orders.'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                currentOrders.map(order => (
                                    <div key={order.id} className="p-5 hover:bg-slate-50/60 transition-colors flex items-center gap-4">
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <p className="text-sm font-bold text-slate-800 truncate">{order.order_details}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {order.category && (
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500">{order.category}</span>
                                                )}
                                                {order.location && (
                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                        {order.location}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 space-y-0.5">
                                            <p className="text-sm font-black text-emerald-600">+₹{(order.profit_paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">profit</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── New Fund Request Modal ── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <div className="absolute inset-0" onClick={() => !processing && setShowModal(false)} />
                        <motion.div initial={{ scale: 0.96, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 16 }}
                            className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-10 border border-slate-100">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center">
                                            <Sparkles size={15} className="text-white" />
                                        </div>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">AI Grow</p>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800">New Fund Request</h3>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-9 h-9 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all text-sm font-bold">✕</button>
                            </div>

                            <form onSubmit={handleRequest} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</span>
                                        <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="Min ₹10,000"
                                            className="w-full pl-10 pr-5 bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 text-xl font-black focus:border-indigo-500 focus:bg-white outline-none transition-all [appearance:textfield]" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold">Dynamic profit-sharing model — no fixed interest.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes (Optional)</label>
                                    <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Any context for this request..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[90px] resize-none" />
                                </div>
                                <button type="submit" disabled={processing}
                                    className="w-full bg-gradient-to-r from-[#1e3a5f] to-indigo-700 hover:opacity-90 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                                    {processing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                                    {processing ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
