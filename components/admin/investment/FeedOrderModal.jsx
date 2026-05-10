'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { X, IndianRupee, TrendingUp, Activity, Info, Calendar, Send, Package, MapPin, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';

const CATEGORIES = ['FMCG', 'Electronics', 'Pharma', 'Agriculture', 'Logistics', 'Textile', 'Retail', 'General'];

const CITY_SUGGESTIONS = [
    'Mumbai, Maharashtra', 'Delhi, NCR', 'Bengaluru, Karnataka', 'Hyderabad, Telangana',
    'Chennai, Tamil Nadu', 'Kolkata, West Bengal', 'Pune, Maharashtra', 'Ahmedabad, Gujarat',
    'Jaipur, Rajasthan', 'Surat, Gujarat', 'Lucknow, Uttar Pradesh', 'Kanpur, Uttar Pradesh',
    'Nagpur, Maharashtra', 'Indore, Madhya Pradesh', 'Thane, Maharashtra', 'Bhopal, Madhya Pradesh',
    'Visakhapatnam, Andhra Pradesh', 'Pimpri-Chinchwad, Maharashtra', 'Patna, Bihar', 'Vadodara, Gujarat',
];

export default function FeedOrderModal({ investment, onClose }) {
    const [loading, setLoading] = useState(false);
    const [orderDetails, setOrderDetails] = useState('');
    const [amountRupees, setAmountRupees] = useState('');
    const [profitRupees, setProfitRupees] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [location, setLocation] = useState('');
    const [category, setCategory] = useState('FMCG');
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);

    const filteredCities = CITY_SUGGESTIONS.filter(c => c.toLowerCase().includes(location.toLowerCase()) && location.length > 0);

    // No auto-suggestion as it's purely profit-sharing now
    const autoProfitSuggestion = null;

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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    investmentId: investment.id,
                    orderDetails,
                    amountRupees,
                    profitRupees,
                    orderDate: new Date(orderDate).toISOString(),
                    location,
                    category,
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            toast.success('Order feed committed!');
            onClose(true);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="absolute inset-0" onClick={() => !loading && onClose(false)} />

            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl relative z-10 border border-slate-100 max-h-[90vh] overflow-y-auto">

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Feed Simulated Order</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Performance reporting for merchant</p>
                    </div>
                    <button onClick={() => onClose(false)} className="w-10 h-10 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* Merchant Info */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 font-black">
                            {investment.merchant?.business_name?.[0] || 'M'}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Merchant</p>
                            <p className="text-sm font-black text-slate-800">{investment.merchant?.business_name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Model</p>
                        <p className="text-sm font-black text-emerald-600">Profit Sharing</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Date + Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Date</label>
                            <div className="relative">
                                <Calendar size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input type="date" required value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                            <div className="relative">
                                <Tag size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select value={category} onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all appearance-none">
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2 relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location (City)</label>
                        <div className="relative">
                            <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
                            <input type="text" placeholder="e.g. Mumbai, Maharashtra"
                                value={location} onChange={(e) => { setLocation(e.target.value); setShowCitySuggestions(true); }}
                                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                                onFocus={() => setShowCitySuggestions(true)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all" />
                        </div>
                        {showCitySuggestions && filteredCities.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-[160px] overflow-y-auto">
                                {filteredCities.map(city => (
                                    <button key={city} type="button" onMouseDown={() => { setLocation(city); setShowCitySuggestions(false); }}
                                        className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                        📍 {city}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Order Amount + Profit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Amount (₹)</label>
                            <div className="relative">
                                <IndianRupee size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                                <input type="number" required placeholder="Order Value" value={amountRupees}
                                    onChange={(e) => setAmountRupees(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-black focus:border-indigo-500 focus:bg-white outline-none transition-all" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profit (₹)</label>
                                {autoProfitSuggestion && (
                                    <button type="button" onClick={() => setProfitRupees(autoProfitSuggestion)}
                                        className="text-[9px] font-black text-emerald-600 hover:underline uppercase tracking-widest">
                                        Auto: ₹{autoProfitSuggestion}
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <TrendingUp size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                                <input type="number" required placeholder="Profit Share" value={profitRupees}
                                    onChange={(e) => setProfitRupees(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-black focus:border-emerald-500 focus:bg-white outline-none transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Brief</label>
                        <textarea required placeholder="e.g. Bulk procurement: 200x Premium Skincare Kits for retail chain..."
                            value={orderDetails} onChange={(e) => setOrderDetails(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[90px] resize-none" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => onClose(false)} disabled={loading}
                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50">
                            {loading ? <Activity size={16} className="animate-spin" /> : <><Send size={14} /> Commit Order</>}
                        </button>
                    </div>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-50 flex items-start gap-3">
                    <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500 shrink-0">
                        <Info size={13} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                        This represents capital utilization shown to the merchant. It does not deduct their actual wallet balance.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}
