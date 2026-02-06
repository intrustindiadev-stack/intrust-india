'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { TrendingUp, Package, DollarSign, ShoppingBag, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function MerchantDashboardPage() {
    // Mock data
    const stats = [
        { label: 'Total Sales', value: '₹45,280', change: '+12.5%', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
        { label: 'Active Coupons', value: '156', change: '+8', icon: Package, color: 'from-blue-500 to-cyan-500' },
        { label: 'Sold Today', value: '23', change: '+5', icon: ShoppingBag, color: 'from-purple-500 to-pink-500' },
        { label: 'Revenue', value: '₹2,847', change: '+18.2%', icon: TrendingUp, color: 'from-orange-500 to-red-500' },
    ];

    const coupons = [
        { id: 1, brand: 'Flipkart', value: 500, selling: 450, stock: 25, sold: 75, status: 'active' },
        { id: 2, brand: 'Amazon', value: 1000, selling: 920, stock: 15, sold: 35, status: 'active' },
        { id: 3, brand: 'Swiggy', value: 300, selling: 270, stock: 50, sold: 100, status: 'active' },
        { id: 4, brand: 'BookMyShow', value: 500, selling: 460, stock: 0, sold: 50, status: 'out_of_stock' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                                Merchant Dashboard
                            </h1>
                            <p className="text-gray-600">Manage your coupons and track sales</p>
                        </div>
                        <Link
                            href="/merchant/coupons/add"
                            className="px-6 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add Coupon
                        </Link>
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

                    {/* Coupons Table */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">Your Coupons</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Face Value</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Selling Price</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sold</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {coupons.map((coupon) => (
                                        <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{coupon.brand}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">₹{coupon.value}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[#92BCEA] font-semibold">₹{coupon.selling}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-semibold ${coupon.stock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {coupon.stock}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{coupon.sold}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${coupon.status === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {coupon.status === 'active' ? 'Active' : 'Out of Stock'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                                        <Eye size={18} className="text-gray-600" />
                                                    </button>
                                                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                                        <Edit size={18} className="text-gray-600" />
                                                    </button>
                                                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={18} className="text-red-600" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
