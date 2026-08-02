"use client";

import React, { useState, useMemo } from "react";
import {
    Package,
    MapPin,
    Clock,
    ChevronLeft,
    Store,
    Phone,
    CheckCircle2,
    Truck,
    ShoppingBag,
    HelpCircle,
    Download,
    AlertCircle,
    Calendar,
    X,
    RotateCcw,
    Star,
    TrendingUp,
    Zap
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabaseClient";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";

const OrderDetailsClient = ({ order, orderType, userId, customerProfile }) => {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const supabase = useMemo(() => createClient(), []);
    
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Rating State
    const initialRating = order.merchant_ratings?.[0]?.rating_value || 0;
    const [rating, setRating] = useState(initialRating);
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    const isShopping = orderType === 'shopping' || !orderType;
    const isNfc = orderType === 'nfc';
    const isGiftCard = orderType === 'giftcard' || orderType === 'udhari_giftcard';
    const isSolar = orderType === 'solar';

    // Normalize NFC to look like shopping items
    const items = isShopping ? (order.shopping_order_items || []) : isNfc ? [{
        id: 'nfc-item',
        shopping_products: { title: `${order.card_holder_name || 'NFC'} Business Card`, mrp_paise: order.regular_price_paise || order.sale_price_paise, gst_percentage: 18 },
        unit_price_paise: order.sale_price_paise,
        quantity: 1
    }] : [];

    const status = isNfc ? order.status : (isShopping ? order.delivery_status : order.payment_status) || 'pending';

    // Status check logic
    const steps = isNfc ? [
        { label: 'Ordered', icon: ShoppingBag, key: 'pending' },
        { label: 'Processing', icon: Package, key: 'processing' },
        { label: 'Shipped', icon: Truck, key: 'shipped' },
        { label: 'Delivered', icon: CheckCircle2, key: 'delivered' }
    ] : [
        { label: 'Ordered', icon: ShoppingBag, key: 'pending' },
        { label: 'Packed', icon: Package, key: 'packed' },
        { label: 'Shipped', icon: Truck, key: 'shipped' },
        { label: 'Delivered', icon: CheckCircle2, key: 'delivered' }
    ];

    const currentStepIndex = steps.findIndex(s => s.key === status);
    const isCancelled = status === 'cancelled';

    // Bill summary
    const billDetails = items.reduce((acc, item) => {
        const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || item.unit_price_paise;
        const gstRate = item.shopping_products?.gst_percentage || 0;
        const gstAmount = item.gst_amount_paise || Math.round((item.unit_price_paise * item.quantity) * gstRate / 100);
        
        acc.mrpTotal += (mrp * item.quantity);
        acc.sellingTotal += (item.unit_price_paise * item.quantity);
        acc.gstTotal += gstAmount;
        return acc;
    }, { mrpTotal: 0, sellingTotal: 0, gstTotal: 0 });

    const totalDiscount = billDetails.mrpTotal > billDetails.sellingTotal ? billDetails.mrpTotal - billDetails.sellingTotal : 0;
    const deliveryFee = isNfc ? 0 : (order.delivery_fee_paise ?? 9900);
    const finalPayable = billDetails.sellingTotal + billDetails.gstTotal + deliveryFee;

    if (isGiftCard) {
        const coupon = order.coupons;
        const uiStatus = orderType === 'udhari_giftcard' ? 'pending-payment' : coupon.status;
        const isInactive = uiStatus !== 'active';
        const savings = ((coupon.face_value_paise || 0) / 100 - (order.amount || order.amount_paise / 100)).toFixed(0);
        const monogram = (coupon.brand || 'GC').slice(0, 2).toUpperCase();

        return (
            <div className={`min-h-screen pb-24 pt-[12vh] sm:pt-[15vh] ${isDark ? 'bg-[#080a10] text-white' : 'bg-[#f7f8fa] text-slate-900'}`}>
                <div className="max-w-3xl mx-auto px-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => router.back()} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white/50' : 'bg-white border border-slate-200 text-slate-500'}`}>
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black">Gift Card Details</h1>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Order ID: {order.id.slice(0, 12)}</p>
                        </div>
                    </div>

                    {/* Gift Card Visual */}
                    <div className={`relative overflow-hidden rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all ${isInactive ? 'grayscale-[30%] opacity-80' : ''} mb-6`}>
                        <div className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600`} />
                        {/* Shimmer Effect */}
                        {!isInactive && (
                            <motion.div 
                                animate={{ x: ['-100%', '200%'] }} 
                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} 
                                className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none z-0"
                            />
                        )}
                        <div className="relative z-10 flex items-start justify-between px-6 pt-6 pb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner">
                                    <span className="text-white font-black text-xl tracking-wide">{monogram}</span>
                                </div>
                                <div>
                                    <div className="text-white font-black text-2xl leading-tight drop-shadow">{coupon.brand}</div>
                                    <div className="text-white/60 text-sm font-medium mt-0.5">{coupon.merchant?.business_name || 'Gift Card'}</div>
                                </div>
                            </div>
                            <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-md ${uiStatus === 'active' ? 'bg-white/90 text-green-600' : uiStatus === 'pending-payment' ? 'bg-amber-100/90 text-amber-700' : 'bg-black/20 text-white border border-white/30'}`}>
                                {uiStatus === 'active' ? '✓ Active' : uiStatus === 'pending-payment' ? '⏳ Pending Payment' : uiStatus.charAt(0).toUpperCase() + uiStatus.slice(1)}
                            </span>
                        </div>
                        <div className={`relative z-10 mx-4 mb-4 rounded-2xl shadow-2xl ${isDark ? 'bg-[#0c0e16]' : 'bg-white'}`}>
                            <div className="p-6">
                                <div className={`flex items-start justify-between mb-5 pb-5 border-b ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                                    <div>
                                        <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Face Value</div>
                                        <div className="text-4xl font-black bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent leading-none">₹{(coupon.face_value_paise || 0) / 100}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>You Paid</div>
                                        <div className={`text-3xl font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{order.amount || order.amount_paise / 100}</div>
                                        {Number(savings) > 0 && uiStatus !== 'pending-payment' && (
                                            <div className="text-sm font-bold text-emerald-500 mt-1 flex items-center justify-end gap-1"><TrendingUp size={14} /> Saved ₹{savings}</div>
                                        )}
                                    </div>
                                </div>
                                <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 py-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} px-5 mb-4 border ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                                    <div>
                                        <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Purchase Date</div>
                                        <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{format(new Date(order.created_at), 'dd MMM yyyy, h:mm a')}</div>
                                    </div>
                                    <div className="sm:text-right">
                                        <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Payment Method</div>
                                        <div className={`text-sm font-bold uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>{order.payment_method || 'Udhari'}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        generateOrderInvoice({
                                            order: { id: order.id, created_at: order.created_at, customer_name: customerProfile?.full_name || 'Customer', faceValue: (coupon.face_value_paise || 0) / 100, paidAmount: order.amount || order.amount_paise / 100, brand: coupon.brand, giftcard_name: `${coupon.brand} Gift Card` },
                                            items: [],
                                            seller: { name: 'Intrust Financial Services (India) Pvt. Ltd.', address: 'TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Naga, Bhopal, MP 462026', phone: '18002030052', gstin: '23AAFC14866A1ZV' },
                                            customer: { name: customerProfile?.full_name || 'Customer', phone: customerProfile?.phone || '', address: '' },
                                            type: 'giftcard'
                                        });
                                    }}
                                    className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 ${isDark ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-blue-500/10 hover:text-blue-400' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}
                                >
                                    <Download size={16} /> Download Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isSolar) {
        const steps = [
            { label: 'Request Received', icon: Clock, key: 'new' },
            { label: 'Contacted', icon: Phone, key: 'contacted' },
            { label: 'Converted', icon: CheckCircle2, key: 'converted' }
        ];
        
        let sIndex = steps.findIndex(s => s.key === (order.status || 'new'));
        if (sIndex === -1 && order.status === 'lost') sIndex = 0; // if lost, it might be new or contacted
        if (order.status === 'contacted') sIndex = 1;
        if (order.status === 'converted') sIndex = 2;
        
        const isSolarCancelled = order.status === 'lost';
        
        return (
            <div className={`min-h-screen pb-24 pt-[12vh] sm:pt-[15vh] ${isDark ? 'bg-[#080a10] text-white' : 'bg-[#f7f8fa] text-slate-900'}`}>
                <div className="max-w-3xl mx-auto px-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => router.back()} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white/50' : 'bg-white border border-slate-200 text-slate-500'}`}>
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black">Solar Inquiry Details</h1>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Inquiry ID: {order.id.slice(0, 12)}</p>
                        </div>
                    </div>

                    {/* Solar Hero */}
                    <div className="relative w-full h-56 sm:h-64 rounded-[2rem] overflow-hidden mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] group">
                        <Image src="/solar-home.png" alt="Solar Setup" fill className="object-cover transition-transform duration-1000 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                            <div className="flex items-center gap-4 mb-2">
                                {isSolarCancelled ? (
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 backdrop-blur-md flex items-center justify-center text-red-400 border border-red-500/30">
                                        <AlertCircle size={24} />
                                    </div>
                                ) : order.status === 'new' ? (
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 backdrop-blur-md flex items-center justify-center text-blue-400 border border-blue-500/30">
                                        <Clock size={24} />
                                    </div>
                                ) : order.status === 'contacted' ? (
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 backdrop-blur-md flex items-center justify-center text-amber-400 border border-amber-500/30">
                                        <Phone size={24} />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 backdrop-blur-md flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                                        <CheckCircle2 size={24} />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white capitalize tracking-tight drop-shadow-md">
                                        {order.status === 'new' ? 'Inquiry Received' : order.status}
                                    </h2>
                                </div>
                            </div>
                            <p className="text-white/70 text-sm font-medium mt-2">
                                {order.status === 'new' ? "We're reviewing your requirements. Our experts will contact you soon." : "Your transition to solar is in progress."}
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`rounded-3xl p-6 md:p-8 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}>
                            <h3 className={`text-xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Status Timeline</h3>
                            {isSolarCancelled ? (
                                <div className="flex items-center gap-4 text-red-500 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10">
                                    <AlertCircle size={32} />
                                    <div><h3 className="font-black text-lg">Inquiry Closed</h3><p className="text-sm opacity-80">This solar inquiry was marked as lost.</p></div>
                                </div>
                            ) : (
                                <div className="relative pl-4 space-y-8">
                                    <div className={`absolute top-2 bottom-6 left-[1.1rem] w-0.5 -z-0 ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`} />
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${(Math.max(0, sIndex) / (steps.length - 1)) * 100}%` }} className="absolute top-2 left-[1.1rem] w-0.5 bg-amber-500 -z-0" />
                                    {steps.map((step, idx) => {
                                        const isActive = idx <= sIndex;
                                        const isCurrent = idx === sIndex;
                                        const Icon = step.icon;
                                        return (
                                            <div key={step.key} className={`flex items-start gap-6 relative z-10 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                                                <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive ? 'bg-amber-500 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' : isDark ? 'bg-[#12151c] border-white/10 text-white/20' : 'bg-white border-slate-200 text-slate-300'}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <h4 className={`text-base font-black tracking-tight ${isActive ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-white/50' : 'text-slate-400')}`}>{step.label}</h4>
                                                    {isCurrent && <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Current Status</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                        <div className="space-y-4">
                            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className={`rounded-2xl p-5 relative overflow-hidden shadow-lg border ${isDark ? 'border-white/[0.06] bg-gradient-to-br from-amber-500/5 to-transparent' : 'border-amber-100 bg-gradient-to-br from-amber-50 to-transparent'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full" />
                                <h3 className={`relative z-10 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}><Zap size={14} /> Requirements</h3>
                                <div className="space-y-3 relative z-10">
                                    <div><p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Property Type</p><p className="text-sm font-bold capitalize">{order.property_type}</p></div>
                                    <div><p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Monthly Bill Range</p><p className="text-sm font-bold">{order.monthly_bill_range}</p></div>
                                </div>
                            </motion.div>
                            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }} className={`rounded-2xl p-5 relative overflow-hidden shadow-lg border ${isDark ? 'border-white/[0.06] bg-gradient-to-br from-emerald-500/5 to-transparent' : 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-transparent'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full" />
                                <h3 className={`relative z-10 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}><MapPin size={14} /> Location Details</h3>
                                <div className="space-y-3 relative z-10">
                                    <div><p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Address</p><p className="text-sm font-bold">{order.address}</p></div>
                                    <div><p className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>City</p><p className="text-sm font-bold">{order.city}</p></div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen pb-24 pt-[12vh] sm:pt-[15vh] ${isDark ? 'bg-[#080a10] text-white' : 'bg-[#f7f8fa] text-slate-900'}`}>
            <div className="max-w-3xl mx-auto px-4">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.back()}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white/50' : 'bg-white border border-slate-200 text-slate-500'}`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black">Order Details</h1>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                            Order ID: {order.id.slice(0, 12)}
                        </p>
                    </div>
                </div>

                {/* Hero Status Animation & ETA */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`rounded-[2rem] p-8 mb-6 flex flex-col items-center justify-center text-center overflow-hidden relative ${isDark ? 'bg-gradient-to-b from-[#12151c] to-[#0c0e16] border border-white/[0.06]' : 'bg-gradient-to-b from-white to-slate-50 shadow-sm border border-slate-100'}`}
                >
                    {isCancelled ? (
                         <motion.div
                            animate={{ scale: [1, 1.1, 1] }} 
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-24 h-24 mb-4 rounded-[2rem] bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner"
                        >
                            <AlertCircle size={48} strokeWidth={1.5} />
                        </motion.div>
                    ) : status === 'pending' ? (
                        <motion.div
                            animate={{ y: [0, -10, 0] }} 
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-24 h-24 mb-4 rounded-[2rem] bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner"
                        >
                            <ShoppingBag size={48} strokeWidth={1.5} />
                        </motion.div>
                    ) : status === 'packed' ? (
                        <motion.div
                            animate={{ rotate: [-5, 5, -5] }} 
                            transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-24 h-24 mb-4 rounded-[2rem] bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner"
                        >
                            <Package size={48} strokeWidth={1.5} />
                        </motion.div>
                    ) : status === 'shipped' ? (
                        <div className="relative w-full max-w-[200px] h-24 mb-4 overflow-hidden rounded-[2rem] bg-indigo-50 dark:bg-indigo-500/5 shadow-inner">
                            <motion.div
                                animate={{ x: [-100, 240] }} 
                                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                className="absolute top-1/2 -translate-y-1/2 text-indigo-500"
                            >
                                <Truck size={40} strokeWidth={1.5} />
                            </motion.div>
                        </div>
                    ) : status === 'delivered' ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            className="w-24 h-24 mb-4 rounded-[2rem] bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner"
                        >
                            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                                <CheckCircle2 size={48} strokeWidth={1.5} />
                            </motion.div>
                        </motion.div>
                    ) : null}

                    <h2 className="text-2xl md:text-3xl font-black mb-2 capitalize tracking-tight">
                        {status === 'pending' ? 'Order Received' : status}
                    </h2>
                    
                    {isCancelled ? (
                         <p className={`text-sm font-bold text-red-500 mb-1`}>
                            This order has been cancelled
                        </p>
                    ) : status === 'delivered' ? (
                        <div>
                             <p className={`text-sm font-bold text-emerald-500 mb-1`}>
                                Delivered safely
                            </p>
                            {(order.estimated_delivery_at || order.estimated_delivery_date) && (
                                <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                    Delivered at {format(new Date(order.estimated_delivery_at || order.estimated_delivery_date), "h:mm a, do MMM")}
                                </p>
                            )}
                        </div>
                    ) : (order.estimated_delivery_at || order.estimated_delivery_date) ? (
                        <div className="flex flex-col items-center">
                            <p className={`text-sm md:text-base font-bold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                                Arriving by <span className="text-emerald-500 font-black">{format(new Date(order.estimated_delivery_at || order.estimated_delivery_date), "h:mm a, do MMM")}</span>
                            </p>
                            {/* Animated line underneath */}
                            <div className="w-16 h-1 bg-emerald-500/20 rounded-full mt-3 overflow-hidden relative">
                                <motion.div 
                                    className="absolute inset-y-0 left-0 w-1/3 bg-emerald-500 rounded-full" 
                                    animate={{ left: ['-100%', '200%'] }} 
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} 
                                />
                            </div>
                        </div>
                    ) : (
                        <p className={`text-sm font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                            Processing delivery estimate...
                        </p>
                    )}
                </motion.div>

                {/* Vertical Timeline & Map UI */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Map & Courier Illustrations */}
                    <div className={`rounded-3xl overflow-hidden relative border flex items-center justify-center p-6 ${isDark ? 'bg-gradient-to-b from-[#1a1438] to-[#110d26] border-white/10' : 'bg-gradient-to-b from-blue-50 to-indigo-50 border-blue-100 shadow-md'}`}>
                        {/* Map Image Placeholder */}
                        <motion.div 
                            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }} 
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute inset-0 mix-blend-overlay pointer-events-none"
                        >
                            <img src="/map_route_illustration.png" alt="Map Route" className="w-full h-full object-cover" />
                        </motion.div>
                        {/* Courier Image */}
                        <motion.div 
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            className="relative z-10 w-48 h-48 drop-shadow-2xl"
                        >
                            <img src="/intrust_delivery_graphic.png" alt="Delivery Courier" className="w-full h-full object-contain" />
                        </motion.div>
                        {/* Status Overlay */}
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-black/5 dark:border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-400">Status</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{status === 'pending' ? 'Order Received' : status}</p>
                            </div>
                        </div>
                    </div>

                    {/* Vertical Tracker */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`rounded-3xl p-6 md:p-8 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
                    >
                        <h3 className={`text-xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Tracking Details</h3>
                        
                        {isCancelled ? (
                            <div className="flex items-center gap-4 text-red-500 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10">
                                <AlertCircle size={32} />
                                <div>
                                    <h3 className="font-black text-lg">Order Cancelled</h3>
                                    <p className="text-sm opacity-80">This order was cancelled. Contact support for help.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative pl-4 space-y-8">
                                {/* Vertical Progress Line Base */}
                                <div className={`absolute top-2 bottom-6 left-[1.1rem] w-0.5 -z-0 ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`} />
                                {/* Active Progress Line */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                                    className="absolute top-2 left-[1.1rem] w-0.5 bg-emerald-500 -z-0"
                                />

                                {steps.map((step, idx) => {
                                    const isActive = idx <= currentStepIndex;
                                    const isCurrent = idx === currentStepIndex;
                                    const Icon = step.icon;

                                    return (
                                        <div key={step.key} className={`flex items-start gap-6 relative z-10 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                                            <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive
                                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                : isDark ? 'bg-[#12151c] border-white/10 text-white/20' : 'bg-white border-slate-200 text-slate-300'
                                                }`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <h4 className={`text-base font-black tracking-tight ${isActive ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-white/50' : 'text-slate-400')}`}>
                                                    {step.label}
                                                </h4>
                                                {isCurrent && (
                                                    <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                        Current Status
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Delivery & Tracking Info */}
                {(order.estimated_delivery_at || order.estimated_delivery_date || (order.tracking_number && (status === 'shipped' || status === 'delivered'))) && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-4 justify-between sm:items-center ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.04] text-white/50' : 'bg-violet-50 text-violet-600'}`}>
                                <Truck size={18} />
                            </div>
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                    {order.tracking_number ? 'Tracking Number' : 'Fulfillment Status'}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {order.tracking_number ? (
                                        <>
                                            <p className="font-bold text-sm font-mono">{order.tracking_number}</p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(order.tracking_number);
                                                    toast.success("Tracking ID copied!");
                                                }}
                                                className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-wider transition-all active:scale-95 ${isDark ? 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                Copy
                                            </button>
                                        </>
                                    ) : (
                                        <p className="font-bold text-sm">Processing items...</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {(order.estimated_delivery_at || order.estimated_delivery_date) && (
                            <div className={`sm:text-right border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                                <div className="flex flex-col sm:items-end">
                                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                        {status === 'delivered' ? 'Delivered At' : 'Estimated Delivery'}
                                    </h3>
                                    <p className={`font-black text-sm mt-0.5 ${status === 'delivered' ? 'text-emerald-500' : ''}`}>
                                        {format(new Date(order.estimated_delivery_at || order.estimated_delivery_date), 
                                            order.estimated_delivery_at ? "h:mm a, do MMM" : "do MMM yyyy")}
                                    </p>
                                    
                                    {!['shipped', 'delivered', 'cancelled'].includes(status) && (
                                        <button 
                                            onClick={() => {
                                                setRescheduleDate(order.estimated_delivery_at ? format(new Date(order.estimated_delivery_at), "yyyy-MM-dd'T'HH:mm") : '');
                                                setIsRescheduling(true);
                                            }}
                                            className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 underline decoration-emerald-500/30 underline-offset-4 flex items-center gap-1.5 transition-colors"
                                        >
                                            <Calendar size={12} /> Reschedule Delivery
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Order Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                        className={`rounded-2xl p-4 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
                    >
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                            <MapPin size={14} /> Delivery Address
                        </h3>
                        <div className="text-sm">
                            <p className="font-bold mb-1">{order.customer_name || 'Customer'}</p>
                            <p className={`text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                                {order.delivery_address || 'No address provided'}
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                        className={`rounded-2xl p-4 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
                    >
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                            <Store size={14} /> Sold By
                        </h3>
                        <div className="text-sm">
                            <p className="font-bold mb-1">
                                {(order.is_platform_order || isNfc) ? 'InTrust Official' : (items[0]?.merchants?.business_name || 'Merchant')}
                            </p>
                            {!(order.is_platform_order || isNfc) && items[0]?.merchants?.business_address && (
                                <p className={`text-xs leading-relaxed mb-2 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                                    {items[0].merchants.business_address}
                                </p>
                            )}
                            <div className="flex gap-2">
                                {/* Merchant phone number intentionally hidden */}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Merchant Rating */}
                {status === 'delivered' && !order.is_platform_order && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                        className={`rounded-2xl p-5 mb-6 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]'}`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-black text-lg">Rate Your Experience</h3>
                                <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                                    How was your experience with {items[0]?.merchants?.business_name || 'the merchant'}?
                                </p>
                            </div>
                            <div className={`flex items-center gap-1.5 p-2 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-100'}`}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        disabled={rating > 0 || isSubmittingRating}
                                        onClick={async () => {
                                            if (rating > 0 || isSubmittingRating) return;
                                            setIsSubmittingRating(true);
                                            try {
                                                const { error } = await supabase.from('merchant_ratings').insert({
                                                    merchant_id: order.merchant_id,
                                                    customer_id: userId,
                                                    rating_value: star,
                                                    shopping_order_group_id: order.id
                                                });
                                                if (error) {
                                                    // Duplicate constraint might fail if they already rated
                                                    if (error.code !== '23505') throw error;
                                                }
                                                setRating(star);
                                                toast.success("Thank you for rating!");
                                                sessionStorage.setItem('dismissedRatingOrderId', order.id); // dismiss popup
                                            } catch (e) {
                                                console.error('Rating error:', e);
                                                toast.error("Failed to submit rating");
                                            } finally {
                                                setIsSubmittingRating(false);
                                            }
                                        }}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className={`p-1 transition-all ${rating === 0 && !isSubmittingRating ? 'hover:scale-110 active:scale-90 cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <Star
                                            size={28}
                                            className={`transition-colors ${
                                                star <= (hoverRating || rating)
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : isDark ? 'text-white/10' : 'text-slate-200'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Items List */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className={`rounded-2xl p-4 mb-6 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
                >
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                        Items ({items.length})
                    </h3>
                    <div className="space-y-4">
                        {items.map((item) => {
                            const sellingPrice = item.unit_price_paise;
                            const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || sellingPrice;
                            const savings = mrp > sellingPrice ? mrp - sellingPrice : 0;

                            return (
                                <div key={item.id} className={`flex gap-3 pb-4 border-b last:border-b-0 last:pb-0 ${isDark ? 'border-white/[0.03]' : 'border-slate-50'} group transition-all duration-300 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] p-2 -mx-2 rounded-xl`}>
                                    <div className={`w-14 h-14 rounded-xl overflow-hidden p-1 flex items-center justify-center ${isDark ? 'bg-black/20' : 'bg-slate-50 shadow-inner'} relative transition-transform duration-300 group-hover:scale-105`}>
                                        {item.shopping_products?.product_images?.[0] ? (
                                            <Image
                                                src={item.shopping_products.product_images[0]}
                                                alt=""
                                                fill
                                                sizes="(max-width: 640px) 15vw, 56px"
                                                className="object-contain p-1 mix-blend-multiply dark:mix-blend-normal"
                                                quality={60}
                                            />
                                        ) : (
                                            <Package className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold line-clamp-1">{item.shopping_products?.title}</h4>
                                        <p className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Qty: {item.quantity}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="text-sm font-black">₹{(sellingPrice / 100).toLocaleString('en-IN')}</span>
                                            {savings > 0 && (
                                                <span className="text-[10px] line-through opacity-30">₹{(mrp / 100).toLocaleString('en-IN')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Bill Summary */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                    className={`rounded-3xl p-6 sm:p-8 relative shadow-lg ${isDark ? 'bg-[#12151c]' : 'bg-white'} border-[3px] border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'}`}
                >
                    {/* Paid Stamp */}
                    {status !== 'cancelled' && (
                        <div className="absolute top-8 right-8 rotate-12 opacity-10 pointer-events-none">
                            <div className={`text-3xl sm:text-4xl font-black uppercase border-4 rounded-xl px-4 py-2 inline-block ${isDark ? 'text-emerald-500 border-emerald-500' : 'text-emerald-600 border-emerald-600'}`}>
                                {order.payment_method === 'cod' && status === 'pending' ? 'UNPAID' : 'PAID'}
                            </div>
                        </div>
                    )}

                    <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                        <Download size={14} /> Digital Receipt
                    </h3>

                    <div className="space-y-3 text-sm font-medium">
                        <div className="flex justify-between items-center">
                            <span className={isDark ? 'text-white/40' : 'text-slate-500'}>Item Total (at MRP)</span>
                            <span>₹{(billDetails.mrpTotal / 100).toLocaleString('en-IN')}</span>
                        </div>

                        {totalDiscount > 0 && (
                            <div className="flex justify-between items-center text-emerald-500">
                                <span>Product Savings</span>
                                <span className="font-bold">- ₹{(totalDiscount / 100).toLocaleString('en-IN')}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <span className={isDark ? 'text-white/40' : 'text-slate-500'}>SGST</span>
                            <span>₹{(billDetails.gstTotal / 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={isDark ? 'text-white/40' : 'text-slate-500'}>CGST</span>
                            <span>₹{(billDetails.gstTotal / 200).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className={isDark ? 'text-white/40' : 'text-slate-500'}>Delivery Charges</span>
                            <span>₹{(deliveryFee / 100).toLocaleString('en-IN')}</span>
                        </div>

                        <div className={`mt-4 pt-4 border-t border-dashed ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                            <div className="flex justify-between items-end">
                                <span className="text-base font-black">Total Paid</span>
                                <span className="text-2xl font-black">₹{(finalPayable / 100).toLocaleString('en-IN')}</span>
                            </div>
                            <p className={`text-[10px] font-bold mt-1 text-right ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                                Paid using {
                                    order.payment_method === 'gateway' ? "Online Payment (SabPaisa)" :
                                        order.payment_method === 'cod' ? "Cash on Delivery" :
                                            order.payment_method === 'store_credit' ? "Store Credit (Udhari)" :
                                                "InTrust Wallet"
                                }
                            </p>
                        </div>
                    </div>

                    {totalDiscount > 0 && (
                        <div className={`mt-5 p-3 rounded-xl flex items-center gap-3 border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                            <CheckCircle2 size={18} />
                            <p className="text-xs font-black italic">
                                You saved ₹{(totalDiscount / 100).toLocaleString('en-IN')} on this order!
                            </p>
                        </div>
                    )}

                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={() => {
                                const items = order.shopping_order_items || [];
                                const merchant = items[0]?.merchants;
                                generateOrderInvoice({
                                    order: order,
                                    items: items,
                                    seller: (order.is_platform_order || isNfc)
                                        ? {
                                            name: 'Intrust Financial Services (India) Pvt. Ltd.',
                                            address: 'TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Naga, Bhopal, MP 462026',
                                            phone: '18002030052',
                                            gstin: '23AAFC14866A1ZV',
                                        }
                                        : {
                                            name: merchant?.business_name || 'Merchant',
                                            address: merchant?.business_address || '',
                                            phone: merchant?.business_phone || '',
                                            gstin: merchant?.gst_number || 'Unregistered',
                                        },
                                    customer: {
                                        name: customerProfile?.full_name || order.customer_name || 'Customer',
                                        phone: customerProfile?.phone || order.customer_phone || '',
                                        address: order.delivery_address || '',
                                    },
                                    type: 'shopping',
                                });
                            }}
                            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100'}`}
                        >
                            <Download size={14} /> Download Invoice
                        </button>
                        {status === 'pending' ? (
                            <Link
                                href="/contact"
                                className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isDark ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                                <HelpCircle size={14} /> Contact to Cancel
                            </Link>
                        ) : (
                            <Link
                                href="/contact"
                                className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100'}`}
                            >
                                <HelpCircle size={14} /> Contact Support to Cancel
                            </Link>
                        )}
                    </div>
                </motion.div>

                {/* Safe Area Spacer for Bottom Nav */}
                <div className="h-10 md:hidden" />
            </div>

            {/* Reschedule Modal */}
            <AnimatePresence>
                {isRescheduling && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsRescheduling(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`relative w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl overflow-hidden border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Reschedule Delivery</h2>
                                    <button onClick={() => setIsRescheduling(false)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}>
                                        <X size={20} className={isDark ? 'text-white' : 'text-slate-900'} />
                                    </button>
                                </div>
                                
                                <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                                    Choose a preferred date and time for your delivery. The merchant will receive your request immediately.
                                </p>

                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 px-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Preferred Date & Time</label>
                                    <div className="relative group">
                                        <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-white/20' : 'text-slate-300'}`} size={16} />
                                        <input
                                            type="datetime-local"
                                            className={`w-full pl-11 pr-5 py-4 rounded-2xl outline-none focus:ring-4 transition-all font-bold text-sm ${
                                                isDark 
                                                ? 'bg-white/5 border border-white/10 text-white focus:ring-emerald-500/10 focus:border-emerald-500' 
                                                : 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-emerald-500/10 focus:border-emerald-500'
                                            }`}
                                            value={rescheduleDate}
                                            onChange={(e) => setRescheduleDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!rescheduleDate) return;
                                        setIsUpdating(true);
                                        try {
                                            const res = await fetch(`/api/orders/${order.id}/status`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    newStatus: order.delivery_status,
                                                    trackingNumber: order.tracking_number || null,
                                                    estimatedAt: rescheduleDate,
                                                    statusNotes: 'Customer requested reschedule',
                                                    isCustomer: true
                                                })
                                            });
                                            const data = await res.json();
                                            if (!res.ok || !data?.success) throw new Error(data?.message || data?.error || 'Update failed');
                                            
                                            toast.success('Your delivery has been rescheduled!');
                                            router.refresh();
                                            setIsRescheduling(false);
                                        } catch (err) {
                                            console.error('Reschedule failed:', err);
                                            toast.error(err.message || 'Failed to reschedule. Please try again.');
                                        } finally {
                                            setIsUpdating(false);
                                        }
                                    }}
                                    disabled={isUpdating || !rescheduleDate}
                                    className="w-full py-5 rounded-[2rem] bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {isUpdating ? (
                                        <RotateCcw className="animate-spin" size={18} />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={18} />
                                            CONFIRM NEW TIME
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
};

export default OrderDetailsClient;
