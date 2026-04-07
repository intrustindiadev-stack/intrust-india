'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, X, Clock, ChevronRight, Truck, ShoppingBag, MapPin } from 'lucide-react';
import Link from 'next/link';

// Stitch Custom Fintech-Ecommerce "Digital Concierge" Theme Configuration
const getStatusTheme = (status) => {
    switch (status) {
        case 'pending': 
            return { 
                icon: Clock, 
                accentColor: 'text-[#505f76] dark:text-[#bcc7de]', 
                iconBg: 'bg-[#e6e8ea] dark:bg-[#2d3133]', 
                title: 'Order Received',
                subtitle: 'Awaiting fulfillment partner',
                progress: 25,
                glow: 'from-[#111c2d]/10 to-transparent'
            };
        case 'packed': 
            return { 
                icon: Package, 
                accentColor: 'text-[#111c2d] dark:text-[#ffffff]', 
                iconBg: 'bg-[#d0e1fb] dark:bg-[#111c2d]', 
                title: 'Order Packed',
                subtitle: 'Ready for priority dispatch',
                progress: 60,
                glow: 'from-[#54647a]/20 to-transparent'
            };
        case 'shipped': 
            return { 
                icon: Truck, 
                accentColor: 'text-emerald-700 dark:text-emerald-300', 
                iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', 
                title: 'Concierge is arriving',
                subtitle: 'Your order is on the way',
                progress: 90,
                glow: 'from-emerald-500/20 to-transparent'
            };
        default: 
            return { 
                icon: ShoppingBag, 
                accentColor: 'text-gray-500', 
                iconBg: 'bg-gray-100', 
                title: 'Processing',
                subtitle: 'Synchronizing status...',
                progress: 10,
                glow: 'from-gray-300/10 to-transparent'
            };
    }
};

