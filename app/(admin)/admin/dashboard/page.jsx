'use client';

import { TrendingUp, Users, Package, DollarSign, ShoppingBag, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
    // Mock data
    const stats = [
        { label: 'Total Revenue', value: '₹84,250', change: '+23.5%', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
        { label: 'Active Merchants', value: '45', change: '+5', icon: Users, color: 'from-blue-500 to-cyan-500' },
        { label: 'Total Coupons', value: '2,847', change: '+124', icon: Package, color: 'from-purple-500 to-pink-500' },
        { label: 'Today Sales', value: '156', change: '+18', icon: ShoppingBag, color: 'from-orange-500 to-red-500' },
    ];

    const recentTransactions = [
        { id: 1, buyer: 'Rahul Kumar', merchant: 'Ravi Traders', brand: 'Flipkart', amount: 463.50, commission: 28, time: '2 mins ago' },
        { id: 2, buyer: 'Priya Sharma', merchant: 'Gift Hub', brand: 'Amazon', amount: 948.60, commission: 56, time: '15 mins ago' },
        { id: 3, buyer: 'Amit Patel', merchant: 'Food Deals', brand: 'Swiggy', amount: 278.10, commission: 16, time: '1 hour ago' },
        { id: 4, buyer: 'Sneha Gupta', merchant: 'Ravi Traders', brand: 'BookMyShow', amount: 474.20, commission: 28, time: '2 hours ago' },
    ];

    const pendingMerchants = [
        { id: 1, name: 'New Gift Cards', owner: 'Vikram Singh', applied: '2024-01-30' },
        { id: 2, name: 'Coupon World', owner: 'Anjali Verma', applied: '2024-01-30' },
        { id: 3, name: 'Deal Masters', owner: 'Rajesh Kumar', applied: '2024-01-29' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                    Admin Dashboard
                </h1>
                <p className="text-gray-600">Monitor platform performance and manage operations</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                    <Icon className="text-white" size={24} />
                                </div>
                                <span className="text-sm font-semibold text-green-600">{stat.change}</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-600">{stat.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Transactions */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
                            <Link href="/admin/transactions" className="text-[#92BCEA] hover:text-[#7A93AC] font-semibold text-sm">
                                View All →
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Buyer</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Merchant</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Brand</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Commission</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {recentTransactions.map((txn) => (
                                        <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{txn.buyer}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{txn.merchant}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{txn.brand}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">₹{txn.amount}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-green-600">₹{txn.commission}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600">{txn.time}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Pending Merchants */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                                {pendingMerchants.length}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {pendingMerchants.map((merchant) => (
                                <div key={merchant.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="font-semibold text-gray-900">{merchant.name}</div>
                                            <div className="text-sm text-gray-600">{merchant.owner}</div>
                                        </div>
                                        <Clock size={16} className="text-gray-400" />
                                    </div>
                                    <div className="text-xs text-gray-500 mb-3">Applied: {merchant.applied}</div>
                                    <Link
                                        href="/admin/merchants"
                                        className="block w-full py-2 bg-[#92BCEA] hover:bg-[#7A93AC] text-white text-center font-semibold rounded-lg transition-all text-sm"
                                    >
                                        Review
                                    </Link>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/admin/merchants"
                            className="block w-full mt-4 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white text-center font-bold rounded-xl shadow-lg transition-all"
                        >
                            View All Applications
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
