'use client';

import React from 'react';
import OrderCard from './OrderCard';
import { PackageOpen } from 'lucide-react';

export default function OrderBoard({ orders, onAccepted, activeTab = 'ALL' }) {
    if (!orders || orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3 text-slate-400">
                    <PackageOpen size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    No Orders in this View
                </h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">
                    {activeTab === 'ALL' 
                        ? 'You do not have any AI orders right now. High-demand allocations will appear here.'
                        : `No orders found for the "${activeTab.replace('_', ' ')}" filter.`}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {orders.map(order => (
                <OrderCard key={order.id} order={order} onAccepted={onAccepted} />
            ))}
        </div>
    );
}
