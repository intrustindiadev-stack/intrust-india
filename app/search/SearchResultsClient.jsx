'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import ResultCard from '@/components/search/ResultCard';
import FiltersSidebar from '@/components/search/FiltersSidebar';
import Pagination from '@/components/search/Pagination';
import EmptyState from '@/components/ui/EmptyState';

export default function SearchResultsClient({ initialParams }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // State from URL or Defaults
    const [q, setQ] = useState(initialParams.q || '');
    const [selectedCategories, setSelectedCategories] = useState(
        initialParams.categories ? initialParams.categories.split(',') : []
    );
    const [priceRange, setPriceRange] = useState([
        Number(initialParams.minPrice) || 0,
        Number(initialParams.maxPrice) || 100000
    ]);
    const [sortBy, setSortBy] = useState(initialParams.sort || 'relevance');
    const [page, setPage] = useState(Number(initialParams.page) || 1);

    // Data State
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [isPopular, setIsPopular] = useState(false);

    // State Hydration from URL
    useEffect(() => {
        const urlQ = searchParams.get('q') || '';
        const urlType = searchParams.get('type');
        const urlCategories = searchParams.get('categories');
        const urlSort = searchParams.get('sort') || 'relevance';
        const urlPage = Number(searchParams.get('page')) || 1;
        const urlMin = Number(searchParams.get('minPrice')) || 0;
        const urlMax = Number(searchParams.get('maxPrice')) || 100000;

        let cats = [];
        if (urlType) {
            cats = [urlType];
        } else if (urlCategories) {
            cats = urlCategories.split(',');
        }

        setQ(urlQ);
        setSelectedCategories(cats);
        setSortBy(urlSort);
        setPage(urlPage);
        setPriceRange([urlMin, urlMax]);
    }, [searchParams]);

    // URL Sync Effect
    useEffect(() => {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (page > 1) params.set('page', page.toString());
        if (sortBy !== 'relevance') params.set('sort', sortBy);
        
        if (selectedCategories.length === 1) {
            params.set('type', selectedCategories[0]);
        } else if (selectedCategories.length > 1) {
            params.set('categories', selectedCategories.join(','));
        }
        
        if (priceRange[0] > 0) params.set('minPrice', priceRange[0].toString());
        if (priceRange[1] < 100000) params.set('maxPrice', priceRange[1].toString());

        const nextQuery = params.toString();
        const currentQuery = searchParams.toString();

        if (nextQuery !== currentQuery) {
            router.replace(pathname + (nextQuery ? '?' + nextQuery : ''), { scroll: false });
        }
    }, [q, selectedCategories, priceRange, sortBy, page, router, pathname, searchParams]);

    // Fetch Logic
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (!q.trim()) {
                // Fetch Trending
                const res = await fetch('/api/shopping/trending-products');
                if (!res.ok) throw new Error('Failed to fetch trending products');
                const data = await res.json();
                
                const mapped = (data.products || []).map(p => ({
                    id: p.id,
                    category: 'products',
                    name: p.title,
                    price: p.suggested_retail_price_paise / 100,
                    thumbnail: p.product_images?.[0],
                    description: p.description,
                    url: `/shop/product/${p.slug}`
                }));

                setResults(mapped);
                setTotal(mapped.length);
                setIsPopular(true);
            } else {
                // Fetch Search
                // API supports only one type natively; if multiple are selected, we fetch 'all' and filter client-side
                const typeParam = selectedCategories.length === 1 ? selectedCategories[0] : 'all';
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${typeParam}&limit=20&page=${page}`);
                if (!res.ok) throw new Error('Search request failed');
                const data = await res.json();

                setResults(data.results || []);
                setTotal(data.total || 0);
                setIsPopular(false);
            }
        } catch (err) {
            console.error('Search error:', err);
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [q, selectedCategories, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Client-side post-processing (filtering and sorting)
    const displayResults = useMemo(() => {
        let filtered = results;

        // Apply multi-category filter if more than one category is selected (since API only handles 1 or 'all')
        if (q.trim() && selectedCategories.length > 1) {
            filtered = filtered.filter(r => selectedCategories.includes(r.category));
        }

        // Apply price range filter
        filtered = filtered.filter(r => 
            r.price === null || 
            r.price === undefined || 
            (r.price >= priceRange[0] && r.price <= priceRange[1])
        );

        // Apply sorting
        if (sortBy === 'price-asc') {
            filtered = [...filtered].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        } else if (sortBy === 'price-desc') {
            filtered = [...filtered].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
        } else if (sortBy === 'name-asc') {
            filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'en-IN'));
        }

        return filtered;
    }, [results, q, selectedCategories, priceRange, sortBy]);

    const handleCategoriesChange = (cats) => {
        setSelectedCategories(cats);
        setPage(1);
    };

    const handlePriceRangeChange = (range) => {
        setPriceRange(range);
        setPage(1);
    };

    const handleSortChange = (sort) => {
        setSortBy(sort);
        setPage(1);
    };

    return (
        <div style={{ background: 'var(--bg-primary)' }} className="min-h-screen font-[family-name:var(--font-outfit)]">
            
            {/* Page Header */}
            <div className="pt-[10vh] pb-8 px-4 max-w-7xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {isPopular ? 'Popular right now' : `Search results for "${q}"`}
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {total} results found
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 flex flex-col lg:flex-row gap-8">
                
                {/* Sidebar — desktop only */}
                <aside className="hidden lg:block lg:w-64 shrink-0">
                    <div className="sticky top-28">
                        <FiltersSidebar 
                            variant="sidebar"
                            selectedCategories={selectedCategories}
                            onCategoriesChange={handleCategoriesChange}
                            priceRange={priceRange}
                            onPriceRangeChange={handlePriceRangeChange}
                            sortBy={sortBy}
                            onSortChange={handleSortChange}
                        />
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    
                    {/* Mobile Filter Toggle */}
                    <div className="lg:hidden mb-6">
                        <button 
                            onClick={() => setMobileFiltersOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] text-sm font-bold transition-all hover:border-[#92BCEA]"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <SlidersHorizontal size={16} className="text-[#92BCEA]" />
                            Filters & Sort
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <ResultCard key={i} variant="skeleton" />
                            ))}
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-6 flex items-center justify-between">
                            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                            <button 
                                onClick={fetchData}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Zero Results */}
                    {!loading && !error && displayResults.length === 0 && (
                        <EmptyState
                            title={q ? `No results for "${q}"` : 'Nothing here yet'}
                            description="Try different keywords, check your spelling, or remove some filters."
                        />
                    )}

                    {/* Results Grid */}
                    {!loading && !error && displayResults.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {displayResults.map(r => (
                                <ResultCard key={r.id || r.url} result={r} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && !error && total > 20 && (
                        <div className="mt-10">
                            <Pagination 
                                page={page} 
                                totalPages={Math.ceil(total / 20)} 
                                onPageChange={setPage} 
                            />
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Filters Drawer */}
            {mobileFiltersOpen && (
                <>
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" 
                        onClick={() => setMobileFiltersOpen(false)} 
                    />
                    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-[2.5rem] shadow-2xl transition-transform duration-300">
                        <FiltersSidebar 
                            variant="drawer" 
                            onClose={() => setMobileFiltersOpen(false)}
                            selectedCategories={selectedCategories}
                            onCategoriesChange={handleCategoriesChange}
                            priceRange={priceRange}
                            onPriceRangeChange={handlePriceRangeChange}
                            sortBy={sortBy}
                            onSortChange={handleSortChange}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
