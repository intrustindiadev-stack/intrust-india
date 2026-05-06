'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    IndianRupee, 
    Briefcase, 
    Activity, 
    Search,
    ChevronDown,
    Building2,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AddInvestmentModal({ onClose }) {
    const [loading, setLoading] = useState(false);
    const [merchants, setMerchants] = useState([]);
    const [fetchingMerchants, setFetchingMerchants] = useState(true);
    const [search, setSearch] = useState('');
    
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [amountRupees, setAmountRupees] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        const fetchMerchants = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/admin/merchants', {
                    headers: { Authorization: `Bearer ${session?.access_token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setMerchants(data.merchants || []);
                }
            } catch (err) {
                console.error('Error fetching merchants:', err);
            } finally {
                setFetchingMerchants(false);
            }
        };
        fetchMerchants();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMerchant || !amountRupees) {
            toast.error('Merchant and Amount are required');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/investments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    merchantId: selectedMerchant.id,
                    amountRupees,
                    description
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            toast.success('Investment added successfully');
            onClose(true);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredMerchants = merchants.filter(m => 
        m.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md"
        >
            <div className="absolute inset-0" onClick={() => !loading && onClose(false)} />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-xl shadow-2xl relative z-10 border border-slate-100"
            >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Direct Investment</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Deploy capital to merchant accounts</p>
                    </div>
                    <button 
                        onClick={() => onClose(false)} 
                        className="w-10 h-10 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Merchant Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Merchant</label>
                        {selectedMerchant ? (
                            <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                        {selectedMerchant.business_name[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{selectedMerchant.business_name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedMerchant.user_profiles?.full_name}</p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedMerchant(null)}
                                    className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search by business or name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-2xl bg-white shadow-inner">
                                    {fetchingMerchants ? (
                                        <div className="p-4 text-center text-xs font-bold text-slate-400 animate-pulse">Loading merchants...</div>
                                    ) : filteredMerchants.length > 0 ? (
                                        filteredMerchants.map(m => (
                                            <button 
                                                key={m.id}
                                                type="button"
                                                onClick={() => setSelectedMerchant(m)}
                                                className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                                                    {m.business_name?.[0] || 'M'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{m.business_name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{m.user_profiles?.full_name}</p>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs font-bold text-slate-400">No merchants found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Investment Amount (₹)</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-indigo-500">
                                <IndianRupee size={20} strokeWidth={2.5} />
                            </div>
                            <input 
                                type="number"
                                required
                                placeholder="e.g. 50,000"
                                value={amountRupees}
                                onChange={(e) => setAmountRupees(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-xl font-black focus:border-indigo-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Internal Notes</label>
                        <textarea 
                            placeholder="Reason for deployment..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={() => onClose(false)}
                            disabled={loading}
                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={loading || !selectedMerchant}
                            className="flex-[2] bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? <Activity size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Confirm Deployment</>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
