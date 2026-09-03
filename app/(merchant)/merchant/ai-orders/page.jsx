'use client';

import React, { useState, useEffect } from 'react';
import { useMerchant } from '@/hooks/useMerchant';
import { supabase } from '@/lib/supabaseClient';
import OrderBoard from '@/components/merchant/ai-orders/OrderBoard';
import toast from 'react-hot-toast';
import { Zap, Activity } from 'lucide-react';
import Link from 'next/link';
import AIOrderNotificationModal from '@/components/merchant/ai-orders/AIOrderNotificationModal';

export default function AIOrdersMerchantPage() {
    const { merchant } = useMerchant();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/merchant/ai-orders');
            if (!res.ok) throw new Error('Failed to fetch AI orders');
            const data = await res.json();
            
            // Only show PENDING orders on the board for them to accept
            setOrders(data.orders.filter(o => o.status === 'PENDING'));
        } catch (error) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!merchant) return;
        fetchOrders();

        const channel = supabase
            .channel('public:ai_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_orders' }, () => {
                fetchOrders(); // Refresh on any change
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [merchant]);

    if (!merchant) return null;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            <AIOrderNotificationModal />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#1a1c23] dark:to-black rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-slate-900/10">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none transform -translate-x-1/2 translate-y-1/2" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-bold uppercase tracking-widest mb-4">
                        <Activity size={14} className="text-[#D4AF37]" />
                        Live Feed
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                        AI Orders
                    </h1>
                    <p className="text-slate-400 font-medium max-w-md">
                        Accept high-demand wholesale orders, pay the principal securely, and earn guaranteed profit when it matures.
                    </p>
                </div>

                <div className="relative z-10 w-full md:w-auto flex flex-col sm:flex-row gap-3">
                    <Link 
                        href="/merchant/vault/ai-orders"
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-white font-bold transition-colors active:scale-95"
                    >
                        Go to Vault
                    </Link>
                </div>
            </div>

            <div className="relative">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Zap size={20} className="text-[#D4AF37]" />
                        Available to Accept
                    </h2>
                    {isLoading && <div className="text-sm text-slate-500 font-medium flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
                        </span>
                        Syncing...
                    </div>}
                </div>

                {isLoading && orders.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[250px] bg-slate-100 dark:bg-[#1a1c23] rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <OrderBoard orders={orders} onAccept={() => {}} />
                )}
            </div>
        </div>
    );
}
