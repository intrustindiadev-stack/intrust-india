'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, IndianRupee, TrendingUp, Activity, Info, Calendar, 
    Send, MapPin, Tag, AlertTriangle, Save, CheckCircle2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const CATEGORIES = ['FMCG', 'Electronics', 'Pharma', 'Agriculture', 'Logistics', 'Textile', 'Retail', 'General'];

const CITY_SUGGESTIONS = [
    'Mumbai, Maharashtra', 'Delhi, NCR', 'Bengaluru, Karnataka', 'Hyderabad, Telangana',
    'Chennai, Tamil Nadu', 'Kolkata, West Bengal', 'Pune, Maharashtra', 'Ahmedabad, Gujarat',
    'Jaipur, Rajasthan', 'Surat, Gujarat', 'Lucknow, Uttar Pradesh', 'Kanpur, Uttar Pradesh',
    'Nagpur, Maharashtra', 'Indore, Madhya Pradesh', 'Thane, Maharashtra', 'Bhopal, Madhya Pradesh',
    'Visakhapatnam, Andhra Pradesh', 'Pimpri-Chinchwad, Maharashtra', 'Patna, Bihar', 'Vadodara, Gujarat',
];

export default function FeedOrderModal({ 
    investment, 
    order = null, 
    mode = 'create', // 'create' | 'edit'
    onClose 
}) {
    const isEditMode = mode === 'edit' || Boolean(order?.id);

    // Initial state setup
    const initialValues = useMemo(() => {
        if (isEditMode && order) {
            return {
                orderDetails: order.order_details || '',
                amountRupees: order.amount_paise ? (order.amount_paise / 100).toString() : '',
                profitRupees: order.profit_paise ? (order.profit_paise / 100).toString() : '',
                orderDate: order.order_date ? order.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
                location: order.location || '',
                category: order.category || 'FMCG',
            };
        }
        return {
            orderDetails: '',
            amountRupees: '',
            profitRupees: '',
            orderDate: new Date().toISOString().split('T')[0],
            location: '',
            category: 'FMCG',
        };
    }, [isEditMode, order]);

    const [loading, setLoading] = useState(false);
    const [orderDetails, setOrderDetails] = useState(initialValues.orderDetails);
    const [amountRupees, setAmountRupees] = useState(initialValues.amountRupees);
    const [profitRupees, setProfitRupees] = useState(initialValues.profitRupees);
    const [orderDate, setOrderDate] = useState(initialValues.orderDate);
    const [location, setLocation] = useState(initialValues.location);
    const [category, setCategory] = useState(initialValues.category);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

    // Check if form has unsaved modifications
    const isDirty = useMemo(() => {
        return (
            orderDetails !== initialValues.orderDetails ||
            amountRupees !== initialValues.amountRupees ||
            profitRupees !== initialValues.profitRupees ||
            orderDate !== initialValues.orderDate ||
            location !== initialValues.location ||
            category !== initialValues.category
        );
    }, [orderDetails, amountRupees, profitRupees, orderDate, location, category, initialValues]);

    const filteredCities = CITY_SUGGESTIONS.filter(
        c => c.toLowerCase().includes(location.toLowerCase()) && location.length > 0
    );

    const handleAttemptClose = () => {
        if (loading) return;
        if (isDirty) {
            setShowDiscardPrompt(true);
        } else {
            onClose(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!orderDetails?.trim() || !amountRupees || profitRupees === undefined || profitRupees === '') {
            toast.error('All fields are required');
            return;
        }

        const amt = Number(amountRupees);
        const pft = Number(profitRupees);
        if (isNaN(amt) || amt < 0 || isNaN(pft) || pft < 0) {
            toast.error('Please enter valid positive numbers for order amount and profit');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${session?.access_token || ''}` 
            };

            if (isEditMode && order?.id) {
                // EDIT MODE: PATCH existing row, strictly replacing profit_paise
                const res = await fetch('/api/admin/investment-orders', {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        orderId: order.id,
                        investmentId: investment.id,
                        orderDetails: orderDetails.trim(),
                        amountRupees: amt,
                        profitRupees: pft,
                        orderDate: new Date(orderDate).toISOString(),
                        location: location.trim(),
                        category,
                    })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Failed to update simulated order');

                toast.success('Simulated order updated successfully!');
                onClose(true);
            } else {
                // CREATE MODE: POST new row
                const res = await fetch('/api/admin/investment-orders', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        mode: 'create',
                        investmentId: investment.id,
                        orderDetails: orderDetails.trim(),
                        amountRupees: amt,
                        profitRupees: pft,
                        orderDate: new Date(orderDate).toISOString(),
                        location: location.trim(),
                        category,
                    })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Failed to commit simulated order');

                toast.success('Simulated order committed successfully!');
                onClose(true);
            }
        } catch (err) {
            console.error('Simulated order submit error:', err);
            toast.error(err.message || 'Error saving order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md"
        >
            <div className="absolute inset-0" onClick={handleAttemptClose} />

            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 w-full max-w-lg shadow-2xl relative z-10 border border-slate-100 max-h-[92vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-5 sm:mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2.5 h-2.5 rounded-full ${isEditMode ? 'bg-amber-500' : 'bg-indigo-600'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {isEditMode ? 'Simulated Order Editor' : 'Simulated Order Feed'}
                            </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {isEditMode ? 'Edit Simulated Order' : 'Feed Simulated Order'}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                            {isEditMode ? 'UPDATE PERFORMANCE DATA' : 'PERFORMANCE REPORTING FOR MERCHANT'}
                        </p>
                    </div>
                    <button 
                        type="button"
                        onClick={handleAttemptClose} 
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Edit Context Banner (if in edit mode) */}
                {isEditMode && order && (
                    <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 mb-5 shadow-xs">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
                                    Editing Order #{order.id.slice(0, 8)}
                                </p>
                                <p className="text-sm font-black text-slate-900 mt-0.5">
                                    {investment.merchant?.business_name || 'Merchant'}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                    {initialValues.category} • {new Date(initialValues.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Current Profit</p>
                                <p className="text-base font-black text-emerald-600">
                                    ₹{(order.profit_paise / 100).toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Merchant & Model Overview (in create mode) */}
                {!isEditMode && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 font-black">
                                {investment.merchant?.business_name?.[0] || 'M'}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Target Merchant</p>
                                <p className="text-sm font-black text-slate-800">{investment.merchant?.business_name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Growth Plan</p>
                            <p className="text-sm font-black text-slate-900">₹{(investment.amount_paise / 100).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {/* Date + Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Order Date</label>
                            <div className="relative">
                                <Calendar size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input 
                                    type="date" 
                                    required 
                                    value={orderDate} 
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all" 
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                            <div className="relative">
                                <Tag size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select 
                                    value={category} 
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all appearance-none"
                                >
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Location (City)</label>
                        <div className="relative">
                            <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
                            <input 
                                type="text" 
                                placeholder="e.g. Mumbai, Maharashtra"
                                value={location} 
                                onChange={(e) => { setLocation(e.target.value); setShowCitySuggestions(true); }}
                                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                                onFocus={() => setShowCitySuggestions(true)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all" 
                            />
                        </div>
                        {showCitySuggestions && filteredCities.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-[160px] overflow-y-auto">
                                {filteredCities.map(city => (
                                    <button 
                                        key={city} 
                                        type="button" 
                                        onMouseDown={() => { setLocation(city); setShowCitySuggestions(false); }}
                                        className="w-full text-left px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                    >
                                        📍 {city}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Order Amount + Profit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Order Amount (₹)</label>
                            <div className="relative">
                                <IndianRupee size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                                <input 
                                    type="number" 
                                    required 
                                    min="0"
                                    step="1"
                                    placeholder="Order Value" 
                                    value={amountRupees}
                                    onChange={(e) => setAmountRupees(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-black focus:border-indigo-500 focus:bg-white outline-none transition-all" 
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                {isEditMode ? 'New Profit (₹)' : 'Profit (₹)'}
                            </label>
                            <div className="relative">
                                <TrendingUp size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                                <input 
                                    type="number" 
                                    required 
                                    min="0"
                                    step="1"
                                    placeholder="Simulated Profit" 
                                    value={profitRupees}
                                    onChange={(e) => setProfitRupees(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-black text-emerald-600 focus:border-emerald-500 focus:bg-white outline-none transition-all" 
                                />
                            </div>
                            {isEditMode && initialValues.profitRupees && Number(profitRupees) !== Number(initialValues.profitRupees) && (
                                <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1">
                                    Replaces ₹{Number(initialValues.profitRupees).toLocaleString('en-IN')} with ₹{Number(profitRupees || 0).toLocaleString('en-IN')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Order Details Brief */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Order Brief</label>
                        <textarea 
                            required 
                            placeholder="e.g. Bulk procurement: 200x Premium Skincare Kits for retail chain..."
                            value={orderDetails} 
                            onChange={(e) => setOrderDetails(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[80px] resize-none" 
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-3">
                        <button 
                            type="button" 
                            onClick={handleAttemptClose} 
                            disabled={loading}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3.5 rounded-2xl text-[11px] uppercase tracking-widest transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`flex-[2] font-black py-3.5 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-white ${
                                isEditMode 
                                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                            }`}
                        >
                            {loading ? (
                                <Activity size={16} className="animate-spin" />
                            ) : isEditMode ? (
                                <><Save size={15} /> Save Changes</>
                            ) : (
                                <><Send size={15} /> Commit Order</>
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2.5">
                    <div className="p-1 bg-amber-50 rounded-lg text-amber-500 shrink-0">
                        <Info size={12} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        {isEditMode 
                            ? 'Editing this simulated order updates the performance tracking for this plan. The simulated profit value replaces the previous entry.'
                            : 'This represents capital utilization shown to the merchant. It does not deduct their actual wallet balance.'}
                    </p>
                </div>
            </motion.div>

            {/* Dirty State Discard Confirmation Dialog */}
            <AnimatePresence>
                {showDiscardPrompt && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70"
                    >
                        <motion.div 
                            initial={{ scale: 0.92, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.92, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-900">Discard changes?</h4>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    You have unsaved changes to this simulated order. Closing will lose your modifications.
                                </p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowDiscardPrompt(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowDiscardPrompt(false);
                                        onClose(false);
                                    }}
                                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-200"
                                >
                                    Discard Changes
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
