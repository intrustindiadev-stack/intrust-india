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
                title: 'On the Way',
                subtitle: 'Concierge is arriving shortly',
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
                    <Link href={`/orders/${currentOrder.id}`} className="block group">
                        
                        {/* Stitch "Digital Concierge" Floating Card Structure */}
                        {/* No borders, high ambient shadow, backdrop-blur 20px */}
                        <div className="bg-[#ffffff]/85 dark:bg-[#191c1e]/85 backdrop-blur-[20px] rounded-[1.5rem] p-4 relative overflow-hidden shadow-[0_12px_40px_rgba(25,28,30,0.08)]">
                            
                            {/* Intentional Asymmetry: Large background gradient wash sweeping across */}
                            <motion.div 
                                className={`absolute top-0 left-0 w-full h-[150%] bg-gradient-to-br ${theme.glow} -z-10`}
                                animate={{ opacity: [0.5, 0.8, 0.5] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            />

                            <div className="flex items-center gap-4">
                                {/* The Trust Badge Icon Container */}
                                <div className="relative shrink-0">
                                    <motion.div 
                                        key={currentOrder.delivery_status}
                                        initial={{ scale: 0.8, rotate: -20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className={`w-14 h-14 rounded-full ${theme.iconBg} flex items-center justify-center`}
                                    >
                                        <StatusIcon className={`w-6 h-6 ${theme.accentColor}`} strokeWidth={2.2} />
                                    </motion.div>
                                    
                                    {/* Sub-border Outline equivalent */}
                                    <div className={`absolute inset-0 rounded-full border-[1.5px] border-black/5 dark:border-white/5 animate-[spin_4s_linear_infinite] [border-top-color:transparent]`} />
                                </div>
                                
                                {/* Info Container with Strict Inter / Manrope Typography Scale */}
                                <div className="flex-1 min-w-0 pr-2">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentOrder.id}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <h4 className="font-[family-name:var(--font-manrope)] font-extrabold text-[15px] tracking-tight text-[#000000] dark:text-[#ffffff] leading-snug">
                                                {theme.title}
                                            </h4>
                                            
                                            {/* Micro-copy Label style */}
                                            <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold text-[#505f76] dark:text-[#bcc7de] uppercase tracking-wider mt-0.5 truncate">
                                                {theme.subtitle} 
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Stitch Priority Action Stack */}
                                <div className="flex flex-col items-center justify-between h-[52px] shrink-0 ml-1">
                                    <button 
                                        onClick={handleDismiss}
                                        className="p-1 -mt-2 -mr-2 text-[#76777d] hover:text-[#ba1a1a] dark:text-[#c6c6cd] dark:hover:text-[#ffdad6] rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    
                                    {/* Action Gradient Pill */}
                                    <motion.div 
                                        whileHover={{ scale: 1.1 }}
                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#000000] to-[#111c2d] dark:from-[#d8e3fb] dark:to-[#bcc7de] flex items-center justify-center shadow-md"
                                    >
                                        <ChevronRight className="w-4 h-4 text-white dark:text-gray-900" strokeWidth={3} />
                                    </motion.div>
                                </div>
                            </div>

                            {/* The Progress Rail - No borders, just pure tonal shifts */}
                            <div className="w-full h-[3px] bg-[#eceef0] dark:bg-[#3c475a] rounded-full mt-4 overflow-hidden relative">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${theme.progress}%` }}
                                    transition={{ duration: 1.2, type: "spring", bounce: 0 }}
                                    className="h-full rounded-full bg-[#111c2d] dark:bg-[#d8e3fb]"
                                />
                            </div>

                            {/* Multiple Orders Paginator */}
                            {activeOrders.length > 1 && (
                                <div className="flex justify-center gap-1.5 mt-2.5">
                                    {activeOrders.map((_, idx) => (
                                        <motion.div 
                                            key={idx} 
                                            initial={false}
                                            animate={{
                                                width: idx === orderIndex ? 16 : 6,
                                                backgroundColor: idx === orderIndex ? '#111c2d' : '#eceef0' 
                                            }}
                                            className="h-1 rounded-full dark:bg-[#38485d]"
                                        />
                                    ))}
                                </div>
                            )}

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
                    // Proper structural positioning, pushing to the right natively without extreme absolute overlaps
                    className="pointer-events-auto ml-auto flex items-center gap-2 bg-[#ffffff]/90 dark:bg-[#2d3133]/90 backdrop-blur-md border border-[#ffffff]/20 dark:border-[#111c2d]/20 text-[#000000] dark:text-[#ffffff] pl-2 pr-4 py-2 rounded-full shadow-[0_8px_16px_rgba(25,28,30,0.12)] hover:shadow-lg transition-shadow mb-1"
                >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${theme.iconBg}`}>
                         <StatusIcon className={`w-3.5 h-3.5 ${theme.accentColor}`} strokeWidth={2.5} />
                    </div>
                    <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-wider">
                        {activeOrders.length > 1 ? `${activeOrders.length} Tracking` : 'Order Status'}
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}
