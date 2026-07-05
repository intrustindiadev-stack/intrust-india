'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, MapPin, Star, ShieldCheck, Heart, Sparkles, Package, Bell, SlidersHorizontal, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import HeroIllustrativeAd from '@/components/customer/shop/HeroIllustrativeAd';
import AdBannerCarousel from '@/components/customer/dashboard/AdBannerCarousel';

const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PC9zdmc+';

const FeedCard = memo(function FeedCard({ merchant, rating, isOpen, isOfficial, priority, horizontal = false }) {
    const [isSaved, setIsSaved] = useState(false);
    
    const defaultBanners = [
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=800'
    ];
    const defaultBannerIndex = (merchant.id?.charCodeAt(0) || 0) % defaultBanners.length;
    const bannerImage = merchant.shopping_banner_url || defaultBanners[defaultBannerIndex];
    const mockOffer = Math.random() > 0.5 ? 'Free delivery' : 'Assured Quality';

    return (
        <Link href={isOfficial ? "/shop/official" : `/shop/${merchant.slug}`} className={`block group ${horizontal ? 'min-w-[280px] sm:min-w-[320px]' : 'h-full'}`}>
            <motion.div 
                whileHover={{ y: -6 }}
                className="bg-white dark:bg-[#12141c] rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] transition-all duration-500 flex flex-col border border-slate-100 dark:border-slate-800 h-full"
            >
                {/* ── Image Header ── */}
                <div className={`relative w-full overflow-hidden ${horizontal ? 'aspect-[4/3]' : 'aspect-[16/9] sm:aspect-[4/3]'}`}>
                    <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-10" />
                    <Image
                        src={isOfficial ? "/images/intrust_mart_bg.png" : bannerImage}
                        alt={merchant.business_name || 'Intrust Store'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading={priority ? 'eager' : 'lazy'}
                        priority={priority}
                        placeholder="blur"
                        blurDataURL={BLUR_PLACEHOLDER}
                    />
                    
                    <button 
                        onClick={(e) => { e.preventDefault(); setIsSaved(!isSaved); }}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center transition-colors hover:bg-white shadow-sm z-20"
                    >
                        <Heart size={20} className={isSaved ? "fill-rose-500 text-rose-500" : "text-slate-700"} />
                    </button>
                </div>

                {/* ── Content Area ── */}
                <div className="p-5 flex-1 flex flex-col bg-white dark:bg-[#12141c]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 overflow-hidden relative shrink-0 border border-slate-100 dark:border-slate-700 shadow-sm">
                            {merchant.user_profiles?.avatar_url ? (
                                <Image src={merchant.user_profiles.avatar_url} fill alt="Avatar" className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-lg shadow-inner">
                                    {merchant.business_name?.[0]?.toUpperCase() || 'M'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-[17px] font-black text-slate-900 dark:text-white line-clamp-1 leading-tight tracking-tight">
                                {isOfficial ? 'Intrust Mart' : merchant.business_name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                                <MapPin size={12} className="text-indigo-400" />
                                <span className="truncate">{merchant.business_address?.split(',')[0] || (isOfficial ? 'Premium Fulfillment Hub' : 'Local Area')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-auto flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-xl flex-1 justify-center border border-amber-100 dark:border-amber-500/20">
                                <Star size={14} className="fill-amber-500 text-amber-500" />
                                <span className="text-sm font-black text-amber-700 dark:text-amber-400">{rating?.avg_rating || (isOfficial ? 4.9 : 4.2)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl flex-1 justify-center border border-emerald-100 dark:border-emerald-500/20 text-[13px] font-black text-emerald-700 dark:text-emerald-400">
                                {mockOffer}
                            </div>
                        </div>
                        <button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-3.5 rounded-xl text-[13px] uppercase tracking-widest transition-all shadow-md active:scale-95 hover:bg-slate-800 dark:hover:bg-slate-100">
                            Visit Store
                        </button>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
});

export default function ShopHubClient({ merchants = [], ratingsMap = {}, categories = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
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
    const topStores = [...rest].sort((a, b) => {
        const ratingA = ratingsMap[a.id]?.avg_rating || 4.0;
        const ratingB = ratingsMap[b.id]?.avg_rating || 4.0;
        return ratingB - ratingA;
    }).slice(0, 5);

    const exploreStores = [...rest].filter(m => {
        if (searchQuery && !m.business_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedCategory && m.category_id !== selectedCategory && m.category !== selectedCategory) return false;
        return true;
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
                            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white dark:bg-[#080a10] z-[110] shadow-2xl flex flex-col"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">Filters</h2>
                                <button onClick={() => setIsFilterOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto">
                                <p className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">Filter Options</p>
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="font-bold text-gray-700 dark:text-gray-300">Free Delivery</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="font-bold text-gray-700 dark:text-gray-300">Top Rated (4.5+)</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="font-bold text-gray-700 dark:text-gray-300">Open Now</span>
                                    </label>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                                <button onClick={() => setIsFilterOpen(false)} className="flex-1 py-3 px-4 font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
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
                <div className="bg-[#f7f8fa] dark:bg-[#080a10] min-h-screen pb-24 font-[family-name:var(--font-outfit)]">
                
                {/* ── Search Header (Image 3 Style) ── */}
                <div className="pt-2 pb-6 px-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between mb-6 h-12">
                        {isSearchOpen ? (
                            <div className="flex-1 flex items-center gap-3 bg-white dark:bg-gray-800 rounded-full px-4 h-full shadow-sm border border-gray-100 dark:border-gray-700 w-full">
                                <Search size={20} className="text-gray-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search stores..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                                        <X size={16} />
                                    </button>
                                )}
                                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-[13px] font-bold text-gray-400 hover:text-gray-600 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                                        {profile?.avatar_url ? (
                                            <Image src={profile.avatar_url} alt="Profile" width={48} height={48} className="object-cover w-full h-full" />
                                        ) : (
                                            <Image src="/logo.png" alt="InTrust" width={28} height={28} className="object-contain" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Delivering to</p>
                                        <p className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-1">
                                            Current Location <ChevronRight size={14} className="text-gray-400" />
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <button 
                                        onClick={() => setIsSearchOpen(true)}
                                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-900 dark:text-white transition-transform hover:scale-105 border border-gray-100 dark:border-gray-700"
                                    >
                                        <Search size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setIsFilterOpen(true)}
                                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-900 dark:text-white transition-transform hover:scale-105 border border-gray-100 dark:border-gray-700"
                                    >
                                        <SlidersHorizontal size={18} />
                                    </button>
                                    <button 
                                        onClick={() => toast.success('You have no new notifications.')}
                                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-900 dark:text-white transition-transform hover:scale-105 border border-gray-100 dark:border-gray-700 relative"
                                    >
                                        <Bell size={18} />
                                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    
                    {/* ── Hero Ad ── */}
                    <div className="mb-6">
                        <HeroIllustrativeAd />
                    </div>

                    {/* ── Ad Banner Carousel ── */}
                    <div className="mb-10">
                        <AdBannerCarousel />
                    </div>

                    {/* ── Categories ── */}
                    {categories.length > 0 && (
                        <div className="mb-10">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Categories</h2>
                                <button onClick={() => toast.success('Showing all categories')} className="text-[13px] font-bold text-blue-600 hover:underline">See all</button>
                            </div>
                            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id} 
                                        onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                                        className="flex flex-col items-center gap-3 flex-shrink-0"
                                    >
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgb(0,0,0,0.06)] transition-transform hover:scale-110 ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white dark:bg-gray-800'}`}>
                                            {cat.icon_url ? (
                                                <Image src={cat.icon_url} alt={cat.name} width={32} height={32} />
                                            ) : (
                                                <span className="text-2xl">{cat.name.includes('Food') ? '🍔' : '🛍️'}</span>
                                            )}
                                        </div>
                                        <span className={`text-[13px] font-bold ${selectedCategory === cat.id ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {cat.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Top Stores (Horizontal) ── */}
                    {!searchQuery && (
                        <div className="mb-10">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Top Stores</h2>
                                <button onClick={() => toast.success('Showing all top stores')} className="text-[13px] font-bold text-blue-600 hover:underline">See all</button>
                            </div>
                            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 -mx-4 px-4 md:mx-0 md:px-0">
                                {official && (
                                    <FeedCard merchant={official} rating={ratingsMap['official']} isOpen={true} isOfficial={true} priority={true} horizontal={true} />
                                )}
                                {topStores.map((merchant, idx) => (
                                    <FeedCard 
                                        key={merchant.id} 
                                        merchant={merchant} 
                                        rating={ratingsMap[merchant.id]} 
                                        isOpen={true} 
                                        priority={idx < 2} 
                                        horizontal={true}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Stores to Explore (Vertical) ── */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Stores to Explore</h2>
                            <button onClick={() => toast.success('Showing all stores')} className="text-[13px] font-bold text-blue-600 hover:underline">See all</button>
                        </div>

                        {exploreStores.length === 0 ? (
                            <div className="py-20 text-center">
                                <Package size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No stores found</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                                {exploreStores.map((merchant) => (
                                    <FeedCard 
                                        key={merchant.id} 
                                        merchant={merchant} 
                                        rating={ratingsMap[merchant.id]} 
                                        isOpen={true} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PullToRefresh>
        </>
    );
}
