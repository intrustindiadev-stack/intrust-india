'use client';

import React, { useState, useEffect } from 'react';
import OverviewStats from '@/components/admin/ai-orders/OverviewStats';
import CreateOrderModal from '@/components/admin/ai-orders/CreateOrderModal';
import OrderList from '@/components/admin/ai-orders/OrderList';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIOrdersAdminPage() {
    const [data, setData] = useState({ orders: [], stats: {} });
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/admin/ai-orders');
            if (!response.ok) throw new Error('Failed to fetch AI orders');
            const result = await response.json();
            setData(result);
        } catch (error) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // Optional: Set up polling or Supabase Realtime here to auto-refresh the admin view
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleOrderCreated = (newOrder) => {
        // Optimistic UI update or full refresh
        fetchOrders();
    };

    const handleOrderCompleted = (orderId) => {
        fetchOrders();
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Orders Management</h1>
                    <p className="text-gray-500 mt-1">Feed new AI investments and monitor merchant vault earnings.</p>
                </div>
                <CreateOrderModal onOrderCreated={handleOrderCreated} />
            </div>

            <OverviewStats stats={data.stats} />

            <div className="pt-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Order Ledger</h2>
                <OrderList orders={data.orders} onOrderCompleted={handleOrderCompleted} />
            </div>
        </div>
    );
}
