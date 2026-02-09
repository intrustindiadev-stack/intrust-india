'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { Gift, Copy, Check, Eye, EyeOff, ShoppingBag, TrendingUp, Wallet, Award, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export default function MyCouponsPage() {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all, active, used

    // Decryption states
    const [revealedCodes, setRevealedCodes] = useState({}); // Stores the actual codes
    const [decryptingIds, setDecryptingIds] = useState({}); // Stores which IDs are currently decrypting
    const [copiedCodes, setCopiedCodes] = useState({});

    useEffect(() => {
        if (user) {
            fetchMyCoupons();
            fetchMyTransactions();
        }
    }, [user]);

    async function fetchMyCoupons() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('purchased_by', user?.id)
                .order('purchased_at', { ascending: false });

            if (error) throw error;
            setCoupons(data || []);
        } catch (err) {
            console.error('Error fetching coupons:', err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchMyTransactions() {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        }
    }

    const toggleReveal = async (couponId) => {
        // If already revealed, hide it (remove from state)
        if (revealedCodes[couponId]) {
            setRevealedCodes(prev => {
                const newState = { ...prev };
                delete newState[couponId];
                return newState;
            });
            return;
        }

        // If not revealed, decrypt it
        try {
            setDecryptingIds(prev => ({ ...prev, [couponId]: true }));

            const response = await fetch(`/api/my-coupons/${couponId}/decrypt`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to decrypt code');
            }

            setRevealedCodes(prev => ({ ...prev, [couponId]: data.encrypted_code })); // API returns decrypted code in 'encrypted_code' field name based on previous file
        } catch (err) {
            console.error('Error decrypting code:', err);
            alert(err.message || 'Failed to decrypt code');
        } finally {
            setDecryptingIds(prev => ({ ...prev, [couponId]: false }));
        }
    };

    const copyCode = (id, code) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedCodes(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
            setCopiedCodes(prev => ({ ...prev, [id]: false }));
        }, 2000);
    };

    // Helper functions for UI mapping
    const getBrandGradient = (brand) => {
        const brands = {
            'Flipkart': 'from-blue-600 via-blue-500 to-cyan-500',
            'Amazon': 'from-orange-500 via-amber-500 to-yellow-500',
            'Swiggy': 'from-orange-600 via-red-500 to-pink-500',
            'Zomato': 'from-red-600 via-red-500 to-pink-500',
            'Myntra': 'from-pink-600 via-fuchsia-500 to-purple-500',
            'Uber': 'from-gray-900 via-gray-800 to-gray-700',
        };
        return brands[brand] || 'from-indigo-600 via-purple-500 to-pink-500'; // Default gradient
    };

    const getBrandLogo = (brand) => {
        const logos = {
            'Flipkart': '🛒',
            'Amazon': '📦',
            'Swiggy': '🍔',
            'Zomato': '🍕',
            'Myntra': '👗',
            'Uber': '🚗',
        };
        return logos[brand] || '🎁';
    };

    // Merge Coupon Data with Transaction Data for UI
    const processedCoupons = coupons.map(coupon => {
        const transaction = transactions.find(t => t.coupon_id === coupon.id);
        const isExpired = new Date(coupon.valid_until) < new Date();

        // Map status
        let uiStatus = 'active';
        if (isExpired) uiStatus = 'expired';
        if (coupon.status === 'used') uiStatus = 'used'; // Assuming DB updates status to 'used' eventually
        // Note: DB currently uses 'sold' for active coupons.
        if (coupon.status === 'sold' && !isExpired) uiStatus = 'active';

        return {
            ...coupon,
            uiStatus,
            paidAmount: transaction ? transaction.total_paid_paise / 100 : 0,
            faceValue: coupon.face_value_paise / 100,
            gradient: getBrandGradient(coupon.brand),
            logo: getBrandLogo(coupon.brand),
            merchant: 'INTRUST Marketplace', // Default for now
            formattedDate: new Date(coupon.purchased_at).toLocaleDateString(),
            formattedExpiry: new Date(coupon.valid_until).toLocaleDateString()
        };
    });

    const filteredCoupons = processedCoupons.filter(coupon => {
        if (activeTab === 'all') return true;
        return coupon.uiStatus === activeTab;
    });

    // Stats
    const totalValue = processedCoupons.reduce((sum, c) => sum + c.faceValue, 0);
    const totalPaid = processedCoupons.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalSavings = totalValue - totalPaid;
    const activeCount = processedCoupons.filter(c => c.uiStatus === 'active').length;

    if (loading && coupons.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

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
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{activeCount}</div>
                            <div className="text-xs sm:text-sm text-gray-600">Active</div>
                        </div>

                        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Wallet size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-gray-900">₹{totalValue.toFixed(0)}</div>
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
                            { id: 'used', label: 'Used / Expired' }
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
                                className={`bg-white rounded-3xl shadow-lg border overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${coupon.uiStatus === 'active' ? 'border-gray-100' : 'border-gray-200 opacity-75'
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
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${coupon.uiStatus === 'active'
                                            ? 'bg-white text-green-600'
                                            : 'bg-white/90 text-gray-600'
                                            }`}>
                                            {coupon.uiStatus === 'active' ? '✓ Active' : coupon.uiStatus}
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
                                                ₹{coupon.faceValue}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 mb-1">You Paid</div>
                                            <div className="text-xl sm:text-2xl font-bold text-gray-900">₹{coupon.paidAmount}</div>
                                            <div className="text-xs text-green-600 font-semibold">
                                                Saved ₹{(coupon.faceValue - coupon.paidAmount).toFixed(0)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coupon Code */}
                                    <div className="mb-6">
                                        <div className="text-sm font-semibold text-gray-900 mb-3">Coupon Code</div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-base font-bold text-gray-900">
                                                {revealedCodes[coupon.id] ? revealedCodes[coupon.id] : '••••••••••••'}
                                            </div>
                                            <button
                                                onClick={() => toggleReveal(coupon.id)}
                                                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all disabled:opacity-50"
                                                disabled={decryptingIds[coupon.id]}
                                            >
                                                {decryptingIds[coupon.id] ? (
                                                    <Loader2 size={20} className="animate-spin" />
                                                ) : revealedCodes[coupon.id] ? (
                                                    <EyeOff size={20} />
                                                ) : (
                                                    <Eye size={20} />
                                                )}
                                            </button>

                                            {revealedCodes[coupon.id] && (
                                                <button
                                                    onClick={() => copyCode(coupon.id, revealedCodes[coupon.id])}
                                                    className="p-3 bg-[#92BCEA]/10 hover:bg-[#92BCEA]/20 text-[#92BCEA] rounded-2xl transition-all"
                                                >
                                                    {copiedCodes[coupon.id] ? <Check size={20} /> : <Copy size={20} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Merchant</span>
                                            <span className="font-semibold text-gray-900">{coupon.merchant}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Purchased</span>
                                            <span className="text-gray-900">{coupon.formattedDate}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Expires</span>
                                            <span className="text-gray-900">{coupon.formattedExpiry}</span>
                                        </div>
                                    </div>

                                    {/* How to Use */}
                                    {coupon.uiStatus === 'active' && (
                                        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl">
                                            <div className="text-sm text-blue-800">
                                                <div className="font-semibold mb-1">💡 How to use:</div>
                                                <div>Decrypt, copy the code, and apply it at {coupon.brand} checkout</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {!loading && filteredCoupons.length === 0 && (
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
