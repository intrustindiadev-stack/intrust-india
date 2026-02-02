'use client';

import { Search, ChevronDown } from 'lucide-react';

export default function SearchBar({ searchQuery, setSearchQuery, sortBy, setSortBy }) {
    return (
        <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search brands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#92BCEA] focus:ring-4 focus:ring-[#92BCEA]/10 transition-all"
                />
            </div>

            {/* Sort */}
            <div className="relative sm:w-52">
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full appearance-none px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#92BCEA] focus:ring-4 focus:ring-[#92BCEA]/10 transition-all cursor-pointer"
                >
                    <option value="popular">Most Popular</option>
                    <option value="discount">Best Discount</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
        </div>
    );
}
