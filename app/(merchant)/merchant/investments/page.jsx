'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IndianRupee, TrendingUp, ShieldCheck, Clock, Plus,
    ArrowLeft, AlertTriangle, CheckCircle2, ChevronRight,
    Info, Wallet, LayoutGrid, Activity, History
} from 'lucide-react';
import Link from 'next/link';
import InvestmentAnalytics from '@/components/merchant/investment/InvestmentAnalytics';

export default function MerchantInvestmentsPage() {
    const [loading, setLoading] = useState(true);
    const [investments, setInvestments] = useState([]);
    const [orders, setOrders] = useState([]);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestAmount, setRequestAmount] = useState('');
    const [requestDesc, setRequestDesc] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetch Investments
            const invRes = await fetch('/api/merchant/investments', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const invData = await invRes.json();
            setInvestments(invData.data || []);

            // Fetch Orders for active investments
            const activeInv = invData.data?.find(inv => inv.status === 'active');
            if (activeInv) {
                const ordRes = await fetch(`/api/admin/investment-orders?investmentId=${activeInv.id}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                const ordData = await ordRes.json();
                setOrders(ordData.data || []);
            }

            // Fetch Wallet
            const walletRes = await fetch('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (walletRes.ok) {
                const w = await walletRes.json();
                setWalletBalance(parseFloat(w.wallet?.balance || 0));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRequest = async (e) => {
        e.preventDefault();
        if (!requestAmount || Number(requestAmount) <= 0) return;

        setProcessing(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/investments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    amountRupees: requestAmount,
                    description: requestDesc
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess('Investment request submitted successfully!');
            setShowRequestModal(false);
            setRequestAmount('');
            setRequestDesc('');
            fetchData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const stats = useMemo(() => {
        const active = investments.filter(i => i.status === 'active');
        const totalDeployed = active.reduce((sum, i) => sum + (i.amount_paise / 100), 0);
        const totalProfit = orders.reduce((sum, o) => sum + (o.profit_paise / 100), 0);
        return { totalDeployed, totalProfit, activeCount: active.length };
    }, [investments, orders]);

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-24">
            {/* Notifications */}
            <AnimatePresence>
                {(error || success) && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${error ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                        {error || success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Section */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />

                <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                <ShieldCheck size={14} />
                                Enterprise Investment Portal
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Investment Hub</h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Wallet</p>
                                <p className="text-xl font-black text-[#D4AF37]">₹{walletBalance.toLocaleString('en-IN')}</p>
                            </div>
                            <button
                                onClick={() => setShowRequestModal(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={18} strokeWidth={3} />
                                Request New
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Active Deployment</p>
                            <p className="text-3xl font-black text-white mb-2">₹{stats.totalDeployed.toLocaleString('en-IN')}</p>
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px]">
                                <Activity size={12} /> {stats.activeCount} Active Request(s)
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Returns</p>
                            <p className="text-3xl font-black text-emerald-400 mb-2">₹{stats.totalProfit.toLocaleString('en-IN')}</p>
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                                <TrendingUp size={12} /> Live Performance
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Portfolio Yield</p>
                            <p className="text-3xl font-black text-indigo-400 mb-2">
                                {stats.totalDeployed > 0 ? ((stats.totalProfit / stats.totalDeployed) * 100).toFixed(1) : '0'}%
                            </p>
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px]">
                                <LayoutGrid size={12} /> Compound Growth
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics & Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Chart */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">Performance Analytics</h3>
                                <p className="text-[11px] text-slate-400 font-medium italic">Profit generated from operational orders</p>
                            </div>
                            <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                Live Feed
                            </div>
                        </div>
                        <InvestmentAnalytics orders={orders} />
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                    <History size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg">Order Feed</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Real-time capital utilization data</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{orders.length} Records</span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto">
                            {orders.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {orders.map(order => (
                                        <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-slate-800">{order.order_details}</p>
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                    <span>Volume: ₹{(order.amount_paise / 100).toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-emerald-600">+₹{(order.profit_paise / 100).toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Profit</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-20 text-center space-y-4">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                        <History size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Waiting for order feed...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Investment Status */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <h3 className="font-black text-slate-800 text-lg">My Requests</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {investments.length > 0 ? (
                                investments.map(inv => (
                                    <div key={inv.id} className="p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-lg font-black text-slate-800">₹{(inv.amount_paise / 100).toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${inv.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                inv.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                {inv.status}
                                            </div>
                                        </div>
                                        {inv.description && <p className="text-[11px] text-slate-500 line-clamp-2 italic">"{inv.description}"</p>}
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center text-slate-400 text-xs font-bold">No investments found</div>
                            )}
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                        <h4 className="font-black text-lg mb-4 flex items-center gap-2">
                            <Info size={20} /> How it works?
                        </h4>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                                <p className="text-[11px] font-medium leading-relaxed opacity-80">Request an investment amount from your available portal balance or custom request.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                                <p className="text-[11px] font-medium leading-relaxed opacity-80">Once approved, your capital is deployed into high-velocity inventory movements.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                                <p className="text-[11px] font-medium leading-relaxed opacity-80">Admin feeds real order data representing your capital's performance and daily profit share.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Modal */}
            <AnimatePresence>
                {showRequestModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
                        <div className="absolute inset-0" onClick={() => !processing && setShowRequestModal(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-xl shadow-2xl relative z-10 border border-slate-100">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">New Investment</h3>
                                    <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Secure Capital Deployment</p>
                                </div>
                                <button onClick={() => setShowRequestModal(false)} className="w-10 h-10 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 flex items-center justify-center transition-colors">✕</button>
                            </div>

                            <form onSubmit={handleRequest} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Request Amount (₹)</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                            <IndianRupee size={20} className="text-indigo-600" />
                                        </div>
                                        <input
                                            type="number"
                                            required
                                            value={requestAmount}
                                            onChange={(e) => setRequestAmount(e.target.value)}
                                            placeholder="50,000"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-16 pr-8 py-5 text-xl font-black focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold ml-2 italic">Min deployment: ₹10,000</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Notes / Context (Optional)</label>
                                    <textarea
                                        value={requestDesc}
                                        onChange={(e) => setRequestDesc(e.target.value)}
                                        placeholder="Briefly explain the purpose of this deployment..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none min-h-[120px] resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                                >
                                    {processing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirm Deployment Request'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
