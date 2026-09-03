'use client';

import React from 'react';
import Link from 'next/link';

export default function CategoryScrollNav({ categories, activeCategory, basePath, preservedParams }) {
    if (!categories || categories.length === 0) return null;

    return (
        <nav aria-label="Categories" className="w-full">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide py-3 px-4 -mx-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((cat, idx) => {
                    const isAll = cat === 'All';
                    const isActive = isAll ? !activeCategory : activeCategory === cat;
                    
                    const params = new URLSearchParams(preservedParams);
                    if (!isAll) {
                        params.set('category', cat);
                    }
                    
                    const href = `${basePath}${params.toString() ? '?' + params.toString() : ''}`;
                    
                    return (
                        <Link 
                            key={idx}
                            href={href}
                            scroll={false}
                            className={`whitespace-nowrap shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                isActive 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'bg-slate-100 text-gray-700 border-slate-200 hover:bg-slate-200 dark:bg-[#12141c] dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/5'
                            }`}
                        >
                            {cat}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
