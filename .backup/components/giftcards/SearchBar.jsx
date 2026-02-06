'use client';

import { Search, ChevronDown } from 'lucide-react';

export default function SearchBar({ searchQuery, setSearchQuery, sortBy, setSortBy }) {
    return (
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
            {/* Search */}
            <div className="relative flex-1 w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search for brands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-5 py-3 bg-white rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-gray-900 placeholder-gray-400"
                />
            </div>

            {/* Sort */}
            <div className="relative w-full md:w-64">
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full appearance-none pl-5 pr-12 py-3 bg-white rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-gray-700 cursor-pointer font-medium"
                >
                    <option value="popular">Most Popular</option>
                    <option value="discount">Highest Discount</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
        </div>
    );
}
