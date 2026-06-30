'use client';

import { useState, useEffect, useRef, lazy, Suspense, memo, useCallback } from 'react';
import { Search, Store, X, Sparkles, Star, MapPin, Heart, Clock, SlidersHorizontal, ChevronRight, CheckCircle2, Package, Truck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PullToRefresh from '@/components/ui/PullToRefresh';

const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PC9zdmc+';

// ── E-commerce Feed Card ──────────────────────────────────────────────
const FeedCard = memo(function FeedCard({ merchant, rating, isOpen, isOfficial, priority }) {
    const [isSaved, setIsSaved] = useState(false);
    
    const bannerImage = merchant.shopping_banner_url || '/images/default_merchant_banner.png';
    const mockOffer = Math.random() > 0.5 ? 'Free Shipping' : 'Up to 50% OFF';
    const shipsIn = Math.random() > 0.5 ? 'Ships in 24 hrs' : 'Next Day Delivery';

    return (
        <Link href={isOfficial ? "/shop/official" : `/shop/${merchant.slug}`} className="block group h-full">
            <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all duration-300 h-full flex flex-col">
                
                {/* ── Image Header ── */}
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/9]">
                    <Image
                        src={isOfficial ? "/images/intrust_mart_bg.png" : bannerImage}
                        alt={merchant.business_name || 'Intrust Store'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        loading={priority ? 'eager' : 'lazy'}
                        priority={priority}
                        placeholder="blur"
                        blurDataURL={BLUR_PLACEHOLDER}
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                    <button 
                        onClick={(e) => { e.preventDefault(); setIsSaved(!isSaved); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors hover:bg-white/40"
                    >
                        <Heart size={18} className={isSaved ? "fill-red-500 text-red-500" : "text-white"} />
                    </button>

                    <div className="absolute bottom-3 left-3 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                        <Sparkles size={12} />
                        {mockOffer}
                    </div>

                    {isOfficial && (
                        <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                            <CheckCircle2 size={12} /> Official Store
                        </div>
                    )}
                </div>

                {/* ── Content Area ── */}
                <div className="p-4 md:p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {isOfficial ? 'Intrust Mart' : merchant.business_name}
                        </h3>
                        <div className="flex items-center gap-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-2 py-0.5 rounded-lg flex-shrink-0">
                            <span className="text-xs font-bold">{rating?.avg_rating || (isOfficial ? 4.9 : 4.2)}</span>
                            <Star size={10} className={isOfficial ? "fill-white" : "fill-current"} />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">
                        <MapPin size={14} />
                        <span className="truncate">{merchant.business_address?.split(',')[0] || (isOfficial ? 'Premium Fulfillment Hub' : 'Local Area')}</span>
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Verified Seller</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs font-medium">
                            <Truck size={14} />
                            {shipsIn}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
});

// ── Main Export ──────────────────────────────────────────────────────────────
export default function ShopHubClient({ merchants = [], ratingsMap = {} }) {
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Sort');
    const router = useRouter();
    const debounceRef = useRef(null);

    const handleRefresh = useCallback(async () => {
        router.refresh();
        await new Promise(resolve => setTimeout(resolve, 800));
    }, [router]);

    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        setSearchInput(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearchQuery(val), 200);
    }, []);

    const official = merchants.find(m => m.id === 'official');
    const rest = merchants.filter(m => m.id !== 'official');
    
    // Apply search and filter logic
    let processedMerchants = rest.filter(m => (m.business_name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeFilter === 'Top Rated') {
        processedMerchants.sort((a, b) => {
            const ratingA = ratingsMap[a.id]?.avg_rating || 4.0;
            const ratingB = ratingsMap[b.id]?.avg_rating || 4.0;
            return ratingB - ratingA;
        });
    } else if (activeFilter === 'New Arrivals') {
        processedMerchants.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (activeFilter === 'Free Shipping') {
        // Mock free shipping filter deterministic on ID length or character code
        processedMerchants = processedMerchants.filter(m => (m.id.charCodeAt(0) % 2 === 0));
    }

    const filters = ['Sort', 'Free Shipping', 'Top Rated', 'New Arrivals'];

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="bg-white dark:bg-gray-900 min-h-screen pb-24 font-[family-name:var(--font-outfit)]">
                
                {/* ── Search Header ── */}
                <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md pt-4 pb-3 px-4 shadow-sm border-b border-gray-100 dark:border-gray-800">
                    <div className="max-w-7xl mx-auto flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Package size={24} className="text-blue-600 dark:text-blue-400" />
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Shop</h1>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                            <Image src="/images/avatar-placeholder.png" alt="Profile" width={40} height={40} />
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={handleSearchChange}
                            placeholder="Search for electronics, fashion, groceries..."
                            className="w-full pl-12 pr-10 py-3.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-2xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/50 shadow-inner transition-shadow"
                        />
                        {searchInput && (
                            <button onClick={() => { setSearchInput(''); setSearchQuery(''); }} className="absolute right-4 top-1/2 -translate-y-1/2">
                                <X size={16} className="text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    {/* ── Sticky Filter Chips ── */}
                    <div className="sticky top-[140px] z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md py-3 overflow-x-auto no-scrollbar flex gap-2 -mx-4 px-4 md:mx-0 md:px-0 mb-6 mt-4">
                        <button className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <SlidersHorizontal size={14} className="text-gray-700 dark:text-gray-300" />
                        </button>
                        {filters.map(f => (
                            <button 
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-colors ${
                                    activeFilter === f 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' 
                                    : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* ── Feed Content ── */}
                    <div>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight mb-6 uppercase flex items-center gap-2">
                            <span className="w-6 h-[3px] bg-blue-600 rounded-full" />
                            {searchQuery ? 'Search Results' : 'Featured Stores'}
                        </h2>

                        {processedMerchants.length === 0 && (!official || (activeFilter === 'Free Shipping' && official.id.charCodeAt(0) % 2 !== 0)) ? (
                            <div className="py-20 text-center">
                                <Store size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No stores found</h3>
                                <p className="text-gray-500 text-sm mt-1">Try adjusting your filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {!searchQuery && official && activeFilter !== 'Free Shipping' && (
                                    <FeedCard merchant={official} rating={ratingsMap['official']} isOpen={true} isOfficial={true} priority={true} />
                                )}
                                {processedMerchants.map((merchant, idx) => (
                                    <FeedCard 
                                        key={merchant.id} 
                                        merchant={merchant} 
                                        rating={ratingsMap[merchant.id]} 
                                        isOpen={true} 
                                        priority={idx < 4} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PullToRefresh>
    );
}
