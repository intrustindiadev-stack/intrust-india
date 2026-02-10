'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { useMerchant } from '@/hooks/useMerchant';

export default function AnalyticsPage() {
    const { merchant, loading: merchantLoading, error: merchantError } = useMerchant();

    if (merchantLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA]" />
            </div>
        );
    }

    if (merchantError || !merchant) {
        return <div className="p-8 text-center text-red-500">Error: {merchantError || 'Merchant not found'}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Analytics
                    </h1>
                    <p className="text-gray-600">Track your business performance</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Placeholder Stats */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-gray-600 font-medium">Total Revenue</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">₹0.00</h3>
                        <p className="text-sm text-green-600 mt-1">+0% from last month</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center py-20">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Detailed Analytics Coming Soon</h3>
                    <p className="text-gray-500">We are building detailed charts and reports for your business.</p>
                </div>
            </div>
        </div>
    );
}
