'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { Gift, Copy, Check, Eye, EyeOff, Calendar, ShoppingBag, TrendingUp, Wallet, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MyCouponsPage() {
    const [revealedCodes, setRevealedCodes] = useState({});
    const [copiedCodes, setCopiedCodes] = useState({});
    const [activeTab, setActiveTab] = useState('all'); // all, active, used

    // Mock data
    const coupons = [
        {
            id: 1,
            brand: 'Flipkart',
            value: 500,
            paidAmount: 463.50,
            code: 'FLIP500ABC123',
            purchaseDate: '2024-01-30',
            expiryDate: '2025-01-30',
            status: 'active',
            merchant: 'Ravi Traders',
            logo: '🛒',
            gradient: 'from-blue-600 via-blue-500 to-cyan-500'
        },
        {
            id: 2,
            brand: 'Amazon',
            value: 1000,
            paidAmount: 948.60,
            code: 'AMZN1000XYZ789',
            purchaseDate: '2024-01-28',
            expiryDate: '2025-01-28',
            status: 'active',
            merchant: 'Gift Card Hub',
            logo: '📦',
            gradient: 'from-orange-500 via-amber-500 to-yellow-500'
        },
        {
            id: 3,
            brand: 'Swiggy',
            value: 300,
            paidAmount: 278.10,
            code: 'SWIG300DEF456',
            purchaseDate: '2024-01-25',
            expiryDate: '2024-12-25',
            status: 'used',
            merchant: 'Food Deals',
            logo: '🍔',
            gradient: 'from-orange-600 via-red-500 to-pink-500'
        },
    ];

    const toggleReveal = (id) => {
        setRevealedCodes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const copyCode = (id, code) => {
        navigator.clipboard.writeText(code);
        setCopiedCodes(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
            setCopiedCodes(prev => ({ ...prev, [id]: false }));
        }, 2000);
    };

    // Filter coupons
    const filteredCoupons = coupons.filter(coupon => {
        if (activeTab === 'all') return true;
        return coupon.status === activeTab;
    });

    // Calculate stats
    const totalValue = coupons.reduce((sum, c) => sum + c.value, 0);
    const totalPaid = coupons.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalSavings = totalValue - totalPaid;
    const activeCoupons = coupons.filter(c => c.status === 'active').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Navbar />

            <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
                            My Gift Cards
                        </h1>
                        <p className="text-gray-600 text-base sm:text-lg">View and manage your purchased gift cards</p>
                    </motion.div>

                    {/* Stats Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
                    >
                        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                    <ShoppingBag size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{coupons.length}</div>
                            <div className="text-xs sm:text-sm text-gray-600">Total Cards</div>
                        </div>

                        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                    <Award size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{activeCoupons}</div>
                            <div className="text-xs sm:text-sm text-gray-600">Active</div>
                        </div>

                        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Wallet size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-gray-900">₹{totalValue}</div>
                            <div className="text-xs sm:text-sm text-gray-600">Total Value</div>
                        </div>

                        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                    <TrendingUp size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-green-600">₹{totalSavings.toFixed(0)}</div>
                            <div className="text-xs sm:text-sm text-gray-600">Total Saved</div>
                        </div>
                    </motion.div>

                    {/* Tabs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="flex gap-2 mb-6 overflow-x-auto pb-2"
                    >
                        {[
                            { id: 'all', label: 'All Cards' },
                            { id: 'active', label: 'Active' },
                            { id: 'used', label: 'Used' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-2.5 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-lg'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:border-[#92BCEA]'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </motion.div>

                    {/* Coupons Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {filteredCoupons.map((coupon, index) => (
                            <motion.div
                                key={coupon.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                className={`bg-white rounded-3xl shadow-lg border overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${coupon.status === 'active' ? 'border-gray-100' : 'border-gray-200 opacity-75'
                                    }`}
                            >
                                {/* Card Header */}
                                <div className={`relative h-40 bg-gradient-to-br ${coupon.gradient} overflow-hidden`}>
                                    {/* Animated Background */}
                                    <div className="absolute inset-0 opacity-20">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse-slow" />
                                    </div>

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${coupon.status === 'active'
                                                ? 'bg-white text-green-600'
                                                : 'bg-white/90 text-gray-600'
                                            }`}>
                                            {coupon.status === 'active' ? '✓ Active' : 'Used'}
                                        </span>
                                    </div>

                                    {/* Brand Logo */}
                                    <div className="absolute top-4 left-4 w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-xl">
                                        {coupon.logo}
                                    </div>

                                    {/* Brand Name */}
                                    <div className="absolute bottom-4 left-4">
                                        <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                                            {coupon.brand}
                                        </h3>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-5 sm:p-6">
                                    {/* Value */}
                                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Face Value</div>
                                            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent">
                                                ₹{coupon.value}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 mb-1">You Paid</div>
                                            <div className="text-xl sm:text-2xl font-bold text-gray-900">₹{coupon.paidAmount}</div>
                                            <div className="text-xs text-green-600 font-semibold">
                                                Saved ₹{(coupon.value - coupon.paidAmount).toFixed(0)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coupon Code */}
                                    <div className="mb-6">
                                        <div className="text-sm font-semibold text-gray-900 mb-3">Coupon Code</div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-base font-bold text-gray-900">
                                                {revealedCodes[coupon.id] ? coupon.code : '••••••••••••'}
                                            </div>
                                            <button
                                                onClick={() => toggleReveal(coupon.id)}
                                                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
                                            >
                                                {revealedCodes[coupon.id] ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                            <button
                                                onClick={() => copyCode(coupon.id, coupon.code)}
                                                className="p-3 bg-[#92BCEA]/10 hover:bg-[#92BCEA]/20 text-[#92BCEA] rounded-2xl transition-all"
                                            >
                                                {copiedCodes[coupon.id] ? <Check size={20} /> : <Copy size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Purchased from</span>
                                            <span className="font-semibold text-gray-900">{coupon.merchant}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Purchase Date</span>
                                            <span className="text-gray-900">{coupon.purchaseDate}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Expiry Date</span>
                                            <span className="text-gray-900">{coupon.expiryDate}</span>
                                        </div>
                                    </div>

                                    {/* How to Use */}
                                    {coupon.status === 'active' && (
                                        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl">
                                            <div className="text-sm text-blue-800">
                                                <div className="font-semibold mb-1">💡 How to use:</div>
                                                <div>Copy the code and apply it at {coupon.brand} checkout</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {filteredCoupons.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="text-center py-16"
                        >
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShoppingBag className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {activeTab === 'all' ? 'No coupons yet' : `No ${activeTab} coupons`}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {activeTab === 'all'
                                    ? 'Start browsing and purchase your first gift card'
                                    : `You don't have any ${activeTab} coupons`
                                }
                            </p>
                            {activeTab === 'all' && (
                                <a
                                    href="/gift-cards"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
                                >
                                    <ShoppingBag size={20} />
                                    Browse Gift Cards
                                </a>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation */}
            <CustomerBottomNav />
        </div>
    );
}
