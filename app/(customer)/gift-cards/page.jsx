'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import GiftCardItem from '@/components/giftcards/GiftCardItem'
import GiftCardSkeleton from '@/components/giftcards/GiftCardSkeleton'
import SearchBar from '@/components/giftcards/SearchBar'
import CategoryFilter from '@/components/giftcards/CategoryFilter'
import HeroSection from '@/components/giftcards/HeroSection'
import { SearchX } from 'lucide-react'

export default function GiftCardsPage() {
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('popular')
    const [selectedCategory, setSelectedCategory] = useState('All')
    const { user, profile } = useAuth()

    const categories = ['All', 'Gift Cards', 'Electronics', 'Fashion', 'Food & Dining', 'Entertainment']

    useEffect(() => {
        fetchCoupons()
    }, [searchQuery, sortBy, selectedCategory])

    async function fetchCoupons() {
        try {
            setLoading(true)

            // Build query - explicitly select fields (never encrypted_code)
            let query = supabase
                .from('coupons')
                .select(`
                    id,
                    brand,
                    title,
                    description,
                    category,
                    face_value_paise,
                    selling_price_paise,
                    masked_code,
                    status,
                    valid_from,
                    valid_until,
                    image_url,
                    tags
                `)
                .eq('status', 'available')
                .gte('valid_until', new Date().toISOString())

            // Apply category filter
            if (selectedCategory !== 'All') {
                const categoryMap = {
                    'Gift Cards': 'gift_cards',
                    'Electronics': 'electronics',
                    'Fashion': 'fashion',
                    'Food & Dining': 'food',
                    'Entertainment': 'entertainment'
                }
                query = query.eq('category', categoryMap[selectedCategory])
            }

            // Apply search filter
            if (searchQuery) {
                query = query.or(`brand.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
            }

            // Apply sorting
            switch (sortBy) {
                case 'discount':
                    query = query.order('selling_price_paise', { ascending: true })
                    break
                case 'price-low':
                    query = query.order('selling_price_paise', { ascending: true })
                    break
                case 'price-high':
                    query = query.order('selling_price_paise', { ascending: false })
                    break
                default: // popular
                    query = query.order('created_at', { ascending: false })
            }

            const { data, error } = await query

            if (error) throw error

            setCoupons(data || [])
        } catch (err) {
            console.error('Error fetching coupons:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Helper functions
    function calculateDiscount(faceValue, sellingPrice) {
        return Math.round(((faceValue - sellingPrice) / faceValue) * 100)
    }

    function getGradientForCategory(category) {
        const gradients = {
            gift_cards: 'from-purple-600 via-purple-500 to-pink-500',
            electronics: 'from-blue-600 via-blue-500 to-cyan-500',
            fashion: 'from-pink-600 via-pink-500 to-rose-500',
            food: 'from-orange-600 via-orange-500 to-yellow-500',
            entertainment: 'from-indigo-600 via-indigo-500 to-purple-500'
        }
        return gradients[category] || 'from-gray-600 via-gray-500 to-gray-400'
    }

    function getBrandLogo(brand) {
        // Simple emoji mapping for brands
        const logos = {
            'Flipkart': '🛒',
            'Amazon': '📦',
            'Myntra': '👗',
            'Swiggy': '🍔',
            'Zomato': '🍕',
            'BookMyShow': '🎬',
            'Uber': '🚗'
        }
        return logos[brand] || brand.charAt(0)
    }

    // Map Supabase data to GiftCardItem props
    function mapCouponToCardProps(coupon) {
        return {
            id: coupon.id,
            brand: coupon.brand,
            value: coupon.face_value_paise / 100,
            sellingPrice: coupon.selling_price_paise / 100,
            discount: calculateDiscount(coupon.face_value_paise, coupon.selling_price_paise),
            merchant: 'INTRUST Platform',
            verified: true,
            rating: 4.8,
            sold: Math.floor(Math.random() * 500) + 100, // Mock for now
            stock: coupon.status === 'available' ? Math.floor(Math.random() * 20) + 5 : 0,
            gradient: getGradientForCategory(coupon.category),
            logo: getBrandLogo(coupon.brand)
        }
    }

    function clearFilters() {
        setSearchQuery('')
        setSelectedCategory('All')
        setSortBy('popular')
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SearchX className="text-red-500" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Coupons</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => fetchCoupons()}
                        className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section - Full Width */}
            <HeroSection />

            {/* Main Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">

                {/* Breadcrumb */}
                <nav className="text-sm text-gray-500 mb-6">
                    <span className="hover:text-gray-900 cursor-pointer transition-colors">Home</span>
                    <span className="mx-2">/</span>
                    <span className="text-gray-900 font-medium">Gift Cards</span>
                </nav>

                {/* Search + Sort Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    {/* Search */}
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search gift cards by brand..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Sort by:
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer text-gray-900 font-medium"
                        >
                            <option value="popular">Most Popular</option>
                            <option value="discount">Highest Discount</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                        </select>
                    </div>
                </div>

                {/* Main Layout - Responsive */}
                <div className="flex flex-col lg:flex-row gap-8">


                    {/* Sidebar - Filters */}
                    <aside className="w-full lg:w-72 flex-shrink-0">
                        <div className="bg-white rounded-xl shadow-sm p-5 lg:sticky lg:top-8">
                            {/* Filter Title */}
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                                Categories
                            </h3>

                            {/* Category List */}
                            <div className="space-y-2">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>

                            {/* Item Count */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    {loading ? (
                                        <span className="text-gray-400">Loading items...</span>
                                    ) : (
                                        <>
                                            <span className="font-bold text-gray-900 text-lg">{coupons.length}</span>
                                            <span className="ml-1">items available</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {loading ? (
                            /* Loading State */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                                    <GiftCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : coupons.length === 0 ? (
                            /* Empty State */
                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                                        <SearchX className="text-gray-400" size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        No Gift Cards Found
                                    </h3>
                                    <p className="text-gray-500 text-base mb-6">
                                        We couldn't find any gift cards matching your filters.
                                    </p>
                                    <button
                                        onClick={clearFilters}
                                        className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Product Grid */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {coupons.map((coupon, index) => (
                                    <GiftCardItem
                                        key={coupon.id}
                                        coupon={mapCouponToCardProps(coupon)}
                                        index={index}
                                    />
                                ))}
                            </div>
                        )}
                    </main>

                </div>
            </div>
        </div>
    )
}
