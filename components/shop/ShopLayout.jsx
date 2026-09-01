'use client';

import React, { useState } from 'react';
import MobileFilterDrawer from './MobileFilterDrawer';

export default function ShopLayout({
    title = 'All Products',
    sidebar,
    toolbar,
    activeFilters,
    children
}) {
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    return (
        <div className="bg-[#f7f8fa] dark:bg-[#080a10]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-baseline justify-between border-b border-gray-200 dark:border-white/10 pb-6">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
                        {title}
                    </h1>
                    <div className="flex items-center">
                        {toolbar && React.cloneElement(toolbar, { onOpenMobileFilters: () => setIsMobileFiltersOpen(true) })}
                    </div>
                </div>

                <div className="pt-6 pb-24">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-4">
                        {/* Desktop Sidebar */}
                        <div className="hidden lg:block">
                            {sidebar}
                        </div>

                        {/* Product grid */}
                        <div className="lg:col-span-3">
                            {activeFilters && (
                                <div className="mb-6">
                                    {activeFilters}
                                </div>
                            )}
                            {children}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
                isOpen={isMobileFiltersOpen}
                onClose={() => setIsMobileFiltersOpen(false)}
            >
                {sidebar}
            </MobileFilterDrawer>
        </div>
    );
}