export default function ActiveOrdersOverlay() {
    const [activeOrders, setActiveOrders] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMinimized, setIsMinimized] = useState(true); // Default to true while we check storage
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const supabase = createClient();

    // Check session storage on mount
    useEffect(() => {
        const storedState = sessionStorage.getItem('activeOrdersMinimized');
        // Only minimize if explicitly set to 'true' in this session
        if (storedState === 'true') {
            setIsMinimized(true);
        } else {
            setIsMinimized(false);
        }
    }, []);

    // 1. Fetch User and Initial Orders
    useEffect(() => {
        const fetchUserAndOrders = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }
            setUserId(session.user.id);

            const { data, error } = await supabase
                .from('shopping_order_groups')
                .select('id, delivery_status, total_amount_paise, created_at, delivery_address, status')
                .eq('customer_id', session.user.id)
                .in('status', ['pending', 'completed']) 
                .not('delivery_status', 'in', '("delivered","cancelled")')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setActiveOrders(data);
            }
            setLoading(false);
        };

        fetchUserAndOrders();
    }, []);

    // 2. Real-time Subscription
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('active_orders_tracking')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'shopping_order_groups',
                    filter: `customer_id=eq.${userId}`
                },
                (payload) => {
                    const updatedOrder = payload.new;
                    setActiveOrders((prev) => {
                        if (['delivered', 'cancelled'].includes(updatedOrder.delivery_status) || updatedOrder.status === 'cancelled') {
                            const newOrders = prev.filter(o => o.id !== updatedOrder.id);
                            if (newOrders.length === 0) setIsMinimized(false);
                            return newOrders;
                        }

                        const exists = prev.find(o => o.id === updatedOrder.id);
                        if (exists) {
                            return prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o);
                        } else if (['pending', 'completed'].includes(updatedOrder.status)) {
                            return [updatedOrder, ...prev];
                        }
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // 3. Carousel Logic for Multiple Orders
    useEffect(() => {
        if (activeOrders.length <= 1 || isMinimized) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % activeOrders.length);
        }, 5000); 
        return () => clearInterval(interval);
    }, [activeOrders.length, isMinimized]);

    const handleDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMinimized(true);
        sessionStorage.setItem('activeOrdersMinimized', 'true');
    };

    const handleOpen = () => {
        setIsMinimized(false);
        sessionStorage.removeItem('activeOrdersMinimized');
    };

    if (loading || activeOrders.length === 0) return null;

    const orderIndex = currentIndex >= activeOrders.length ? 0 : currentIndex;
    const currentOrder = activeOrders[orderIndex];

    const theme = getStatusTheme(currentOrder.delivery_status || 'pending');
    const StatusIcon = theme.icon;

    return (
        <AnimatePresence mode="wait">
            {!isMinimized ? (
                <motion.div
                    key="full-card"
                    layoutId="stitch-order-tracker"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="relative w-full overflow-visible"
                >
                    <Link href={`/orders/${currentOrder.id}`} className="block group focus:outline-none">
                        <div className="bg-white/95 dark:bg-[#0c0e16]/95 backdrop-blur-2xl rounded-t-[2.5rem] rounded-b-[2rem] p-5 relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/50 dark:border-white/10">
                            
                            {/* Ambient Glow */}
                            <motion.div 
                                className={`absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-br ${theme.glow} blur-3xl -z-10`}
                                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            />

                            {/* Drag Indicator (Visual only) */}
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

                            <div className="flex items-start gap-4 mb-4">
                                {/* The Trust Badge Icon Container */}
                                <div className="relative shrink-0 mt-1">
                                    <motion.div 
                                        key={currentOrder.delivery_status}
                                        initial={{ scale: 0.5, rotate: -30 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className={`w-14 h-14 rounded-[1.2rem] ${theme.iconBg} flex items-center justify-center shadow-inner`}
                                    >
                                        <StatusIcon className={`w-6 h-6 ${theme.accentColor}`} strokeWidth={2.5} />
                                    </motion.div>
                                    
                                    {/* Sub-border Outline equivalent */}
                                    <div className={`absolute inset-0 rounded-[1.2rem] border-[1.5px] border-black/5 dark:border-white/5 animate-[spin_6s_linear_infinite] [border-top-color:transparent]`} />
                                </div>
                                
                                {/* Info Container with Strict Inter / Manrope Typography Scale */}
                                <div className="flex-1 min-w-0 pr-2">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentOrder.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Order #{currentOrder.id.slice(0, 6)}</span>
                                                <button 
                                                    onClick={handleDismiss}
                                                    className="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                </button>
                                            </div>
                                            <h4 className="font-display font-black text-lg text-slate-900 dark:text-white leading-tight mb-1 truncate">
                                                {theme.title}
                                            </h4>
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-snug">
                                                {theme.subtitle}
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* The Progress Rail */}
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden mt-3 shadow-inner">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${theme.progress}%` }}
                                    transition={{ duration: 1.5, type: "spring", bounce: 0 }}
                                    className={`h-full rounded-full bg-gradient-to-r ${theme.progress >= 90 ? 'from-emerald-400 to-emerald-500' : 'from-blue-500 to-indigo-500'}`}
                                />
                            </div>

                            {/* Multiple Orders Paginator & CTA */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex gap-1.5">
                                    {activeOrders.length > 1 && activeOrders.map((_, idx) => (
                                        <motion.div 
                                            key={idx} 
                                            initial={false}
                                            animate={{
                                                width: idx === orderIndex ? 16 : 6,
                                                backgroundColor: idx === orderIndex ? '#3b82f6' : '#cbd5e1' 
                                            }}
                                            className="h-1.5 rounded-full dark:bg-slate-700"
                                        />
                                    ))}
                                </div>

                                <span className="flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                                    Track Maps <ChevronRight size={14} strokeWidth={3} />
                                </span>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            ) : (
                <motion.button
                    key="minimized-pill"
                    layoutId="stitch-order-tracker"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={handleOpen}
                    className="pointer-events-auto ml-auto flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white pl-2 pr-4 py-2 rounded-full shadow-[0_8px_16px_rgba(59,130,246,0.3)] hover:shadow-lg hover:scale-105 transition-all mb-1"
                >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${theme.iconBg}`}>
                         <StatusIcon className={`w-3.5 h-3.5 ${theme.accentColor}`} strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-[11px] uppercase tracking-widest text-white">
                        {activeOrders.length > 1 ? `${activeOrders.length} Tracking` : 'Order Status'}
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}
