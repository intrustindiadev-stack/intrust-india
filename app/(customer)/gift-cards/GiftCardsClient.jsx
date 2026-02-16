'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Search, AlertCircle, Store } from 'lucide-react';
import Navbar from '../../../components/layout/Navbar';
import Breadcrumbs from './components/Breadcrumbs';
import SearchBar from './components/SearchBar';
import CategoryFilter from './components/CategoryFilter';
import GiftCardItem from './components/GiftCardItem';
import GiftCardSkeleton from './components/GiftCardSkeleton';
import AdvancedFilters from './components/AdvancedFilters';
import HeroSection from './components/HeroSection';
import TrustBadges from './components/TrustBadges';
import StatsBar from './components/StatsBar';
import Footer from '../../../components/layout/Footer';

// Transform Supabase data to match UI expectations
const transformCouponData = (coupon) => {
    const sellingPrice = coupon.selling_price_paise / 100;
    const faceValue = coupon.face_value_paise / 100;
    const discount = ((faceValue - sellingPrice) / faceValue) * 100;

    const gradients = {
        'Shopping': 'from-blue-600 via-blue-500 to-cyan-500',
        'Food': 'from-orange-600 via-red-500 to-pink-500',
        'Entertainment': 'from-purple-600 via-violet-500 to-indigo-500',
        'Travel': 'from-green-600 via-emerald-500 to-teal-500',
        'Electronics': 'from-yellow-600 via-amber-500 to-orange-500',
        'Gaming': 'from-pink-600 via-purple-500 to-indigo-500',
        'Fashion': 'from-pink-600 via-purple-500 to-indigo-500',
    };

    const emojis = {
        'Shopping': '🛒',
        'Food': '🍔',
        'Entertainment': '🎬',
        'Travel': '✈️',
        'Electronics': '⚡',
        'Gaming': '🎮',
        'Fashion': '👗',
    };

    return {
        id: coupon.id,
        brand: coupon.brand,
        value: faceValue,
        sellingPrice: sellingPrice,
        discount: parseFloat(discount.toFixed(1)),
        rating: 4.5 + (Math.random() * 0.4),
        sold: Math.floor(Math.random() * 1000) + 100,
        // NEW: Display merchant name from database
        merchant: coupon.merchant_name || coupon.merchant?.business_name || 'INTRUST Verified',
        merchantId: coupon.merchant_id,
        verified: true,
        category: coupon.category,
        stock: 50,
        gradient: gradients[coupon.category] || 'from-gray-600 via-gray-500 to-slate-500',
        logo: emojis[coupon.category] || '🎁',
        title: coupon.title || coupon.brand,
        description: coupon.description || "Get instant access to this premium gift card. Valid on all products.",
        image_url: coupon.image_url,
    };
};

export default function GiftCardsClient({ initialCoupons }) {
    // UI States
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('popular');
    const [merchantFilter, setMerchantFilter] = useState('all');

    // Advanced Filter States
    const [filters, setFilters] = useState({
        priceRange: null,
        minDiscount: null,
        inStockOnly: false,
        verifiedOnly: false,
        minRating: null,
    });

    // Transform data
    const coupons = useMemo(() =>
        (initialCoupons || []).map(transformCouponData),
        [initialCoupons]
    );

    // Extract unique categories
    const categories = useMemo(() =>
        ['All', ...new Set(coupons.map(c => c.category))],
        [coupons]
    );

    // Extract unique merchants
    const merchants = useMemo(() =>
        ['all', ...new Set(coupons.map(c => c.merchant).filter(Boolean))].sort(),
        [coupons]
    );

    // Apply all filters with useMemo for performance
    const filteredCoupons = useMemo(() => {
        return coupons.filter(c => {
            const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
            const matchesSearch = c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.merchant.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesMerchant = merchantFilter === 'all' || c.merchant === merchantFilter;
            const matchesPrice = !filters.priceRange ||
                (c.sellingPrice >= filters.priceRange[0] && c.sellingPrice <= filters.priceRange[1]);
            const matchesDiscount = !filters.minDiscount || c.discount >= filters.minDiscount;
            const matchesStock = !filters.inStockOnly || c.stock > 0;
            const matchesVerified = !filters.verifiedOnly || c.verified;
            const matchesRating = !filters.minRating || c.rating >= filters.minRating;

            return matchesCategory && matchesSearch && matchesMerchant && matchesPrice &&
                matchesDiscount && matchesStock && matchesVerified && matchesRating;
        });
    }, [coupons, selectedCategory, searchQuery, merchantFilter, filters]);

    // Sort coupons with useMemo
    const sortedCoupons = useMemo(() => {
        return [...filteredCoupons].sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.sellingPrice - b.sellingPrice;
                case 'price-high':
                    return b.sellingPrice - a.sellingPrice;
                case 'discount':
                    return b.discount - a.discount;
                case 'rating':
                    return b.rating - a.rating;
                case 'popular':
                default:
                    return b.sold - a.sold;
            }
        });
    }, [filteredCoupons, sortBy]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Navbar />

            <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <Breadcrumbs items={[{ label: 'Gift Cards' }]} />
                    <HeroSection />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mb-8"
                    >
                        <TrustBadges />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-8"
                    >
                        <StatsBar />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="mb-6"
                    >
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <SearchBar
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                />
                            </div>
                            <AdvancedFilters
                                filters={filters}
                                setFilters={setFilters}
                                onApply={() => { }}
                            />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-8"
                    >
                        <CategoryFilter
                            categories={categories}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                        />
                    </motion.div>

                    {/* NEW: Merchant Filter */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Store className="text-[#92BCEA]" size={24} />
                            <h3 className="text-lg font-bold text-gray-900">Filter by Merchant</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setMerchantFilter('all')}
                                className={`px-5 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 ${merchantFilter === 'all'
                                    ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-lg'
                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#92BCEA]'
                                    }`}
                            >
                                All Merchants
                            </button>
                            {merchants.slice(1).map((merchant) => (
                                <button
                                    key={merchant}
                                    onClick={() => setMerchantFilter(merchant)}
                                    className={`px-5 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 ${merchantFilter === merchant
                                        ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-lg'
                                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#92BCEA]'
                                        }`}
                                >
                                    {merchant}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            className="text-gray-600"
                        >
                            Showing <span className="font-bold text-gray-900">{sortedCoupons.length}</span> gift cards
                            {merchantFilter !== 'all' && (
                                <span className="ml-1">from <span className="font-bold text-[#92BCEA]">{merchantFilter}</span></span>
                            )}
                        </motion.div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <TrendingUp size={16} />
                            <span className="hidden sm:inline">Updated just now</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                        {sortedCoupons.map((coupon, index) => (
                            <GiftCardItem
                                key={coupon.id}
                                coupon={coupon}
                                index={index}
                            />
                        ))}
                    </div>

                    {sortedCoupons.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-16"
                        >
                            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                                <Search size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">No cards found</h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Try adjusting your search or filters to find what you're looking for
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('All');
                                    setMerchantFilter('all');
                                    setFilters({
                                        priceRange: null,
                                        minDiscount: null,
                                        inStockOnly: false,
                                        verifiedOnly: false,
                                        minRating: null,
                                    });
                                }}
                                className="px-8 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#92BCEA]/30 transition-all"
                            >
                                Clear All Filters
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}
