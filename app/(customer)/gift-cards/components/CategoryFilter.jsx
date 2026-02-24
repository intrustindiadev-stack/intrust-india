'use client';

import { memo } from 'react';

const CategoryFilter = memo(function CategoryFilter({ categories, selectedCategory, setSelectedCategory }) {
    return (
        <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedCategory === cat
                        ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-lg shadow-[#92BCEA]/30'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
});

export default CategoryFilter;
