'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { TrendingUp, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import SearchBar from '@/components/giftcards/SearchBar';
import CategoryFilter from '@/components/giftcards/CategoryFilter';
import GiftCardItem from '@/components/giftcards/GiftCardItem';
import GiftCardSkeleton from '@/components/giftcards/GiftCardSkeleton';
import AdvancedFilters from '@/components/giftcards/AdvancedFilters';
import HeroSection from '@/components/giftcards/HeroSection';
import TrustBadges from '@/components/giftcards/TrustBadges';
import StatsBar from '@/components/giftcards/StatsBar';
import DealsBanner from '@/components/customer/DealsBanner';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function GiftCardsPage() {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('popular');
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        priceRange: null,
        minDiscount: null,
        inStockOnly: false,
        verifiedOnly: false,
        minRating: null,
    });

    // Simulate loading
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Mock data for gift cards
    const coupons = [
        {
            id: 1,
            brand: 'Flipkart',
            value: 500,
            sellingPrice: 463.50,
            discount: 7.3,
            rating: 4.8,
            sold: 856,
            merchant: 'Ravi Traders',
            verified: true,
            category: 'Shopping',
            stock: 25,
            gradient: 'from-blue-600 via-blue-500 to-cyan-500',
            logo: '🛒'
        },
        {
            id: 2,
            brand: 'Amazon',
            value: 1000,
            sellingPrice: 940.00,
            discount: 6.0,
            rating: 4.9,
            sold: 1240,
            merchant: 'Gift Hub',
            verified: true,
            category: 'Shopping',
            stock: 12,
            gradient: 'from-orange-500 via-amber-500 to-yellow-500',
            logo: '📦'
        },
        {
            id: 3,
            brand: 'Swiggy',
            value: 500,
            sellingPrice: 425.00,
            discount: 15.0,
            rating: 4.7,
            sold: 450,
            merchant: 'Food Deals',
            verified: true,
            category: 'Food',
            stock: 100,
            gradient: 'from-orange-600 via-red-500 to-pink-500',
            logo: '🍔'
        },
        {
            id: 4,
            brand: 'Zomato',
            value: 250,
            sellingPrice: 212.50,
            discount: 15.0,
            rating: 4.6,
            sold: 320,
            merchant: 'Food Deals',
            verified: true,
            category: 'Food',
            stock: 5,
            gradient: 'from-red-600 via-pink-500 to-rose-500',
            logo: '🍕'
        },
        {
            id: 5,
            brand: 'Myntra',
            value: 2000,
            sellingPrice: 1800.00,
            discount: 10.0,
            rating: 4.8,
            sold: 670,
            merchant: 'Fashion Store',
            verified: false,
            category: 'Shopping',
            stock: 0,
            gradient: 'from-pink-600 via-purple-500 to-indigo-500',
            logo: '👗'
        },
        {
            id: 6,
            brand: 'BookMyShow',
            value: 500,
            sellingPrice: 400.00,
            discount: 20.0,
            rating: 4.9,
            sold: 210,
            merchant: 'Ent. World',
            verified: true,
            category: 'Entertainment',
            stock: 50,
            gradient: 'from-purple-600 via-violet-500 to-indigo-500',
            logo: '🎬'
        }
    ];

    const categories = ['All', 'Shopping', 'Food', 'Entertainment', 'Travel'];

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Navbar />

            {/* Main Content with 15vh top spacing */}
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

                    {/* Promotional Banner */}
                    <div className="mb-8">
                        <DealsBanner />
                    </div>

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
                                <GiftCardItem key={coupon.id} coupon={coupon} index={index} />
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

            {/* Bottom Navigation */}
            <CustomerBottomNav />
        </div>
    );
}
