'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Search, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import Navigation from './components/Navigation';
import Breadcrumbs from './components/Breadcrumbs';
import SearchBar from './components/SearchBar';
import CategoryFilter from './components/CategoryFilter';
import GiftCardItem from './components/GiftCardItem';
import GiftCardSkeleton from './components/GiftCardSkeleton';
import AdvancedFilters from './components/AdvancedFilters';
import HeroSection from './components/HeroSection';
import TrustBadges from './components/TrustBadges';
import StatsBar from './components/StatsBar';

// Transform Supabase data to match yogesh UI expectations
const transformCouponData = (coupon) => {
    const sellingPrice = coupon.selling_price_paise / 100;
    const faceValue = coupon.face_value_paise / 100;
    const discount = ((faceValue - sellingPrice) / faceValue) * 100;

    // Generate gradient based on category
    const gradients = {
        'Shopping': 'from-blue-600 via-blue-500 to-cyan-500',
        'Food': 'from-orange-600 via-red-500 to-pink-500',
        'Entertainment': 'from-purple-600 via-violet-500 to-indigo-500',
        'Travel': 'from-green-600 via-emerald-500 to-teal-500',
        'Electronics': 'from-yellow-600 via-amber-500 to-orange-500',
        'Gaming': 'from-pink-600 via-purple-500 to-indigo-500',
        'Fashion': 'from-pink-600 via-purple-500 to-indigo-500',
    };

    // Generate emoji based on category
    const emojis = {
        '  Shopping': '🛒',
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
        rating: 4.5 + (Math.random() * 0.4), // Default rating 4.5-4.9
        sold: Math.floor(Math.random() * 1000) + 100, // Random sold count
        merchant: 'INTRUST Verified',
        verified: true,
        category: coupon.category,
        stock: 50, // Default stock
        gradient: gradients[coupon.category] || 'from-gray-600 via-gray-500 to-slate-500',
        logo: emojis[coupon.category] || '🎁',
        title: coupon.title || coupon.brand,
        description: coupon.description || "Get instant access to this premium gift card. Valid on all products.",
    };
};

export default function GiftCardsPage() {
    // UI States
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('popular');
    const [expandedId, setExpandedId] = useState(null);

    // Data States (from Supabase)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [coupons, setCoupons] = useState([]);

    // Advanced Filter States
    const [filters, setFilters] = useState({
        priceRange: null,
        minDiscount: null,
        inStockOnly: false,
        verifiedOnly: false,
        minRating: null,
    });

    // Fetch gift cards from Supabase
    const fetchGiftCards = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('coupons')
                .select('*')
                .eq('status', 'available')
                .gte('valid_until', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            // Transform Supabase data to yogesh UI format
            const transformedData = (data || []).map(transformCouponData);
            setCoupons(transformedData);

        } catch (err) {
            console.error('Error fetching gift cards:', err);
            setError(err.message || 'Failed to load gift cards. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGiftCards();
    }, []);

    // Extract unique categories from coupons
    const categories = ['All', ...new Set(coupons.map(c => c.category))];

    // Apply all filters
    const filteredCoupons = coupons.filter(c => {
        const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
        const matchesSearch = c.brand.toLowerCase().includes(searchQuery.toLowerCase());

        // Price range filter
        const matchesPrice = !filters.priceRange ||
            (c.sellingPrice >= filters.priceRange[0] && c.sellingPrice <= filters.priceRange[1]);

        // Discount filter
        const matchesDiscount = !filters.minDiscount || c.discount >= filters.minDiscount;

        // Stock filter
        const matchesStock = !filters.inStockOnly || c.stock > 0;

        // Verified filter
        const matchesVerified = !filters.verifiedOnly || c.verified;

        // Rating filter
        const matchesRating = !filters.minRating || c.rating >= filters.minRating;

        return matchesCategory && matchesSearch && matchesPrice && matchesDiscount &&
            matchesStock && matchesVerified && matchesRating;
    });

    // Sort coupons
    const sortedCoupons = [...filteredCoupons].sort((a, b) => {
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

    // Error State UI
    if (error && !loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
                <div className="text-center py-16 px-6">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={24} className="text-red-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchGiftCards}
                        className="px-4 py-2 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-lg text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            {/* Use existing INTRUST Navigation */}
            <Navigation />

            {/* Main Content with spacing for fixed navbar */}
            <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumbs */}
                    <Breadcrumbs items={[{ label: 'Gift Cards' }]} />

                    {/* Premium Hero Section */}
                    <HeroSection />

                    {/* Trust Badges */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mb-8"
                    >
                        <TrustBadges />
                    </motion.div>

                    {/* Stats Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-8"
                    >
                        <StatsBar />
                    </motion.div>

                    {/* Search & Filter */}
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

                    {/* Categories */}
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

                    {/* Results Count */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">
                            {sortedCoupons.length} {sortedCoupons.length === 1 ? 'Card' : 'Cards'} Available
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <TrendingUp size={16} />
                            <span className="hidden sm:inline">Updated just now</span>
                        </div>
                    </div>

                    {/* Cards Grid */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                            {[...Array(8)].map((_, i) => (
                                <GiftCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                            {sortedCoupons.map((coupon, index) => (
                                <GiftCardItem
                                    key={coupon.id}
                                    coupon={coupon}
                                    index={index}
                                    isExpanded={expandedId === coupon.id}
                                    onToggle={() => setExpandedId(expandedId === coupon.id ? null : coupon.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && sortedCoupons.length === 0 && (
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
        </div>
    );
}
