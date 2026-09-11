'use client';

import { useState, useEffect } from 'react';
import { animate, motionValue } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import {
    Building2,
    Eye,
    EyeOff,
    ShieldCheck,
    PieChart as PieIcon,
    Calendar,
    ArrowUpRight,
    Clock,
    AlertCircle,
    RefreshCw,
    Plus,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import LockinAnalytics from '@/components/merchant/lockin/LockinAnalytics';
import { usePayment } from '@/hooks/usePayment';

export default function MerchantLockinPage() {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [lastSynced, setLastSynced] = useState(new Date());
    const [syncText, setSyncText] = useState('Updated just now');
    const [user, setUser] = useState(null);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const { initiatePayment, loading: paymentLoading } = usePayment();
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');

    // Real-time counter component
    const RealtimeAccumulated = ({ balances, isRevealed, showTotal = false, showProfitOnly = false }) => {
        const [displayValue, setDisplayValue] = useState(0);
        const [isAnimatingReveal, setIsAnimatingReveal] = useState(false);

        const getAccumulatedAt = (timestamp) => {
            const activeBalances = balances.filter(b => b.status === 'active');
            return activeBalances.reduce((sum, b) => {
                const principal = (b.amount_paise || 0) / 100;
                const rate = (b.interest_rate || 0) / 100;
                if (!b.start_date) return sum;
                const startDate = new Date(b.start_date);
                
                let endDate = new Date();
                if (b.end_date) {
                    endDate = new Date(b.end_date);
                } else if (b.lockin_period_months) {
                    endDate = new Date(startDate);
                    endDate.setMonth(endDate.getMonth() + b.lockin_period_months);
                }
                
                const boundedNow = Math.min(timestamp, endDate.getTime());
                const elapsedMs = Math.max(0, boundedNow - startDate.getTime());
                const daysElapsed = elapsedMs / (1000 * 60 * 60 * 24);
                return sum + (principal * (rate / 365) * daysElapsed);
            }, 0);
        };

        const activeBalances = balances.filter(b => b.status === 'active');
        const totalPrincipal = activeBalances.reduce((sum, b) => sum + (b.amount_paise || 0), 0) / 100;

        // On reveal, animate from 0 to current target
        useEffect(() => {
            if (!isRevealed) {
                setDisplayValue(0);
                setIsAnimatingReveal(false);
                return;
            }

            setIsAnimatingReveal(true);
            const targetProfit = getAccumulatedAt(Date.now());
            const target = showProfitOnly ? targetProfit : (totalPrincipal + targetProfit);
            
            const anim = animate(0, target, {
                duration: 1.2,
                ease: "easeOut",
                onUpdate: (latest) => setDisplayValue(latest),
                onComplete: () => setIsAnimatingReveal(false)
            });

            return () => anim.stop();
        }, [isRevealed, balances]);

        // Real-time ticking after reveal is done
        useEffect(() => {
            if (!isRevealed || isAnimatingReveal) return;

            const timer = setInterval(() => {
                const currentProfit = getAccumulatedAt(Date.now());
                const currentTarget = showProfitOnly ? currentProfit : (totalPrincipal + currentProfit);
                setDisplayValue(currentTarget);
            }, 50);
            return () => clearInterval(timer);
        }, [isRevealed, isAnimatingReveal, balances]);

        if (!isRevealed) {
            return <span>• • • • • •</span>;
        }

        if (showTotal) {
            const whole = Math.floor(displayValue);
            const fraction = (displayValue - whole).toFixed(2).substring(2);
            return (
                <div className="flex items-baseline font-mono">
                    <span>{whole.toLocaleString('en-IN')}</span>
                    <span className="text-xl md:text-2xl font-medium text-slate-400 ml-1 tracking-normal w-[60px] inline-block">.{fraction}</span>
                </div>
            );
        }

        return <span className="font-mono">{displayValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    };

    // Animated Counter Component
    const AnimatedNumber = ({ value, decimals = 0 }) => {
        const [displayValue, setDisplayValue] = useState(0);

        useEffect(() => {
            if (!isRevealed) {
                setDisplayValue(0);
                return;
            }
            const controls = motionValue(0);
            animate(0, value, {
                duration: 1.2,
                ease: "easeOut",
                onUpdate: (latest) => setDisplayValue(latest)
            });
        }, [value, isRevealed]);

        return <span className="font-mono">{displayValue.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}</span>;
    };

    useEffect(() => {
        const timer = setInterval(() => {
            const secondsPast = Math.floor((new Date() - lastSynced) / 1000);
            if (secondsPast < 60) {
                setSyncText('Updated just now');
            } else if (secondsPast < 3600) {
                const mins = Math.floor(secondsPast / 60);
                setSyncText(`Updated ${mins} min${mins > 1 ? 's' : ''} ago`);
            } else {
                const hours = Math.floor(secondsPast / 3600);
                setSyncText(`Updated ${hours} hr${hours > 1 ? 's' : ''} ago`);
            }
        }, 10000);
        return () => clearInterval(timer);
    }, [lastSynced]);

    const fetchBalances = async () => {
        setLoading(true);
        setHasError(false);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);

            const { data: merchant, error: mError } = await supabase
                .from('merchants')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (mError) throw mError;
            if (!merchant) return;

            const { data, error: bError } = await supabase
                .from('merchant_lockin_balances')
                .select('*')
                .eq('merchant_id', merchant.id)
                .order('created_at', { ascending: false });

            if (bError) throw bError;
            setBalances(data || []);
            setLastSynced(new Date());
            setSyncText('Updated just now');
        } catch (err) {
            console.error('Error fetching growth portfolio:', err);
            setHasError(true);
            toast.error('Unable to load your growth portfolio');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    const activeBalances = balances.filter(b => b.status === 'active');
    const totalPrincipal = activeBalances.reduce((sum, b) => sum + (b.amount_paise || 0), 0) / 100;

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen font-sans selection:bg-blue-100 dark:selection:bg-blue-900 text-slate-900 dark:text-slate-100">
            <div className="max-w-6xl mx-auto space-y-8 md:space-y-10">
                {/* ── Refined Growth Portfolio Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pb-2">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Growth Portfolio</h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-tight">Capital deployed to fuel INTRUST Mart inventory, powered by your business.</p>
                    </div>

                    {/* ── Action Row ── */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
                            <ShieldCheck size={16} className="text-blue-500 dark:text-blue-400" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Protected Assets</span>
                        </div>

                        {/* Informational Status & Refresh */}
                        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none min-w-[100px]">{syncText}</span>
                            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800" />
                            <button
                                type="button"
                                onClick={fetchBalances}
                                disabled={loading}
                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                                aria-label="Refresh balances"
                                title="Refresh balances"
                            >
                                <RefreshCw size={14} className={`${loading ? 'animate-spin text-blue-500' : 'hover:rotate-180 transition-transform duration-500'}`} />
                            </button>
                        </div>

                        {/* Primary Action Button */}
                        <button
                            type="button"
                            onClick={() => setShowModal(true)}
                            aria-label="Create new lockin request"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-600/20"
                        >
                            <Plus size={16} /> New Request
                        </button>
                    </div>
                </div>

                {/* ── Error State ── */}
                {hasError && !loading && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center text-rose-500">
                            <AlertCircle size={28} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to load your growth portfolio</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">We could not fetch your vault contracts. Please check your connection and retry.</p>
                        </div>
                        <button
                            type="button"
                            onClick={fetchBalances}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                        >
                            <RefreshCw size={14} /> Retry
                        </button>
                    </div>
                )}

                {/* ── Portfolio Value Summary ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Growth Balance Card */}
                    <div className="lg:col-span-8 bg-slate-950 dark:bg-slate-900/95 rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-8 md:p-10 lg:p-12 text-white shadow-2xl shadow-blue-950/20 relative overflow-hidden group border border-slate-800/80 dark:border-white/10">
                        {/* High-end Gradient Layers */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[130px] rounded-full -mr-48 -mt-48 transition-all duration-1000 group-hover:bg-blue-600/20 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/10 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

                        <div className="relative z-10 flex flex-col h-full justify-between gap-10 md:gap-14">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em]">Growth Balance</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsRevealed(!isRevealed)}
                                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
                                        aria-label={isRevealed ? "Hide confidential balance" : "Reveal confidential balance"}
                                        title={isRevealed ? "Hide balance" : "Reveal balance"}
                                    >
                                        {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div className="min-h-20 sm:min-h-24 flex items-center">
                                    <AnimatePresence mode="wait">
                                        {!isRevealed ? (
                                            <motion.button
                                                key="tap-to-view"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                onClick={() => setIsRevealed(true)}
                                                aria-label="Reveal confidential balance"
                                                className="group/btn flex items-center gap-4 px-6 sm:px-8 py-4 sm:py-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all focus-visible:ring-2 focus-visible:ring-blue-400"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover/btn:scale-105 transition-transform">
                                                    <Eye size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Confidential</p>
                                                    <p className="text-sm font-extrabold text-white tracking-tight">Tap to View Balance</p>
                                                </div>
                                            </motion.button>
                                        ) : (
                                            <motion.div
                                                key="balance-revealed"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-baseline gap-2"
                                            >
                                                <span className="text-xl md:text-3xl font-bold text-slate-400 align-top mt-1">₹</span>
                                                <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white">
                                                    <RealtimeAccumulated balances={balances} isRevealed={isRevealed} showTotal={true} />
                                                </h2>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 sm:pt-8 border-t border-white/10">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partnership Capital</p>
                                    <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
                                        ₹{isRevealed ? <AnimatedNumber value={totalPrincipal} /> : '• • • • • •'}
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Current Value</p>
                                    <div className="flex items-center gap-4">
                                        <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-emerald-400 tracking-tight flex items-center font-mono">
                                            ₹{isRevealed ? <RealtimeAccumulated balances={balances} isRevealed={isRevealed} showTotal={false} /> : '• • • • • •'}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Total Profit</p>
                                    <div className="flex items-center gap-4">
                                        <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-blue-400 tracking-tight flex items-center font-mono">
                                            ₹{isRevealed ? <RealtimeAccumulated balances={balances} isRevealed={isRevealed} showProfitOnly={true} /> : '• • • • • •'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column Financial Metrics */}
                    <div className="lg:col-span-4 grid grid-cols-1 gap-6">
                        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between group hover:border-blue-400/60 dark:hover:border-blue-500/60 transition-all cursor-default">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                                    <PieIcon size={24} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Bonus Avg</span>
                            </div>
                            <div className="mt-8">
                                <p className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                                    {activeBalances.length > 0 ? (activeBalances.reduce((a, b) => a + (b.interest_rate || 0), 0) / activeBalances.length).toFixed(1) : '0.0'}%
                                    <span className="text-[11px] text-blue-500 dark:text-blue-400 font-bold ml-2 tracking-widest uppercase">Reward</span>
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-tight">Optimal Growth</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 dark:bg-slate-900/90 border border-slate-800 dark:border-white/10 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between group cursor-default relative overflow-hidden transition-all duration-500">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <p className="text-white font-extrabold text-base tracking-tight uppercase">Bank Payout</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.15em]">Direct Settlement</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-400 text-[11px] font-medium leading-relaxed relative z-10 mt-6 pt-6 border-t border-white/5 opacity-80">
                                Funds are wired directly to your verified bank account upon contract maturity.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Growth Visualization ── */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="space-y-1">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Growth Roadmap</h2>
                            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Projected maturity and interest distribution</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">Projected Value</span>
                            </div>
                        </div>
                    </div>
                    {!loading && <LockinAnalytics balances={balances} />}
                </div>

                {/* ── Contract Inventory ── */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                            Asset Inventory
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700">{balances.length}</span>
                        </h3>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 min-h-[260px] animate-pulse flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                                        <div className="w-20 h-6 rounded-full bg-slate-100 dark:bg-slate-800" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                                        <div className="w-40 h-8 bg-slate-100 dark:bg-slate-800 rounded" />
                                    </div>
                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                                        <div className="w-28 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : balances.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {balances.map(item => (
                                <Link
                                    href={`/merchant/lockin/${item.id}`}
                                    key={item.id}
                                    className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-blue-500/5 transition-all duration-300 group flex flex-col justify-between min-h-[260px] hover:-translate-y-1 relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 shadow-2xs">
                                            <ShieldCheck size={22} />
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${item.status === 'active'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
                                            : item.status === 'matured'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                            }`}>
                                            {item.status?.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="mt-8 space-y-1.5 relative z-10">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Capital Sum</p>
                                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-mono">
                                            ₹{((item.amount_paise || 0) / 100).toLocaleString('en-IN')}
                                        </p>
                                        <div className="flex items-center gap-2.5 pt-1">
                                            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{item.interest_rate}% Reward</span>
                                            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{item.lockin_period_months}M Term</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                                                Unlocks {item.end_date ? new Date(item.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Pending'}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white group-hover:rotate-45 transition-transform duration-300 shadow-md">
                                            <ArrowUpRight size={16} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center">
                            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
                                <AlertCircle size={28} className="text-slate-400 dark:text-slate-500" />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Portfolio Empty</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-xs font-medium">Your locked growth contracts will appear here once initiated.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── New Fund Request Modal ── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
                        <div className="absolute inset-0" onClick={() => setShowModal(false)} />
                        <motion.div initial={{ scale: 0.96, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 16 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-10 border border-slate-200/90 dark:border-slate-800">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                            <Sparkles size={14} className="text-white" />
                                        </div>
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Growth Portfolio</p>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">New Lockin Request</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    aria-label="Close modal"
                                    className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (Number(amount) < 10000) return toast.error('Minimum ₹10,000 required');
                                setShowModal(false);
                                
                                toast.loading('Redirecting to payment gateway...', { id: 'pg-redirect' });
                                try {
                                    await initiatePayment({
                                        amount: Number(amount).toFixed(2),
                                        payerName: user?.user_metadata?.full_name || "Merchant",
                                        payerEmail: user?.email || "merchant@intrustindia.com",
                                        payerMobile: user?.phone || "9999999999",
                                        udf1: "MERCHANT_LOCKIN",
                                        udf2: desc || 'Lockin request'
                                    });
                                } catch (err) {
                                    toast.error(err.message || 'Payment initiation failed', { id: 'pg-redirect' });
                                }
                            }} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</span>
                                        <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="Min ₹10,000"
                                            className="w-full pl-9 pr-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 text-lg font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all [appearance:textfield]" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Dynamic interest rate applies as per approved contract.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Notes (Optional)</label>
                                    <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Any context for this request..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all min-h-[80px] resize-none" />
                                </div>
                                <button type="submit"
                                    disabled={paymentLoading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-95 text-white font-black py-3.5 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                    {paymentLoading ? 'Processing...' : <><Plus size={16} /> Pay Now</>}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
