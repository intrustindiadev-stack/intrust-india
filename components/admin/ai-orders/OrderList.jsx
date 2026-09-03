'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function OrderList({ orders, onComplete }) {
    const [completingId, setCompletingId] = useState(null);

    const handleComplete = async (id) => {
        if (!confirm('Are you sure you want to complete this order and release funds to the merchant?')) return;
        
        setCompletingId(id);
        try {
            const res = await fetch(`/api/admin/ai-orders/${id}/complete`, {
                method: 'POST'
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error);
            
            toast.success('Order completed and funds released to Vault.');
            if (onComplete) onComplete();
        } catch (error) {
            toast.error(error.message || 'Failed to complete order');
        } finally {
            setCompletingId(null);
        }
    };

    if (!orders || orders.length === 0) {
        return <div className="p-8 text-center text-slate-500">No AI orders found. Feed some orders to get started.</div>;
    }

    const getStatusColor = (status) => {
        switch(status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500';
            case 'PAYMENT_PENDING': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-500';
            case 'ACCEPTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-xs uppercase text-slate-500 dark:text-slate-400">
                    <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium text-right">Wholesale (₹)</th>
                        <th className="px-4 py-3 font-medium text-right">Profit (₹)</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Merchant ID</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                {order.product_name}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {(order.wholesale_price_paise / 100).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                +{(order.profit_margin_paise / 100).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                                {order.merchant_id ? order.merchant_id.substring(0, 8) + '...' : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {order.status === 'ACCEPTED' && (
                                    <button 
                                        onClick={() => handleComplete(order.id)}
                                        disabled={completingId === order.id}
                                        className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-all disabled:opacity-50"
                                    >
                                        {completingId === order.id ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                                        Complete & Release
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
