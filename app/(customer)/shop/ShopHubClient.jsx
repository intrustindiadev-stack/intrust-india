'use client';

import { useState, useCallback } from 'react';
import { Package, X, Store } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import HeroIllustrativeAd from '@/components/customer/shop/HeroIllustrativeAd';
import AdBannerCarousel from '@/components/customer/dashboard/AdBannerCarousel';
import UtilityBar from '@/components/mart/UtilityBar';
import StoreCard from '@/components/mart/StoreCard';

export default function ShopHubClient({ merchants = [], ratingsMap = {}, categories = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const router = useRouter();
    const { profile } = useAuth();

    const handleRefresh = useCallback(async () => {
        router.refresh();
        await new Promise(resolve => setTimeout(resolve, 800));
    }, [router]);

    const official = merchants.find(m => m.id === 'official');
    const rest = merchants.filter(m => m.id !== 'official');
    
    // Sort logic (using top rated for "Top Stores")
    const topStoresList = [...rest].sort((a, b) => {
        const ratingA = ratingsMap[a.id]?.avg_rating || 4.0;
        const ratingB = ratingsMap[b.id]?.avg_rating || 4.0;
        return ratingB - ratingA;
    }).slice(0, 7);

    const topStores = [];
    if (official) topStores.push(official);
    topStores.push(...topStoresList);

    const exploreStores = [...rest].filter(m => {
        if (searchQuery && !m.business_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedCategory && m.category_id !== selectedCategory && m.category !== selectedCategory) return false;
        return true;
    });

    const mapMerchantToStore = (m) => ({
        id: m.id,
        slug: m.slug,
        name: m.business_name || (m.id === 'official' ? 'Intrust Official Store' : 'Store'),
        category: m.category || 'General',
        rating: ratingsMap[m.id]?.avg_rating || (m.id === 'official' ? 4.9 : 4.2),
        bannerImage: m.shopping_banner_url || (m.id === 'official' ? "/images/intrust_mart_bg.png" : null),
        logo: m.user_profiles?.avatar_url || null,
        deliveryTime: '25-35 mins',
        isOfficial: m.id === 'official'
    });

    return (
        <>
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white z-[110] shadow-2xl flex flex-col"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-xl font-black text-gray-900">Filters</h2>
                                <button onClick={() => setIsFilterOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto">
                                <p className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">Filter Options</p>
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors border border-transparent">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="font-bold text-gray-700">Free Delivery</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors border border-transparent">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="font-bold text-gray-700">Top Rated (4.5+)</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors border border-transparent">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="font-bold text-gray-700">Open Now</span>
                                    </label>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3">
                                <button onClick={() => setIsFilterOpen(false)} className="flex-1 py-3 px-4 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                    Clear
                                </button>
                                <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-3 px-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                                    Apply
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <PullToRefresh onRefresh={handleRefresh}>
                <div className="bg-white min-h-screen pb-24">
                    
                    {/* 1. Utility Bar */}
                    <UtilityBar storeCount={merchants.length} locationName="Current Location" currentPageName="Stores" />

                    {/* 2. Hero Banner */}
                    <div className="max-w-7xl mx-auto px-4 mt-6">
                        <HeroIllustrativeAd />
                    </div>

                    {/* 3. Stores Section (Top Stores Near You) */}
                    <section className="max-w-7xl mx-auto px-4 mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Top Stores Near You</h2>
                            <Link href="/shop" className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
                                View all
                            </Link>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {topStores.map((merchant) => (
                                <StoreCard key={merchant.id} store={mapMerchantToStore(merchant)} />
                            ))}
                        </div>
                    </section>

                    {/* 4. Categories Section */}
                    {categories.length > 0 && (
                        <section className="max-w-7xl mx-auto px-4 mt-10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Shop by Category</h2>
                                <button onClick={() => toast.success('Showing all categories')} className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
                                    View all
                                </button>
                            </div>
                            <div className="flex sm:grid sm:grid-cols-6 gap-3 overflow-x-auto no-scrollbar w-max sm:w-full pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
                                {categories.map(cat => (
                                    <div 
                                        key={cat.id} 
                                        onClick={() => {
                                            setSelectedCategory(cat.id === selectedCategory ? null : cat.id);
                                        }}
                                        className={`bg-white border ${selectedCategory === cat.id ? 'border-blue-400 shadow-sm' : 'border-gray-100'} rounded-xl p-4 text-center hover:border-blue-200 transition-colors cursor-pointer min-w-[96px]`}
                                    >
                                        <div className="w-8 h-8 mx-auto flex items-center justify-center text-blue-600">
                                            {cat.icon_url ? (
                                                <Image src={cat.icon_url} alt={cat.name} width={32} height={32} className="object-contain" />
                                            ) : (
                                                <span className="text-xl">{cat.name.includes('Food') ? '🍔' : '🛍️'}</span>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-700 mt-2 truncate">
                                            {cat.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 5. Ad Banner Carousel (Moved below stores and categories) */}
                    <div className="max-w-7xl mx-auto px-4 mt-10">
                        <AdBannerCarousel />
                    </div>

                    {/* 6. Stores to Explore (Products/Stores block) */}
                    <section className="max-w-7xl mx-auto px-4 mt-10">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-gray-900">Stores to Explore</h2>
                            <button onClick={() => toast.success('Showing all stores')} className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
                                View all
                            </button>
                        </div>

                        {exploreStores.length === 0 ? (
                            <div className="text-center py-12">
                                <Store className="w-10 h-10 text-gray-300 mx-auto" />
                                <p className="text-sm text-gray-400 mt-3">No stores near you yet</p>
                                <p className="text-xs text-gray-400 mt-1">Try changing your location</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
                                {exploreStores.map((merchant) => (
                                    <StoreCard key={merchant.id} store={mapMerchantToStore(merchant)} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </PullToRefresh>
        </>
    );
}
