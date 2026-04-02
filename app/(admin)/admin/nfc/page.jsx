'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Package, Truck, CheckCircle2, XCircle, Clock, 
    TrendingUp, DollarSign, Search, Settings, 
    RefreshCw, ChevronRight, User, MapPin, 
    Phone, CreditCard, Layers, Save, AlertCircle, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { generateOrderInvoice } from '@/lib/invoiceGenerator';
import { Download } from 'lucide-react';

const STATUS_CONFIG = {
    pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: Clock },
    processing: { label: "Processing", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: RefreshCw },
    shipped: { label: "Shipped", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", icon: Truck },
    delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-500", bg: "bg-red-50", border: "border-red-200", icon: XCircle },
};

const STATUS_FLOW = ["pending", "processing", "shipped", "delivered"];

export default function NFCAdminPage() {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [cardPrice, setCardPrice] = useState(999);
    const [gstPercentage, setGstPercentage] = useState(18);
    const [deliveryPrice, setDeliveryPrice] = useState(50);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch Orders
                const { data: oData, error: oError } = await supabase
                    .from('nfc_orders')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (oError) throw oError;
                setOrders(oData || []);

                // Fetch Settings
                const { data: sData, error: sError } = await supabase
                    .from('nfc_settings')
                    .select('*');
                
                if (sData && !sError) {
                    const priceSet = sData.find(s => s.key === 'card_price_paise');
                    const gstSet = sData.find(s => s.key === 'nfc_gst_percentage');
                    const delSet = sData.find(s => s.key === 'nfc_delivery_price_paise');
                    
                    if (priceSet) setCardPrice(parseInt(priceSet.value) / 100);
                    if (gstSet) setGstPercentage(parseInt(gstSet.value));
                    if (delSet) setDeliveryPrice(parseInt(delSet.value) / 100);
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to fetch settings.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const updateSettings = async () => {
        try {
            const updates = [
                { key: 'card_price_paise', value: (cardPrice * 100).toString(), updated_at: new Date() },
                { key: 'nfc_gst_percentage', value: gstPercentage.toString(), updated_at: new Date() },
                { key: 'nfc_delivery_price_paise', value: (deliveryPrice * 100).toString(), updated_at: new Date() }
            ];

            const { error } = await supabase
                .from('nfc_settings')
                .upsert(updates);
            
            if (error) throw error;
            toast.success("All settings updated.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update settings.");
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            const { error } = await supabase
                .from('nfc_orders')
                .update({ status: newStatus, updated_at: new Date() })
                .eq('id', orderId);

            if (error) throw error;
            
            toast.success(`Success: ${newStatus}`);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } catch (err) {
            console.error(err);
            toast.error("Status Update Failed.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDownloadInvoice = (order) => {
        try {
            generateOrderInvoice({
                order: {
                    id: order.id,
                    created_at: order.created_at,
                    customer_name: order.card_holder_name,
                    delivery_address: order.delivery_address,
                    customer_phone: order.phone,
                    sale_price_paise: order.sale_price_paise,
                    delivery_fee_paise: 50 * 100 // Rs. 50 as per breakdown logic
                },
                type: 'nfc',
                seller: {
                    name: 'InTrust Financial Services (India) Pvt. Ltd.',
                    address: 'Nexus Building, HSR Layout, Bangalore - 560102',
                    phone: '+91 800-INTRUST',
                    gstin: '29AAACI1234A1Z5'
                }
            });
            toast.success("Invoice generated successfully");
        } catch (err) {
            console.error("Invoice Error:", err);
            toast.error("Failed to generate invoice");
        }
    };

    const filteredOrders = useMemo(() => orders.filter(o => 
        (o.card_holder_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.phone || "").toLowerCase().includes(searchQuery.toLowerCase())
    ), [orders, searchQuery]);

    const stats = useMemo(() => ({
        total: orders.length,
        revenue: orders.reduce((sum, o) => sum + (Number(o.sale_price_paise) || 0), 0) / 100,
        pending: orders.filter(o => o.status === 'pending').length
    }), [orders]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
            <RefreshCw size={32} className="animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfdfe] dark:bg-black lg:p-10 p-4 font-[family-name:var(--font-outfit)]">
            <header className="max-w-7xl mx-auto mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                            <Layers size={12} /> NEXUS ADMIN PANEL
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
                            NFC <span className="text-blue-600">Dashboard.</span>
                        </h1>
                    </div>
                    
                    <div className="flex bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1.5 rounded-3xl shadow-sm">
                        <button 
                            onClick={() => setActiveTab('orders')}
                            className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-slate-950 dark:bg-white text-white dark:text-black shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Recent Orders
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-slate-950 dark:bg-white text-white dark:text-black shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Card Settings
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "Total Sale", value: `₹${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10" },
                        { label: "Total Orders", value: stats.total, icon: Package, color: "text-purple-600", bg: "bg-purple-500/10" },
                        { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
                        { label: "Card Price", value: `₹${cardPrice.toLocaleString()}`, icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-white/[0.03] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 shadow-sm overflow-hidden relative group">
                            <s.icon size={24} className={`mb-6 ${s.color}`} />
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{s.value}</p>
                            <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-2">{s.label}</p>
                        </div>
                    ))}
                </div>
            </header>

            <main className="max-w-7xl mx-auto relative z-10 pb-20">
                <AnimatePresence mode="wait">
                    {activeTab === 'orders' ? (
                        <motion.div 
                            key="orders"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="relative mb-10">
                                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search Orders by Name or Phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-16 pr-8 py-6 rounded-[2.5rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-[12px] focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-sm text-slate-950 dark:text-white shadow-inner"
                                />
                            </div>

                            {filteredOrders.length === 0 ? (
                                <div className="py-40 text-center bg-white dark:bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                                    <Package size={64} className="mx-auto text-slate-200 dark:text-gray-800 mb-6" />
                                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Orders Yet</h3>
                                </div>
                            ) : (
                                filteredOrders.map((o, idx) => {
                                    const status = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                                    const isExpanded = expandedOrder === o.id;
                                    return (
                                        <div key={o.id} className="relative group">
                                            <div 
                                                onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                                                className={`bg-white dark:bg-white/[0.03] rounded-[2.5rem] border ${isExpanded ? 'border-blue-500/30 shadow-2xl' : 'border-slate-200 dark:border-white/5'} p-6 cursor-pointer hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500`}
                                            >
                                                <div className="flex items-center justify-between gap-6">
                                                    <div className="flex items-center gap-6 flex-1 min-w-0">
                                                        <div className={`w-16 h-16 rounded-2xl ${status.bg} ${status.color} flex items-center justify-center shadow-inner shrink-0 group-hover:rotate-6 transition-transform duration-500`}>
                                                            <status.icon size={28} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">ORDER_ID // {o.id.slice(0, 8).toUpperCase()}</p>
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate uppercase leading-none">{o.card_holder_name}</h3>
                                                            <p className="text-xs font-bold text-slate-400 mt-2">{o.phone}</p>
                                                        </div>
                                                    </div>
                                                    <div className="hidden sm:block text-right">
                                                        <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">₹{(Number(o.sale_price_paise) / 100).toLocaleString()}</p>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${o.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{o.payment_status}</span>
                                                    </div>
                                                    <div className={`p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <ChevronRight size={18} />
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div 
                                                            initial={{ height: 0, opacity: 0 }} 
                                                            animate={{ height: "auto", opacity: 1 }} 
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-10 grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-slate-100 dark:border-white/5 mt-6">
                                                                <div className="space-y-6">
                                                                    <div>
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                            <MapPin size={14} className="text-red-500" /> Delivery Address
                                                                        </h4>
                                                                        <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                                                                            <p className="text-sm font-bold text-slate-700 dark:text-gray-300 leading-relaxed uppercase tracking-tight">{o.delivery_address}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-500/10">
                                                                        <AlertCircle size={18} className="text-amber-600" />
                                                                        <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-tight">Print name exactly as shown above.</p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-6">
                                                                    <div>
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                            <RefreshCw size={14} className="text-blue-500" /> Update Order Status
                                                                        </h4>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            {STATUS_FLOW.map(s => (
                                                                                <button
                                                                                    key={s}
                                                                                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(o.id, s); }}
                                                                                    disabled={updatingId === o.id}
                                                                                    className={`px-4 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${o.status === s 
                                                                                        ? "bg-slate-950 dark:bg-white text-white dark:text-black border-slate-950 dark:border-white shadow-xl" 
                                                                                        : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-400"
                                                                                    }`}
                                                                                >
                                                                                    {STATUS_CONFIG[s].label}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(o.id, 'cancelled'); }}
                                                                        className="w-full py-4 rounded-2xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/10 font-black text-[9px] uppercase tracking-[0.3em] transition-all"
                                                                    >
                                                                        Cancel Order
                                                                    </button>

                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(o); }}
                                                                        className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                                                                    >
                                                                        <Download size={14} /> Download Invoice
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="settings"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="max-w-2xl mx-auto"
                        >
                            <div className="p-8 sm:p-10 rounded-[3rem] bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden group">
                                <div className="absolute -inset-24 bg-blue-600/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-blue-600/10 transition-colors duration-1000" />
                                <Settings size={120} className="absolute -right-10 -bottom-10 opacity-5 group-hover:rotate-90 transition-transform duration-1000" />
                                <h3 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight mb-10 leading-none uppercase">Card Settings.</h3>
                                
                                <div className="space-y-8 relative z-10">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-6">Base Price (₹)</label>
                                            <div className="relative group">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                                    <CreditCard size={20} />
                                                </div>
                                                <input 
                                                    type="number"
                                                    value={cardPrice}
                                                    onChange={(e) => setCardPrice(parseInt(e.target.value))}
                                                    className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 outline-none focus:ring-[12px] focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-lg text-slate-950 dark:text-white shadow-inner"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-6">GST (%)</label>
                                            <div className="relative group">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                                    <DollarSign size={20} />
                                                </div>
                                                <input 
                                                    type="number"
                                                    value={gstPercentage}
                                                    onChange={(e) => setGstPercentage(parseInt(e.target.value))}
                                                    className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 outline-none focus:ring-[12px] focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-lg text-slate-950 dark:text-white shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-6">Delivery Price (₹)</label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                                <Truck size={20} />
                                            </div>
                                            <input 
                                                type="number"
                                                value={deliveryPrice}
                                                onChange={(e) => setDeliveryPrice(parseInt(e.target.value))}
                                                className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 outline-none focus:ring-[12px] focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-lg text-slate-950 dark:text-white shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-[2rem] bg-blue-500/5 border border-blue-500/10 space-y-3">
                                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            <span>Subtotal</span>
                                            <span>₹{cardPrice}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            <span>GST ({gstPercentage}%)</span>
                                            <span>₹{(cardPrice * gstPercentage / 100).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            <span>Delivery</span>
                                            <span>₹{deliveryPrice}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-blue-500/10">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">Total Price</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">₹{(cardPrice + (cardPrice * gstPercentage / 100) + deliveryPrice).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={updateSettings}
                                        className="w-full py-6 rounded-[2rem] bg-blue-600 text-white font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        Update All Settings <Save size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
