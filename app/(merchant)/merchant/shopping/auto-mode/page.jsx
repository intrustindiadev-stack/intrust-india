'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, Crown, CheckCircle2, ChevronRight, Activity, Wallet, ShieldCheck, Zap, Truck } from 'lucide-react';
import Link from 'next/link';

export default function AutoModePage() {
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [merchant, setMerchant] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');

    // UI states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);

    const fetchMerchantData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: merchantData, error: merchantError } = await supabase
                .from('merchants')
                .select('*, auto_mode_status, auto_mode_months_paid, auto_mode_valid_until')
                .eq('user_id', session.user.id)
                .single();

            if (merchantError && merchantError.code !== 'PGRST116') throw merchantError;
            setMerchant(merchantData);

            // Fetch Wallet Balance via global API
            const walletRes = await fetch('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: 'no-store'
            });

            if (walletRes.ok) {
                const walletData = await walletRes.json();
                setWalletBalance(parseFloat(walletData.wallet.balance || 0));
            }

        } catch (err) {
            console.error('Error fetching merchant data for auto mode', err);
            setError('Failed to load auto mode data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMerchantData();
    }, []);

    useEffect(() => {
        if (!merchant?.auto_mode_valid_until || merchant?.auto_mode_status !== 'active') return;

        const calculateTimeLeft = () => {
            const difference = new Date(merchant.auto_mode_valid_until) - new Date();
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft('Expired');
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [merchant?.auto_mode_valid_until, merchant?.auto_mode_status]);

    const isAutoModeActive = merchant?.auto_mode_status === 'active';
    const isFirstMonth = (merchant?.auto_mode_months_paid || 0) === 0;
    const subscriptionPrice = isFirstMonth ? 999 : 1999;

    const handleToggleAutoMode = async () => {
        if (isAutoModeActive) {
            // Turning OFF logic -> show warning modal first
            setShowWarningModal(true);
        } else {
            // Turning ON -> show payment modal first
            setShowPaymentModal(true);
        }
    };

    const confirmDeactivation = async () => {
        setProcessing(true);
        setShowWarningModal(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/auto-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ action: 'deactivate' })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update Auto Mode status');

            setMerchant(prev => ({ ...prev, auto_mode_status: 'inactive' }));
            setSuccess('Auto Mode has been deactivated.');
        } catch (err) {
            console.error('Deactivation error:', err);
            setError(err.message || 'Failed to turn off Auto Mode.');
            setTimeout(() => setError(null), 5000);
        } finally {
            setProcessing(false);
        }
    };

    const confirmActivation = async () => {
        if (walletBalance < subscriptionPrice) {
            setError(`Insufficient wallet balance. You need ₹${subscriptionPrice} to activate Auto Mode.`);
            setTimeout(() => setError(null), 5000);
            return;
        }

        setProcessing(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch('/api/merchant/auto-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ action: isAutoModeActive ? 'deactivate' : 'activate' })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update Auto Mode status');
            }

            if (isAutoModeActive) {
                // Was turned off
                setMerchant(prev => ({ ...prev, auto_mode_status: 'inactive' }));
            } else {
                // Was turned on
                setWalletBalance(data.newBalance);
                setMerchant(prev => ({
                    ...prev,
                    auto_mode_status: 'active',
                    auto_mode_months_paid: data.months_paid,
                    auto_mode_valid_until: data.validUntil
                }));
                setSuccess('Auto Mode activated successfully! Your storefront is now automated.');
                setShowPaymentModal(false);
            }

        } catch (err) {
            console.error('Checkout error:', err);
            setError(err.message || 'Payment failed. Please try again.');
            setTimeout(() => setError(null), 5000);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="flex h-[70vh] items-center justify-center text-white"><Activity className="animate-spin text-[#D4AF37]" size={40} /></div>;
    }

    return (
        <div className="w-full flex justify-center items-center py-6">
            <div
                className={`h-[70vh] max-h-[750px] w-full max-w-sm rounded-[2rem] overflow-hidden flex flex-col items-center justify-center transition-all duration-1000 relative shadow-2xl ${isAutoModeActive ? 'bg-[#0a1410] shadow-emerald-500/10' : 'bg-[#0f111a] shadow-black/50'}`}
                style={{
                    backgroundImage: 'url(/auto_mode_bg.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundBlendMode: isAutoModeActive ? 'overlay' : 'soft-light'
                }}
            >
                {/* Absolute Ambient Glow Container */}
                {isAutoModeActive && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-transparent to-transparent"></div>
                )}

                {/* Top Bar with Premium/Wallet Buttons - Mobile Optimized */}
                <div className="absolute top-4 w-full px-6 flex justify-between items-center z-10">
                    {/* Back button or space */}
                    <Link href="/merchant/dashboard" className="text-white/60 hover:text-white p-2 bg-black/20 rounded-full backdrop-blur-md">
                        <span className="material-icons-round text-sm">arrow_back</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Link href="/merchant/wallet" className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 text-[11px] font-bold text-white shadow-xl">
                            <Wallet size={14} className="text-[#D4AF37]" />
                            <span>₹{walletBalance.toFixed(2)}</span>
                        </Link>
                        {!isAutoModeActive && (
                            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] px-4 py-2 rounded-full text-[11px] font-black tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                <Crown size={12} />
                                PRO
                            </div>
                        )}
                    </div>
                </div>

                {/* Title & Status Area (Shifted up slightly for mobile) */}
                <div className="text-center z-10 mb-12 mt-4 flex flex-col items-center max-w-[280px]">
                    <div className="mb-4 flex gap-3 justify-center">
                        {/* Fake Server Nodes */}
                        <div className={`w-2.5 h-2.5 rounded-full ${isAutoModeActive ? 'bg-emerald-400 shadow-[0_0_15px_#34d399]' : 'bg-slate-700'}`}></div>
                        <div className={`w-2.5 h-2.5 rounded-full ${isAutoModeActive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] delay-100' : 'bg-slate-700'}`}></div>
                        <div className={`w-2.5 h-2.5 rounded-full ${isAutoModeActive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] delay-200' : 'bg-slate-700'}`}></div>
                    </div>

                    <motion.h1
                        key={isAutoModeActive ? 'on' : 'off'}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-white text-3xl font-black tracking-tight font-[family-name:var(--font-manrope)]"
                    >
                        {isAutoModeActive ? 'System Online' : 'Standby Mode'}
                    </motion.h1>

                    <p className="text-slate-400 mt-3 text-[11px] leading-relaxed">
                        {isAutoModeActive
                            ? 'Automation algorithms securely routing your inventory.'
                            : 'Connect matrix to autopilot your merchant dashboard.'}
                    </p>

                    {isAutoModeActive && merchant?.auto_mode_valid_until && (
                        <div className="mt-4 flex flex-col items-center gap-1.5">
                            <p className="text-emerald-400/80 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                Active Until: {new Date(merchant.auto_mode_valid_until).toLocaleDateString()}
                            </p>
                            {timeLeft && timeLeft !== 'Expired' && (
                                <p className="text-emerald-300 font-mono text-[11px] bg-[#0a1f16]/80 px-4 py-1 rounded shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-emerald-500/30">
                                    Time Left: {timeLeft}
                                </p>
                            )}
                            {timeLeft === 'Expired' && (
                                <p className="text-red-400 font-bold text-[11px] bg-red-500/10 px-3 py-1 rounded border border-red-500/30">
                                    Subscription Expired
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Giant Slick Slider Button UI (Scaled beautifully for Mobile) */}
                <div className="relative w-full flex justify-center z-10">
                    {/* Glowing Concentric Ripples if Active */}
                    {isAutoModeActive && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="absolute w-[180px] h-[180px] bg-emerald-500/10 rounded-full animate-[ping_3s_ease-out_infinite]" />
                            <div className="absolute w-[240px] h-[240px] bg-emerald-500/5 rounded-full border border-emerald-500/10 animate-[ping_4s_ease-out_infinite_1s]" />
                            <div className="absolute w-[300px] h-[300px] border border-emerald-500/5 rounded-full animate-[ping_5s_ease-out_infinite_2s]" />
                        </div>
                    )}

                    {/* Main Toggle Track */}
                    <div
                        className={`relative w-24 h-48 rounded-full flex flex-col items-center justify-between p-2 border shadow-2xl transition-all duration-700 z-20
                        ${isAutoModeActive
                                ? 'bg-[#1b3e33]/80 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] inset-shadow-sm inset-shadow-black'
                                : 'bg-[#1a1c23] border-white/5 shadow-black/80'}`}
                    >
                        <div className="flex flex-col items-center gap-1 mt-5">
                            <div className={`w-1.5 h-1.5 rounded-full ${!isAutoModeActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></div>
                            <span className="text-[9px] font-black text-slate-400 tracking-widest">ON</span>
                        </div>

                        <div className="flex flex-col items-center gap-1 mb-5">
                            <span className="text-[9px] font-black text-slate-400 tracking-widest">OFF</span>
                            <div className={`w-2.5 h-1 rounded-full ${isAutoModeActive ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-slate-600'}`}></div>
                        </div>

                        {/* The physical Switch Thumb */}
                        <button
                            disabled={processing}
                            onClick={handleToggleAutoMode}
                            className={`absolute left-2 right-2 h-20 rounded-[2rem] flex flex-col items-center justify-center transform transition-all duration-500 hover:scale-[0.98] active:scale-[0.95] disabled:scale-100 disabled:opacity-80
                            ${isAutoModeActive
                                    ? 'bottom-2 bg-[#11231c] border border-emerald-500/50 shadow-[inset_0_2px_10px_rgba(255,255,255,0.1),_0_(8px)_15px_rgba(0,0,0,0.5)]'
                                    : 'top-2 bg-[#262833] border border-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.1),_0_(8px)_15px_rgba(0,0,0,0.5)]'}`}
                        >
                            <Power size={24} className={isAutoModeActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-slate-400'} />
                        </button>
                    </div>
                </div>

                {/* Floating Toast Notifications */}
                <div className="absolute bottom-6 left-0 right-0 z-50 flex flex-col items-center px-6 pointer-events-none gap-2">
                    <AnimatePresence mode="popLayout">
                        {error && (
                            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#1f1616]/95 backdrop-blur-md border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl text-[11px] font-bold shadow-2xl pointer-events-auto">
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#111c18]/95 backdrop-blur-md border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-2xl text-[11px] font-bold shadow-2xl flex items-center gap-2 pointer-events-auto">
                                <CheckCircle2 size={14} />
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Payment Modal */}
                <AnimatePresence>
                    {showPaymentModal && !isAutoModeActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-4 bg-black/80 backdrop-blur-sm"
                        >
                            {/* Overlay closer */}
                            <div className="absolute inset-0 z-0" onClick={() => !processing && setShowPaymentModal(false)} />

                            <motion.div
                                initial={{ y: "100%", scale: 1 }}
                                animate={{ y: 0, scale: 1 }}
                                exit={{ y: "100%", scale: 0.95 }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="bg-[#1f222b] border border-white/10 rounded-[2rem] p-6 w-full max-w-sm mx-auto shadow-2xl relative z-10 overflow-hidden"
                            >
                                {/* Decorative Blur */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-white font-black text-lg flex items-center gap-2">
                                        PRO Access
                                        {isFirstMonth && <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[9px] uppercase font-black px-2 py-0.5 rounded shadow-sm">Trial</span>}
                                    </h3>
                                    <button
                                        onClick={() => setShowPaymentModal(false)}
                                        disabled={processing}
                                        className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-white/50 hover:text-white"
                                    >
                                        <span className="material-icons-round text-sm">close</span>
                                    </button>
                                </div>

                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-3xl font-black text-[#D4AF37]">₹{subscriptionPrice}</span>
                                    <span className="text-slate-400 text-xs font-semibold">/ month</span>
                                </div>

                                <ul className="mt-5 space-y-2 mb-6">
                                    <li className="flex items-center gap-3 text-slate-300 text-xs font-medium">
                                        <ShieldCheck size={16} className="text-[#D4AF37]" /> Pricing automatically optimized
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300 text-xs font-medium">
                                        <Zap size={16} className="text-[#D4AF37]" /> Instantly accepts incoming orders
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300 text-xs font-medium">
                                        <Activity size={16} className="text-[#D4AF37]" /> Zero manual inventory fatigue
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300 text-xs font-medium">
                                        <Truck size={16} className="text-[#D4AF37]" /> Hands-free delivery assignment
                                    </li>
                                </ul>

                                <button
                                    onClick={confirmActivation}
                                    disabled={processing}
                                    className="w-full bg-[#D4AF37] hover:bg-[#b5952f] text-black font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                                >
                                    {processing ? <Activity size={18} className="animate-spin" /> : 'Pay & Ignite'}
                                    {!processing && <ChevronRight size={18} strokeWidth={3} />}
                                </button>

                                {isFirstMonth && (
                                    <p className="text-center text-slate-500 text-[9px] uppercase tracking-wider font-bold mt-4">
                                        Renews at ₹1999 next month
                                    </p>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Deactivation Warning Modal */}
                <AnimatePresence>
                    {showWarningModal && isAutoModeActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
                        >
                            <div className="absolute inset-0 z-0" onClick={() => !processing && setShowWarningModal(false)} />

                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-[#1f1616] border border-red-500/20 rounded-3xl p-6 w-full max-w-xs mx-auto shadow-2xl shadow-red-900/20 relative z-10 text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                    <Power size={20} className="text-red-500" />
                                </div>
                                <h3 className="text-white font-black text-lg mb-2">Power Down?</h3>
                                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                    You are about to disconnect from the automation matrix. You will have to manually accept orders and manage stock again.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowWarningModal(false)}
                                        disabled={processing}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 rounded-xl transition-all text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeactivation}
                                        disabled={processing}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all text-xs flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                    >
                                        {processing ? <Activity size={16} className="animate-spin" /> : 'Confirm'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
