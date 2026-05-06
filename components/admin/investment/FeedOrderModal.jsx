'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    IndianRupee, 
    TrendingUp, 
    Activity, 
    Info, 
    Calendar,
    Send,
    Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FeedOrderModal({ investment, onClose }) {
    const [loading, setLoading] = useState(false);
    const [orderDetails, setOrderDetails] = useState('');
    const [amountRupees, setAmountRupees] = useState('');
    const [profitRupees, setProfitRupees] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!orderDetails || !amountRupees || !profitRupees) {
            toast.error('All fields are required');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/investment-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    investmentId: investment.id,
                    orderDetails,
                    amountRupees,
                    profitRupees,
                    orderDate: new Date(orderDate).toISOString()
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            toast.success('Order feed submitted successfully');
            onClose(true);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Feed Simulated Order</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Investment performance reporting</p>
                    </div>
                    <button 
                        onClick={() => onClose(false)} 
                        className="w-10 h-10 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-8 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                        <Package size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Merchant Profile</p>
                        <p className="text-sm font-black text-slate-800">{investment.merchant?.business_name}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Date</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                                    <Calendar size={16} />
                                </div>
                                <input 
                                    type="date"
                                    required
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Amount (₹)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-indigo-500">
                                    <IndianRupee size={16} />
                                </div>
                                <input 
                                    type="number"
                                    required
                                    placeholder="Order Value"
                                    value={amountRupees}
                                    onChange={(e) => setAmountRupees(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm font-black focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Merchant Profit Share (₹)</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-emerald-500">
                                <TrendingUp size={16} />
                            </div>
                            <input 
                                type="number"
                                required
                                placeholder="Profit Amount"
                                value={profitRupees}
                                onChange={(e) => setProfitRupees(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm font-black focus:border-indigo-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Brief / SKU Details</label>
                        <textarea 
                            required
                            placeholder="e.g. Bulk Procurement: 50x Premium Skincare Kits..."
                            value={orderDetails}
                            onChange={(e) => setOrderDetails(e.target.value)}
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
                            disabled={loading}
                            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? <Activity size={16} className="animate-spin" /> : <><Send size={14} /> Commit Order Feed</>}
                        </button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-50 flex items-start gap-3">
                    <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500 shrink-0">
                        <Info size={14} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                        Commitment represents capital utilization for the merchant's view. This does not deduct actual wallet balance but reflects operational movement.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}
