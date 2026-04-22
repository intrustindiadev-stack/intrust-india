'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import WalletTopup from '@/components/wallet/WalletTopup';
import WithdrawalForm from '@/components/wallet/WithdrawalForm'; // Assuming this component exists
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useSubscription } from '@/components/merchant/SubscriptionContext';
import { useConfetti } from '@/components/ui/ConfettiProvider';
import { groupTransactions } from '@/lib/wallet/groupTransactions';

function WalletContent() {
    const router = useRouter();
    const { performAction } = useSubscription();
    const { trigger: triggerConfetti } = useConfetti();
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTopup, setShowTopup] = useState(false);
    const [showWithdrawal, setShowWithdrawal] = useState(false); // New state for withdrawal
    const [balanceRevealed, setBalanceRevealed] = useState(false);
    const [tapping, setTapping] = useState(false);
    const [displayBalance, setDisplayBalance] = useState(0);
    const [txFilter, setTxFilter] = useState('ALL');
    const animFrameRef = useRef(null);

    const balance = wallet?.balance ?? 0;

    // Counting animation — runs every time balance is revealed
    useEffect(() => {
        if (!balanceRevealed) {
            setDisplayBalance(0);
            return;
        }
        const target = Number(balance);
        const duration = 1200; // ms
        const startTime = performance.now();

        const easeOutExpo = (t) =>
            t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutExpo(progress);
            setDisplayBalance(eased * target);
            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(tick);
            } else {
                setDisplayBalance(target);
            }
        };

        animFrameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [balanceRevealed, balance]);

    const handleBalanceTap = () => {
        setTapping(true);
        setTimeout(() => setTapping(false), 500);
        setBalanceRevealed((prev) => !prev);
    };
    const [user, setUser] = useState(null);
    const [merchantData, setMerchantData] = useState(null); // New state for merchant data
    const searchParams = useSearchParams();

    const fetchWalletData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Not authenticated');
                return;
            }

            // Fetch wallet data
            const walletRes = await fetch('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: 'no-store'
            });

            if (!walletRes.ok) throw new Error('Failed to fetch wallet data');
            const walletData = await walletRes.json();
            setWallet(walletData.wallet);
            setTransactions(walletData.transactions || []);

            // Fetch merchant data (bank_verified, bank_data for withdrawal)
            const { data: merchant, error: merchantError } = await supabase
                .from('merchants')
                .select('id, bank_verified, bank_data, wallet_balance_paise, business_name, status')
                .eq('user_id', session.user.id)
                .single();

            if (merchantError && merchantError.code !== 'PGRST116') {
                console.error('Error fetching merchant data:', merchantError);
            }
            setMerchantData(merchant);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
        fetchWalletData();
    }, [fetchWalletData]);

    useEffect(() => {
        if (!merchantData?.id) return;

        const channel = supabase
            .channel(`merchant-wallet-${merchantData.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'merchant_transactions',
                filter: `merchant_id=eq.${merchantData.id}`,
            }, () => {
                fetchWalletData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [merchantData?.id, fetchWalletData]);

    useEffect(() => {
        const action = searchParams.get('action');
        const topup = searchParams.get('topup');
        if (action === 'topup') {
            setShowTopup(true);
        }
        if (topup === 'success') {
            fetchWalletData();
        }
    }, [searchParams, fetchWalletData]);

    // Transactions are now grouped using a shared utility
    const displayTransactions = groupTransactions(transactions);
    const filteredTransactions = displayTransactions.filter(tx => txFilter === 'ALL' || tx.transaction_type === txFilter);

    return (
        <div className="relative">
            {/* Background embellishments */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <div className="flex items-center justify-between mt-0 sm:mt-4 mb-6 sticky top-0 bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-xl z-30 p-4 -mx-4 sm:mx-0 sm:p-0 rounded-b-2xl sm:rounded-none border-b border-black/5 dark:border-white/5 sm:border-none shadow-sm sm:shadow-none">
                <div>
                    <h1 className="font-display text-xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">InTrust Wallet</h1>
                    <p className="text-[9px] sm:text-xs text-slate-500 uppercase tracking-widest font-bold mt-0.5">Premium Balance Manager</p>
                </div>
                <button
                    onClick={fetchWalletData}
                    disabled={loading}
                    className="w-10 h-10 flex items-center justify-center bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-full border border-black/5 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-[#D4AF37] transition-all shadow-sm active:scale-95"
                    title="Refresh"
                >
                    <span className={`material-icons-round text-sm ${loading ? 'animate-spin text-[#D4AF37]' : ''}`}>refresh</span>
                </button>
            </div>

            {/* Error */}
            {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-[11px] sm:text-xs flex items-center space-x-3 font-bold shadow-sm">
                    <span className="material-icons-round text-lg">error_outline</span>
                    <span>{error}</span>
                </motion.div>
            )}

            {/* Balance Card - Premium QuickCommerce Style */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1c23] via-[#0f111a] to-[#1a1c23] border border-[#D4AF37]/30 rounded-[2.5rem] p-6 sm:p-10 mb-8 shadow-2xl shadow-[#D4AF37]/5 group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-transparent to-transparent opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col relative z-10 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
                                <span className="material-icons-round text-sm text-[#D4AF37]">account_balance_wallet</span>
                            </div>
                            <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Total Balance</span>
                        </div>

                        <motion.button
                            onClick={handleBalanceTap}
                            whileTap={{ scale: 0.98 }}
                            className="relative flex items-end gap-3 cursor-pointer select-none group/bal w-auto inline-flex"
                            aria-label={balanceRevealed ? 'Hide balance' : 'Reveal balance'}
                        >
                            <AnimatePresence>
                                {tapping && (
                                    <motion.span
                                        key="ripple"
                                        className="absolute inset-[-10px] rounded-2xl bg-[#D4AF37]/10 pointer-events-none"
                                        initial={{ opacity: 0.8, scale: 0.9 }}
                                        animate={{ opacity: 0, scale: 1.2 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                )}
                            </AnimatePresence>

                            {loading ? (
                                <div className="h-10 sm:h-12 w-24 sm:w-32 bg-white/5 animate-pulse rounded-2xl" />
                            ) : (
                                <div className="relative overflow-hidden">
                                    <AnimatePresence mode="wait" initial={false}>
                                        {balanceRevealed ? (
                                            <motion.h2
                                                key="amount"
                                                className="text-4xl sm:text-7xl font-sans font-black text-white tracking-tighter"
                                                initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                                                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                                                exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                            >
                                                ₹{displayBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </motion.h2>
                                        ) : (
                                            <motion.h2
                                                key="dots"
                                                className="text-4xl sm:text-7xl font-sans font-black text-slate-500 tracking-[0.2em] pt-1 sm:pt-2"
                                                initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                                                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                                                exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                            >
                                                ••••••
                                            </motion.h2>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {!loading && (
                                <span className="mb-2 text-slate-500 group-hover/bal:text-[#D4AF37] transition-colors">
                                    {balanceRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
                                </span>
                            )}
                        </motion.button>

                        {!loading && (
                            <p className="text-[10px] font-bold text-[#D4AF37]/50 mt-3 tracking-widest uppercase">
                                {balanceRevealed ? 'Tap to hide securely' : 'Tap to decrypt balance'}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        <button
                            onClick={() => performAction(() => {
                                setShowTopup(true);
                                setShowWithdrawal(false);
                            })}
                            className="w-full px-4 py-4 bg-gradient-to-r from-[#D4AF37] to-[#e6cf73] hover:to-[#D4AF37] text-black font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <span className="material-icons-round text-lg stroke-2">add_circle_outline</span>
                            Add Money
                        </button>
                        <button
                            onClick={() => performAction(() => {
                                setShowWithdrawal(true);
                                setShowTopup(false);
                            })}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-[#D4AF37]/50 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group/btn"
                        >
                            <span className="material-icons-round text-lg text-slate-400 group-hover/btn:text-[#D4AF37] transition-colors">account_balance</span>
                            Withdraw
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Money Panel */}
            {showTopup && user && (
                <div className="mb-8 merchant-glass p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl relative overflow-hidden bg-white/40 dark:bg-black/5">
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={() => setShowTopup(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 transition-colors">
                            <span className="material-icons-round text-sm">close</span>
                        </button>
                    </div>
                    <div className="w-full">
                        <WalletTopup
                            user={user}
                            isMerchant={true}
                            onSuccess={() => {
                                setShowTopup(false);
                                triggerConfetti();
                                fetchWalletData();
                            }}
                            onCancel={() => setShowTopup(false)}
                        />
                    </div>
                </div>
            )}

            {/* Withdrawal Panel */}
            {showWithdrawal && user && (
                <div className="mb-8 merchant-glass p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl relative overflow-hidden bg-white/40 dark:bg-black/5">
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={() => setShowWithdrawal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 transition-colors">
                            <span className="material-icons-round text-sm">close</span>
                        </button>
                    </div>
                    <div className="w-full">
                        {merchantData?.bank_verified ? (
                            <WithdrawalForm
                                merchant={merchantData}
                                onSuccess={() => {
                                    setShowWithdrawal(false);
                                    fetchWalletData();
                                }}
                                onCancel={() => setShowWithdrawal(false)}
                            />
                        ) : (
                            <div className="py-8 text-center">
                                <span className="material-icons-round text-6xl text-amber-500 mb-4 block">account_balance</span>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Bank Account Not Verified</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm mx-auto">
                                    To withdraw funds, verify your bank account in KYC settings first.
                                </p>
                                <a
                                    href="/merchant/settings?tab=bank"
                                    className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[#D4AF37] text-[#020617] font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    <span className="material-icons-round text-base">verified</span>
                                    Verify Bank Account
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transactions Feed - Mobile First UI */}
            <div className="mt-4 mb-20">
                <div className="flex items-center justify-between mb-6 px-1">
                    <h3 className="font-display text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-2 h-6 bg-[#D4AF37] rounded-full"></span>
                        Recent Activity
                    </h3>
                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                        {['ALL', 'CREDIT', 'DEBIT'].map(f => (
                            <button
                                key={f}
                                onClick={() => setTxFilter(f)}
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${txFilter === f ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {f}
                            </button>
                        ))}
                        <button
                            onClick={() => router.push('/merchant/wallet/transactions')}
                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all border border-transparent hover:border-[#D4AF37]/20"
                        >
                            View All
                        </button>
                    </div>
                    {loading && <span className="material-icons-round animate-spin text-slate-400 dark:text-slate-500 text-sm">autorenew</span>}
                </div>

                <div className="flex flex-col gap-3">
                    {filteredTransactions.map((tx) => (
                        <div
                            key={tx.id}
                            onClick={() => router.push(`/merchant/wallet/transactions/${tx.id}?source=${tx.source}`)}
                            className="bg-white/60 dark:bg-[#1a1c23]/80 backdrop-blur-md p-4 flex items-center border border-black/5 dark:border-white/5 rounded-2xl active:scale-95 transition-transform cursor-pointer shadow-sm relative overflow-hidden group"
                        >
                            {/* Hover accent */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border ${tx.transaction_type === 'SETTLEMENT' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' : tx.transaction_type === 'CREDIT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                <span className="material-icons-round text-xl">{tx.transaction_type === 'SETTLEMENT' ? 'account_balance' : tx.transaction_type === 'CREDIT' ? 'south_west' : 'north_east'}</span>
                            </div>

                            <div className="ml-4 flex-1 min-w-0">
                                <h4 className="text-[13px] font-black text-slate-800 dark:text-slate-100 truncate flex items-center justify-between">
                                    <span className="truncate">{tx.transaction_type === 'SETTLEMENT' ? 'Payout Settled to Bank' : (tx.description || tx.reference_type || 'Wallet Transfer')}</span>
                                    <div className={`text-sm tracking-tight ${tx.transaction_type === 'SETTLEMENT' ? 'text-slate-600 dark:text-slate-400' : tx.transaction_type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                                        {tx.transaction_type === 'SETTLEMENT' ? '' : tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                </h4>
                                {tx.transaction_type === 'SETTLEMENT' && (
                                    <p className="text-[10px] text-indigo-600 font-bold mt-1 tracking-wide">
                                        Bank settlement complete - Balance pre-adjusted on request.
                                    </p>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        {new Date(tx.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && filteredTransactions.length === 0 && (
                        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-3xl p-10 mt-4 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mb-4">
                                <span className="material-icons-round text-slate-400 dark:text-slate-500 text-4xl">receipt_long</span>
                            </div>
                            <p className="text-slate-800 dark:text-white font-black text-[15px] mb-1">No Activity Found</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest max-w-[200px]">Top up your wallet to start making transactions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function WalletPage() {
    return (
        <Suspense fallback={
            <div className="p-12 text-center">
                <span className="material-icons-round animate-spin text-[#D4AF37] text-4xl">autorenew</span>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-4">Loading Wallet State...</p>
            </div>
        }>
            <WalletContent />
        </Suspense>
    );
}
