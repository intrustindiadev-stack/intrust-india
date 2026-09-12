'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ShieldCheck, ShieldAlert, Wallet, TrendingDown,
    TrendingUp, ArrowRight, AlertTriangle, CheckCircle2, Lock,
    RefreshCw, Sparkles, HelpCircle, FileText, Banknote, Building2,
    Check
} from 'lucide-react';
import Link from 'next/link';

export default function SettleVaultPage({ params }) {
    const { merchantId } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(null);
    const [merchant, setMerchant] = useState(null);

    // Form State
    const [vaultBalance, setVaultBalance] = useState(0);
    const [walletBalancePaise, setWalletBalancePaise] = useState(0);
    const [settleAmount, setSettleAmount] = useState('');
    const [settlementType, setSettlementType] = useState('Full Principal Liquidation');
    const [reason, setReason] = useState('Scheduled liquidation of AI Grow Vault capital into active merchant wallet');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const settlementTypes = [
        {
            id: 'Full Principal Liquidation',
            label: 'Full Principal Liquidation',
            desc: 'Settle all or major principal capital back into merchant active wallet.',
            icon: Banknote,
        },
        {
            id: 'Partial Vault Transfer',
            label: 'Partial Vault Transfer',
            desc: 'Liquidate a specific capital chunk while keeping remaining active.',
            icon: TrendingDown,
        },
        {
            id: 'Profit Yield Settlement',
            label: 'Profit Yield Settlement',
            desc: 'Distribute trading gains and accumulated yields to merchant wallet.',
            icon: TrendingUp,
        },
        {
            id: 'Administrative Balance Realignment',
            label: 'Admin Realignment',
            desc: 'Account reconciliation or manual capital repositioning.',
            icon: ShieldCheck,
        },
    ];

    // Fetch data and verify super_admin role
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Session expired. Please log in.');
                router.push('/admin/login');
                return;
            }

            // Check super_admin status
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            const superAdmin = profile?.role === 'super_admin';
            setIsSuperAdmin(superAdmin);

            if (!superAdmin) {
                setLoading(false);
                return;
            }

            // Fetch merchant portfolio data
            const res = await fetch(`/api/admin/portfolio/${merchantId}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to fetch merchant details');

            const m = json.data.merchant;
            setMerchant(m);

            const vBalance = Number(m.ai_grow_vault_balance_rupees || (m.total_ai_grow_paise ? m.total_ai_grow_paise / 100 : 0));
            setVaultBalance(vBalance);
            setWalletBalancePaise(Number(m.wallet_balance_paise || 0));

            // Default amount: entire vault balance if > 0
            if (vBalance > 0) {
                setSettleAmount(vBalance.toString());
            }

        } catch (err) {
            console.error('Error fetching settle data:', err);
            toast.error(err.message || 'Failed to load merchant data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [merchantId]);

    const parsedAmount = parseFloat(settleAmount) || 0;
    const currentWalletINR = walletBalancePaise / 100;
    const remainingVaultINR = Math.max(0, vaultBalance - parsedAmount);
    const projectedWalletINR = currentWalletINR + parsedAmount;

    const isValidAmount = parsedAmount > 0 && parsedAmount <= vaultBalance;

    const applyPercentage = (pct) => {
        if (vaultBalance <= 0) return;
        const val = Math.round((vaultBalance * (pct / 100)) * 100) / 100;
        setSettleAmount(val.toString());
        if (pct === 100) {
            setSettlementType('Full Principal Liquidation');
        } else {
            setSettlementType('Partial Vault Transfer');
        }
    };

    const handleExecuteSettlement = async () => {
        if (!isValidAmount) {
            toast.error('Please enter a valid settlement amount.');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/portfolio/${merchantId}/settle-vault`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    amount: parsedAmount,
                    settlement_type: settlementType,
                    reason: reason.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Settlement failed.');

            toast.success(`Successfully settled ₹${parsedAmount.toLocaleString('en-IN')} to merchant wallet!`);
            setShowConfirmModal(false);

            // Redirect back to portfolio with success state
            router.push(`/admin/portfolio/${merchantId}`);
        } catch (err) {
            console.error('Settlement error:', err);
            toast.error(err.message || 'Settlement execution failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Verifying Super Admin Authorization...
                </p>
            </div>
        );
    }

    // Access Restricted Screen for non-superadmin users
    if (isSuperAdmin === false) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center"
                >
                    <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-rose-600 shadow-inner">
                        <ShieldAlert size={32} />
                    </div>
                    <span className="px-3 py-1 bg-rose-100/80 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-block">
                        Super Admin Required
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Access Restricted</h1>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">
                        AI Grow Vault settlement allows direct atomic capital transfers into merchant main wallets. This privileged terminal is strictly reserved for users with the <strong className="text-slate-800 font-semibold">super_admin</strong> role.
                    </p>
                    <button
                        onClick={() => router.push(`/admin/portfolio/${merchantId}`)}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md"
                    >
                        Return to Portfolio
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-24">
            {/* Top Navigation & Breadcrumbs */}
            <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push(`/admin/portfolio/${merchantId}`)}
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm"
                                title="Back to Portfolio"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-0.5">
                                    <Link href="/admin/investments" className="hover:text-indigo-600 transition-colors">AI Grow</Link>
                                    <span>/</span>
                                    <Link href={`/admin/portfolio/${merchantId}`} className="hover:text-indigo-600 transition-colors">Portfolio</Link>
                                    <span>/</span>
                                    <span className="text-indigo-600 font-bold">Settle Vault</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                        AI Grow Vault Settlement Console
                                    </h1>
                                    <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm flex items-center gap-1">
                                        <Lock size={10} /> Super Admin
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Merchant Badge */}
                        {merchant && (
                            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                                    {merchant.business_name?.substring(0, 2).toUpperCase() || 'MB'}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                                        {merchant.business_name}
                                        <CheckCircle2 size={12} className="text-emerald-500 inline" />
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        {merchant.user_profiles?.full_name || 'Owner'} • {merchant.user_profiles?.phone || 'No Phone'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
                {/* 4 Financial Impact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {/* 1. Source Vault Balance */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Source Capital
                                </span>
                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-bold rounded-md border border-indigo-500/30">
                                    AI Grow Vault
                                </span>
                            </div>
                            <p className="text-xs font-medium text-slate-400 mb-1">Current Vault Balance</p>
                            <p className="text-3xl font-black tracking-tight text-white">
                                ₹{vaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <ShieldCheck size={12} className="text-indigo-400" /> Active deployed trade capital
                        </div>
                    </div>

                    {/* 2. Destination Wallet Balance */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Destination
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md border border-emerald-100">
                                    Merchant Wallet
                                </span>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Current Main Wallet</p>
                            <p className="text-3xl font-black tracking-tight text-slate-900">
                                ₹{currentWalletINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                            <Wallet size={12} className="text-emerald-500" /> Available for payouts & orders
                        </div>
                    </div>

                    {/* 3. Post-Settlement Vault Simulation */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Simulated Result
                                </span>
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                                    remainingVaultINR === 0
                                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                    {remainingVaultINR === 0 ? 'Full Liquidated' : 'Residual'}
                                </span>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Projected Vault Balance</p>
                            <p className="text-3xl font-black tracking-tight text-slate-900">
                                ₹{remainingVaultINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-100 text-[10px] text-rose-600 font-bold flex items-center gap-1">
                            <TrendingDown size={12} /> -₹{parsedAmount.toLocaleString('en-IN')} debit
                        </div>
                    </div>

                    {/* 4. Post-Settlement Wallet Simulation */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl p-6 shadow-lg shadow-emerald-500/10 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                                    Simulated Credit
                                </span>
                                <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded-md backdrop-blur-sm">
                                    Final Wallet Balance
                                </span>
                            </div>
                            <p className="text-xs font-medium text-emerald-100 mb-1">Projected Merchant Wallet</p>
                            <p className="text-3xl font-black tracking-tight text-white">
                                ₹{projectedWalletINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="pt-4 mt-4 border-t border-white/20 text-[10px] text-emerald-100 font-bold flex items-center gap-1">
                            <TrendingUp size={12} className="text-white" /> +₹{parsedAmount.toLocaleString('en-IN')} credit
                        </div>
                    </div>
                </div>

                {/* Main Settlement Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Configuration Form (8 Cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Step 1: Amount Configuration */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                        <Banknote size={20} className="text-indigo-600" />
                                        1. Configure Settlement Amount
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Specify the exact capital in INR to transfer from the AI Grow Vault to the merchant wallet.
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-slate-400">
                                    Max: ₹{vaultBalance.toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* Preset Buttons */}
                            <div className="grid grid-cols-4 gap-2 sm:gap-3">
                                {[
                                    { label: '25%', pct: 25 },
                                    { label: '50%', pct: 50 },
                                    { label: '75%', pct: 75 },
                                    { label: '100% (Max)', pct: 100 },
                                ].map((p) => {
                                    const calcVal = Math.round((vaultBalance * (p.pct / 100)) * 100) / 100;
                                    const isSelected = parsedAmount > 0 && Math.abs(parsedAmount - calcVal) < 0.01;
                                    return (
                                        <button
                                            key={p.pct}
                                            type="button"
                                            onClick={() => applyPercentage(p.pct)}
                                            className={`p-3 rounded-2xl border text-center transition-all ${
                                                isSelected
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold scale-[1.02]'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold'
                                            }`}
                                        >
                                            <div className="text-xs uppercase tracking-wider">{p.label}</div>
                                            <div className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                                                ₹{calcVal.toLocaleString('en-IN')}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Precise Numeric Input */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                                    Settlement Capital (INR)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 text-xl font-bold">
                                        ₹
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max={vaultBalance}
                                        step="any"
                                        value={settleAmount}
                                        onChange={(e) => setSettleAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-300 rounded-2xl text-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                    />
                                </div>
                                {parsedAmount > vaultBalance && (
                                    <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1">
                                        <AlertTriangle size={14} /> Amount exceeds current vault balance of ₹{vaultBalance.toLocaleString('en-IN')}.
                                    </p>
                                )}
                                {vaultBalance === 0 && (
                                    <p className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-1">
                                        <AlertTriangle size={14} /> This merchant currently has zero balance in their AI Grow Vault.
                                    </p>
                                )}
                            </div>

                            {/* Percentage Range Slider */}
                            {vaultBalance > 0 && (
                                <div className="space-y-1.5 pt-2">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                        <span>0%</span>
                                        <span>Settlement Ratio: {Math.min(100, Math.round((parsedAmount / vaultBalance) * 100))}%</span>
                                        <span>100%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={vaultBalance}
                                        step={vaultBalance / 100 || 1}
                                        value={Math.min(vaultBalance, Math.max(0, parsedAmount))}
                                        onChange={(e) => setSettleAmount(e.target.value)}
                                        className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Step 2: Settlement Classification */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <FileText size={20} className="text-indigo-600" />
                                2. Settlement Classification & Purpose
                            </h2>
                            <p className="text-xs text-slate-500">
                                Tag this transaction with the official accounting rationale for regulatory and audit tracking.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                {settlementTypes.map((t) => {
                                    const Icon = t.icon;
                                    const active = settlementType === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setSettlementType(t.id)}
                                            className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                                                active
                                                    ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                                            }`}
                                        >
                                            <div className={`p-2.5 rounded-xl shrink-0 ${active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-black leading-tight ${active ? 'text-indigo-950' : 'text-slate-800'}`}>
                                                    {t.label}
                                                </p>
                                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                                    {t.desc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Mandatory Reason */}
                            <div className="space-y-2 pt-4">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                                    Audit & Ledger Reference Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter detailed reason for vault settlement..."
                                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all leading-relaxed"
                                />
                                <p className="text-[10px] text-slate-400 font-medium">
                                    This explanation will be permanently recorded in the immutable audit log and the merchant transaction ledger.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Summary & Ledger Action Card (4 Cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Double Entry Ledger Preview */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck size={16} className="text-emerald-600" />
                                    Double-Entry Preview
                                </h3>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                    Balanced
                                </span>
                            </div>

                            <div className="space-y-3">
                                {/* Debit Row */}
                                <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-2xl">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                                        <span className="flex items-center gap-1.5 text-rose-700">
                                            <TrendingDown size={14} /> DEBIT
                                        </span>
                                        <span className="font-mono text-rose-700 font-black">
                                            - ₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                                        AI Grow Vault Ledger (<code className="text-slate-600 font-mono">ai_grow_wallets</code>)
                                    </p>
                                </div>

                                {/* Credit Row */}
                                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                                        <span className="flex items-center gap-1.5 text-emerald-700">
                                            <TrendingUp size={14} /> CREDIT
                                        </span>
                                        <span className="font-mono text-emerald-700 font-black">
                                            + ₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                                        Merchant Main Wallet (<code className="text-slate-600 font-mono">merchants.wallet_balance_paise</code>)
                                    </p>
                                </div>
                            </div>

                            {/* Summary Breakdown */}
                            <div className="space-y-2 pt-2 text-xs border-t border-slate-100">
                                <div className="flex justify-between text-slate-500 font-medium">
                                    <span>Settlement Mode:</span>
                                    <span className="font-bold text-slate-800">{settlementType}</span>
                                </div>
                                <div className="flex justify-between text-slate-500 font-medium">
                                    <span>Processing Fee:</span>
                                    <span className="font-bold text-emerald-600">₹0.00 (Zero Fee)</span>
                                </div>
                                <div className="flex justify-between text-slate-500 font-medium">
                                    <span>Settlement Timing:</span>
                                    <span className="font-bold text-slate-800">Instant Execution</span>
                                </div>
                                <div className="flex justify-between text-slate-500 font-medium">
                                    <span>Authorization Level:</span>
                                    <span className="font-bold text-indigo-600">Super Admin Only</span>
                                </div>
                            </div>

                            {/* Execution CTA Button */}
                            <div className="pt-3 space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(true)}
                                    disabled={!isValidAmount || submitting}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                                >
                                    <Lock size={14} /> Authorize & Settle Vault
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/admin/portfolio/${merchantId}`)}
                                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all"
                                >
                                    Cancel & Return
                                </button>
                            </div>
                        </div>

                        {/* Security Notice */}
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 text-xs text-amber-900 space-y-2">
                            <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-wider text-amber-800">
                                <AlertTriangle size={15} />
                                Security Compliance
                            </div>
                            <p className="text-[11px] text-amber-800/90 leading-relaxed">
                                Once executed, this atomic operation debits the merchant’s AI Grow investment ledger and immediately injects liquid funds into their merchant payout balance. The merchant receives an automated notification.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-200 space-y-6"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                        Confirm Vault Settlement
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Double check the transfer parameters before releasing funds.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Merchant:</span>
                                    <span className="font-bold text-slate-900">{merchant?.business_name}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Settlement Amount:</span>
                                    <span className="font-black text-indigo-600 text-base">
                                        ₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Remaining in Vault:</span>
                                    <span className="font-bold text-slate-800">
                                        ₹{remainingVaultINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">New Merchant Wallet:</span>
                                    <span className="font-bold text-emerald-600">
                                        ₹{projectedWalletINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2">
                                    <span className="text-slate-500 font-medium">Classification:</span>
                                    <span className="font-bold text-slate-800">{settlementType}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={submitting}
                                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteSettlement}
                                    disabled={submitting}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" /> Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={16} /> Confirm & Settle
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
