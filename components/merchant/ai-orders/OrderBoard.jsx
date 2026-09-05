'use client';

import React from 'react';
import OrderCard from './OrderCard';
import { PackageOpen } from 'lucide-react';

export default function OrderBoard({ orders, onAccept }) {
    if (!orders || orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 bg-white/50 dark:bg-black/10 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <PackageOpen size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">No AI Orders Right Now</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm text-sm">
                    New high-profit orders will appear here automatically. Keep this page open to grab them first!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {orders.map(order => (
                <OrderCard key={order.id} order={order} onAccept={onAccept} />
            ))}
        </div>
    );
}
