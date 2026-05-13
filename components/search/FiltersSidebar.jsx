'use client';

import { X } from 'lucide-react';

export default function FiltersSidebar({
    selectedCategories = [],
    onCategoriesChange,
    priceRange = [0, 100000],
    onPriceRangeChange,
    sortBy = 'relevance',
    onSortChange,
    variant = 'sidebar',
    onClose
}) {
    const categories = [
        { id: 'products', label: 'Products' },
        { id: 'services', label: 'Services' },
        { id: 'giftcards', label: 'Gift Cards' },
        { id: 'offers', label: 'Offers' },
        { id: 'nfc', label: 'NFC' },
        { id: 'solar', label: 'Solar' },
    ];

    const sortOptions = [
        { id: 'relevance', label: 'Relevance' },
        { id: 'price-asc', label: 'Price ↑' },
        { id: 'price-desc', label: 'Price ↓' },
        { id: 'name-asc', label: 'Name A–Z' },
    ];

    const handleCategoryToggle = (id) => {
        const next = selectedCategories.includes(id)
            ? selectedCategories.filter(c => c !== id)
            : [...selectedCategories, id];
        onCategoriesChange(next);
    };

    const handleClearAll = () => {
        onCategoriesChange([]);
        onPriceRangeChange([0, 100000]);
        onSortChange('relevance');
        if (variant === 'drawer' && onClose) onClose();
    };

    const containerClasses = variant === 'drawer'
        ? "bg-white dark:bg-gray-900 rounded-t-3xl p-6"
        : "bg-white dark:bg-gray-800 rounded-3xl p-5 border border-[var(--border-color)]";

    return (
        <div className={containerClasses}>
            {variant === 'drawer' && (
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            )}

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Filters</h2>
                {variant === 'drawer' && (
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Categories */}
            <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-slate-400">Categories</h3>
                <div className="space-y-3">
                    {categories.map(cat => (
                        <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={selectedCategories.includes(cat.id)}
                                onChange={() => handleCategoryToggle(cat.id)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-[#92BCEA] focus:ring-[#92BCEA] accent-[#92BCEA]"
                            />
                            <span className="text-sm font-medium transition-colors group-hover:text-[#92BCEA]" style={{ color: selectedCategories.includes(cat.id) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {cat.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-slate-400">Price Range</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <input
                            type="range"
                            min="0"
                            max="100000"
                            step="500"
                            value={priceRange[0]}
                            onChange={(e) => {
                                const val = Math.min(Number(e.target.value), priceRange[1]);
                                onPriceRangeChange([val, priceRange[1]]);
                            }}
                            className="w-full accent-[#92BCEA] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                            type="range"
                            min="0"
                            max="100000"
                            step="500"
                            value={priceRange[1]}
                            onChange={(e) => {
                                const val = Math.max(Number(e.target.value), priceRange[0]);
                                onPriceRangeChange([priceRange[0], val]);
                            }}
                            className="w-full accent-[#92BCEA] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
                        <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Sort By */}
            <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-slate-400">Sort By</h3>
                <div className="flex flex-wrap gap-2">
                    {sortOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onSortChange(opt.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                sortBy === opt.id
                                    ? 'bg-[#92BCEA] text-white'
                                    : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA]'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Clear All */}
            <button
                onClick={handleClearAll}
                className="w-full py-3 rounded-2xl text-sm font-bold border border-[#92BCEA] text-[#92BCEA] hover:bg-[#92BCEA] hover:text-white transition-all"
            >
                Clear All Filters
            </button>
        </div>
    );
}
