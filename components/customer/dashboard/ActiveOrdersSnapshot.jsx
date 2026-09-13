'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, Truck, Phone, CheckCircle2, ArrowRight, FileText, Headphones, ShieldCheck, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

let activeOrdersCache = null;

function ActiveOrdersSnapshot({ userId }) {
    const [orders, setOrders] = useState(() => activeOrdersCache || []);
    const [loading, setLoading] = useState(() => activeOrdersCache === null);

    useEffect(() => {
        if (!userId) return;

        const fetchActiveOrders = async () => {
            try {
                const { data, error } = await supabase
                    .from('shopping_order_groups')
                    .select(`
                        id,
                        order_group_id,
                        total_amount_paise,
                        status,
                        delivery_status,
                        is_platform_order,
                        created_at,
                        shopping_order_items (
                            id,
                            quantity,
                            selling_price_paise,
                            shopping_products (
                                title,
                                product_images
                            ),
                            merchants (
                                business_name,
                                business_phone
                            )
                        )
                    `)
                    .eq('customer_id', userId)
                    .in('status', ['completed', 'pending'])
                    .neq('delivery_status', 'delivered')
                    .neq('delivery_status', 'cancelled')
                    .order('created_at', { ascending: false })
                    .limit(2);

                if (!error && data && data.length > 0) {
                    activeOrdersCache = data;
                    setOrders(data);
                } else {
                    activeOrdersCache = [];
                    setOrders([]);
                }
            } catch (err) {
                console.error('Failed to fetch orders snapshot:', err);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveOrders();
    }, [userId]);

    if (loading || orders.length === 0) return null;

    const order = orders[0];
    const firstItem = order.shopping_order_items?.[0];
    const itemTitle = firstItem?.shopping_products?.title || `InTrust Order #${order.order_group_id || order.id?.slice(0, 8)}`;
    const merchant = firstItem?.merchants;
    const merchantName = merchant?.business_name || (order.is_platform_order ? 'InTrust Official' : 'Local Merchant');
    const merchantPhone = merchant?.business_phone || null;

    return (
        <div className="w-full bg-surface-container-lowest rounded-3xl p-5 sm:p-6 border border-outline-variant/30 shadow-md">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-outline-variant/20">
                <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600" />
                    </span>
                    <span className="font-extrabold text-xs uppercase tracking-wider text-on-surface">Priority Live Dispatch</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">In-Transit</span>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
                    <span>Order: <strong className="text-on-surface font-mono">{order.order_number || `#${order.id?.slice(0, 8)}`}</strong></span>
                    <Link href="/orders" className="text-primary hover:underline flex items-center gap-1">
                        <span>View All</span>
                        <ArrowRight size={12} />
                    </Link>
                </div>
            </div>

            {/* Stepper Timeline */}
            <div className="py-6 px-2">
                <div className="relative flex items-center justify-between">
                    <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-surface-container-high -z-0" />
                    <div className="absolute left-6 w-1/2 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 -z-0" />

                    {/* Step 1 */}
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
                            ✓
                        </div>
                        <span className="text-[11px] font-bold text-on-surface mt-1.5">Placed</span>
                    </div>

                    {/* Step 2 */}
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
                            <Truck size={14} />
                        </div>
                        <span className="text-[11px] font-bold text-on-surface mt-1.5">Dispatched</span>
                    </div>

                    {/* Step 3 */}
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high text-brand-steel flex items-center justify-center text-xs font-bold">
                            <Clock size={14} />
                        </div>
                        <span className="text-[11px] font-medium text-brand-steel mt-1.5">Out for Delivery</span>
                    </div>

                    {/* Step 4 */}
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high text-brand-steel flex items-center justify-center text-xs font-bold">
                            <Package size={14} />
                        </div>
                        <span className="text-[11px] font-medium text-brand-steel mt-1.5">Delivered</span>
                    </div>
                </div>
            </div>

            {/* Item & Contact Bar */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h4 className="font-extrabold text-sm text-on-surface">{itemTitle}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        Sold by <strong className="text-on-surface">{merchantName}</strong> • Est. Arrival: <strong className="text-primary">Today by 6:00 PM</strong>
                    </p>
                </div>

                {/* Direct Contact & Help */}
                <div className="flex items-center gap-2 shrink-0">
                    {merchantPhone && (
                        <a
                            href={`tel:${merchantPhone}`}
                            className="px-3 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 transition-colors"
                            title="Call Store Merchant"
                        >
                            <Phone size={13} className="text-emerald-600" />
                            <span>Call Store</span>
                        </a>
                    )}

                    <a
                        href="tel:18008890199"
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        title="Company Toll-Free Support Desk"
                    >
                        <Headphones size={13} />
                        <span>1800-889-0199 (Toll-Free)</span>
                    </a>
                </div>
            </div>
        </div>
    );
}

export default React.memo(ActiveOrdersSnapshot);
