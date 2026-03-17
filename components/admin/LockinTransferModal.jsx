'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Percent, Clock, CheckCircle, Loader2, Info, Search, Building2, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function LockinTransferModal({ onClose }) {
    const supabase = createClient();

    const [merchants, setMerchants] = useState([]);
    const [loadingMerchants, setLoadingMerchants] = useState(true);
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('12');
    const [periodMonths, setPeriodMonths] = useState('12');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);

    // Fetch approved merchants
    useEffect(() => {
        const fetchMerchants = async () => {
            setLoadingMerchants(true);
            try {
                const { data, error } = await supabase
                    .from('merchants')
                    .select('id, business_name, user_id, user_profiles(full_name, email)')
                    .eq('status', 'approved');
                
                if (error) throw error;
                setMerchants(data || []);
            } catch (err) {
                console.error('Error fetching merchants:', err);
                toast.error('Could not load merchant registry');
            } finally {
                setLoadingMerchants(false);
            }
        };
        fetchMerchants();
    }, [supabase]);

    const filteredMerchants = merchants.filter(m => 
        m.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const parsedAmount = Number(amount) || 0;
    const parsedInterest = Number(interestRate) || 0;
    const parsedPeriod = parseInt(periodMonths, 10) || 0;

    const projectedInterest = (parsedAmount * (parsedInterest / 100) * (parsedPeriod / 12));
    const totalRelease = parsedAmount + projectedInterest;

    const formValid = selectedMerchant && parsedAmount > 0 && parsedInterest >= 0 && parsedPeriod > 0;

    const handleSubmit = async () => {
        if (!formValid) return;
        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Auth session invalid');

            const res = await fetch('/api/admin/lockin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    merchantId: selectedMerchant.id,
                    amountRupees: parsedAmount,
                    interestRate: parsedInterest,
                    periodMonths: parsedPeriod,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');

            setSuccess(data);
            toast.success('Capital deployed successfully');
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => !loading && onClose(!!success)} />

            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-100">
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Deploy Capital
                        </h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                            Contract Setup & Liquidity Transfer
                        </p>
                    </div>
                    <button
                        onClick={() => !loading && onClose(!!success)}
                        className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all relative z-10"
                    >
                        <X size={20} />
                    </button>
                    {/* Abstract Header Decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {success ? (
                        <div className="text-center py-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 mx-auto rounded-[2rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-inner">
                                <CheckCircle size={40} className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Transaction Verified</h3>
                                <p className="text-slate-500 text-sm font-medium mt-2 max-w-xs mx-auto">
                                    Investment ledger has been updated for <span className="font-bold text-slate-900 italic">{selectedMerchant.business_name}</span>.
                                </p>
                            </div>
                            
                            <div className="bg-slate-50 rounded-[2.5rem] p-8 grid grid-cols-2 gap-y-6 gap-x-8 text-left border border-slate-100">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Released On</p>
                                    <p className="text-sm font-bold text-slate-900">{new Date(success.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: 'numeric' })}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Released On</p>
                                    <p className="text-sm font-bold text-slate-900">{new Date(success.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: 'numeric' })}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth Reward</p>
                                    <p className="text-sm font-bold text-blue-600">{parsedInterest}% Bonus</p>
                                </div>
                                <div className="col-span-2 h-px bg-slate-200/50" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Maturity Unlock Value</p>
                                    <p className="text-2xl font-bold text-slate-900 text-right tracking-tight">₹{totalRelease.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => onClose(true)}
                                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group"
                            >
                                Back to Manager
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Merchant Selection */}
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step 01</label>
                                    <h4 className="text-sm font-bold text-slate-900">Partner Merchant</h4>
                                </div>
                                
                                {selectedMerchant ? (
                                    <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/30 relative flex items-center gap-4 animate-in fade-in slide-in-from-left-2 transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-200">
                                            {selectedMerchant.business_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 tracking-tight">{selectedMerchant.business_name}</p>
                                            <p className="text-xs text-slate-500 font-medium italic">Acc: {selectedMerchant.user_profiles?.full_name}</p>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedMerchant(null)}
                                            className="ml-auto p-1.5 text-slate-400 hover:text-slate-900 bg-white border border-slate-100 rounded-lg shadow-sm transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input 
                                                type="text"
                                                placeholder="Search registry..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="border border-slate-100 rounded-2xl divide-y divide-slate-50 max-h-[240px] overflow-y-auto bg-slate-50/50">
                                            {loadingMerchants ? (
                                                <div className="p-8 text-center flex flex-col items-center gap-2">
                                                    <Loader2 size={24} className="animate-spin text-slate-300" />
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Synchronizing...</p>
                                                </div>
                                            ) : filteredMerchants.length > 0 ? (
                                                filteredMerchants.map(merchant => (
                                                    <button
                                                        key={merchant.id}
                                                        onClick={() => setSelectedMerchant(merchant)}
                                                        className="w-full p-4 text-left hover:bg-white flex items-center gap-4 group transition-all"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 flex items-center justify-center text-sm font-bold transition-all shadow-sm">
                                                            {merchant.business_name[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{merchant.business_name}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium italic">{merchant.user_profiles?.full_name}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-10 text-center flex flex-col items-center gap-2 opacity-40">
                                                    <Building2 size={32} strokeWidth={1} />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Registry Empty</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Terms Section */}
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step 02</label>
                                    <h4 className="text-sm font-bold text-slate-900">Contract Parameters</h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative group">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Partnership Capital (₹)</p>
                                        <div className="relative">
                                            <Wallet size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                            <input 
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-100 focus:border-slate-900 bg-slate-50 focus:bg-white outline-none text-2xl font-bold text-slate-900 transition-all tracking-tight"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Retention Bonus (%)</p>
                                            <div className="relative">
                                                <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
                                                <input 
                                                    type="number"
                                                    value={interestRate}
                                                    onChange={(e) => setInterestRate(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 outline-none text-sm font-bold text-slate-900"
                                                />
                                            </div>
                                        </div>
                                        <div className="group">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tenure (Months)</p>
                                            <div className="relative">
                                                <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
                                                <input 
                                                    type="number"
                                                    value={periodMonths}
                                                    onChange={(e) => setPeriodMonths(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 outline-none text-sm font-bold text-slate-900"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Box */}
                                <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth Summary</span>
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                 <TrendingUp size={14} className="text-blue-400" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 font-medium">Bonus Accrual</span>
                                                <span className="font-bold text-emerald-400">+₹{projectedInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 font-medium">Unlock Date</span>
                                                <span className="font-bold text-blue-100">
                                                    {new Date(new Date().setMonth(new Date().getMonth() + (parsedPeriod || 0))).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="pt-4 mt-2 border-t border-white/5 flex justify-between items-end">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unlock Value</span>
                                                <span className="text-2xl font-bold text-white tracking-tight">₹{totalRelease.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Abstract Decoration */}
                                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full translate-y-8 translate-x-8" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!success && (
                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                <Info size={14} />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
                                Secured Asset <br /> Liquidity Protocol
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => onClose(false)}
                                className="px-6 py-3 rounded-xl text-slate-600 font-bold text-sm hover:text-slate-900 transition-all disabled:opacity-50"
                                disabled={loading}
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!formValid || loading}
                                className="px-10 py-3 rounded-[1.25rem] bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-20 disabled:grayscale flex items-center gap-2 group"
                            >
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        Deploy Capital
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
