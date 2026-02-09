'use client';

import { useState } from 'react';
import { SlidersHorizontal, X, DollarSign, Percent, Package, ShieldCheck, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdvancedFilters({ filters, setFilters, onApply }) {
    const [isOpen, setIsOpen] = useState(false);

    const priceRanges = [
        { label: 'Under ₹500', value: [0, 500] },
        { label: '₹500 - ₹1000', value: [500, 1000] },
        { label: '₹1000 - ₹2000', value: [1000, 2000] },
        { label: 'Above ₹2000', value: [2000, 10000] },
    ];

    const discountRanges = [
        { label: '5% or more', value: 5 },
        { label: '10% or more', value: 10 },
        { label: '15% or more', value: 15 },
        { label: '20% or more', value: 20 },
    ];

    const handlePriceChange = (range) => {
        setFilters({ ...filters, priceRange: range });
    };

    const handleDiscountChange = (discount) => {
        setFilters({ ...filters, minDiscount: discount });
    };

    const handleClearAll = () => {
        setFilters({
            priceRange: null,
            minDiscount: null,
            inStockOnly: false,
            verifiedOnly: false,
            minRating: null,
        });
    };

    const hasActiveFilters = filters.priceRange || filters.minDiscount || filters.inStockOnly || filters.verifiedOnly || filters.minRating;

    return (
        <>
            {/* Filter Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 hover:border-[#92BCEA] rounded-xl font-semibold text-gray-700 hover:text-[#92BCEA] transition-all hover:shadow-md relative"
            >
                <SlidersHorizontal size={18} />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#92BCEA] text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {[filters.priceRange, filters.minDiscount, filters.inStockOnly, filters.verifiedOnly, filters.minRating].filter(Boolean).length}
                    </span>
                )}
            </button>

            {/* Filter Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        />

                        {/* Filter Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b-2 border-gray-100 p-4 flex items-center justify-between z-10">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal size={20} className="text-[#92BCEA]" />
                                    <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Filter Content */}
                            <div className="p-4 space-y-6">
                                {/* Price Range */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <DollarSign size={18} className="text-[#92BCEA]" />
                                        <h4 className="font-bold text-gray-900">Price Range</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {priceRanges.map((range) => (
                                            <button
                                                key={range.label}
                                                onClick={() => handlePriceChange(range.value)}
                                                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${filters.priceRange && filters.priceRange[0] === range.value[0] && filters.priceRange[1] === range.value[1]
                                                        ? 'border-[#92BCEA] bg-[#92BCEA]/10 text-[#92BCEA] font-semibold'
                                                        : 'border-gray-200 hover:border-[#92BCEA]/50 text-gray-700'
                                                    }`}
                                            >
                                                {range.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Discount */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Percent size={18} className="text-green-600" />
                                        <h4 className="font-bold text-gray-900">Minimum Discount</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {discountRanges.map((discount) => (
                                            <button
                                                key={discount.value}
                                                onClick={() => handleDiscountChange(discount.value)}
                                                className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold ${filters.minDiscount === discount.value
                                                        ? 'border-green-500 bg-green-50 text-green-700'
                                                        : 'border-gray-200 hover:border-green-300 text-gray-700'
                                                    }`}
                                            >
                                                {discount.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Stock Availability */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package size={18} className="text-orange-600" />
                                        <h4 className="font-bold text-gray-900">Availability</h4>
                                    </div>
                                    <button
                                        onClick={() => setFilters({ ...filters, inStockOnly: !filters.inStockOnly })}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${filters.inStockOnly
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-200 hover:border-orange-300'
                                            }`}
                                    >
                                        <span className={`font-semibold ${filters.inStockOnly ? 'text-orange-700' : 'text-gray-700'}`}>
                                            In Stock Only
                                        </span>
                                        <div className={`w-12 h-6 rounded-full transition-colors ${filters.inStockOnly ? 'bg-orange-500' : 'bg-gray-300'
                                            } relative`}>
                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${filters.inStockOnly ? 'translate-x-6' : 'translate-x-0.5'
                                                }`} />
                                        </div>
                                    </button>
                                </div>

                                {/* Verified Merchants */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ShieldCheck size={18} className="text-blue-600" />
                                        <h4 className="font-bold text-gray-900">Merchant Trust</h4>
                                    </div>
                                    <button
                                        onClick={() => setFilters({ ...filters, verifiedOnly: !filters.verifiedOnly })}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${filters.verifiedOnly
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <span className={`font-semibold ${filters.verifiedOnly ? 'text-blue-700' : 'text-gray-700'}`}>
                                            Verified Only
                                        </span>
                                        <div className={`w-12 h-6 rounded-full transition-colors ${filters.verifiedOnly ? 'bg-blue-500' : 'bg-gray-300'
                                            } relative`}>
                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${filters.verifiedOnly ? 'translate-x-6' : 'translate-x-0.5'
                                                }`} />
                                        </div>
                                    </button>
                                </div>

                                {/* Rating */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Star size={18} className="text-yellow-500" />
                                        <h4 className="font-bold text-gray-900">Minimum Rating</h4>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[4.0, 4.5, 4.8].map((rating) => (
                                            <button
                                                key={rating}
                                                onClick={() => setFilters({ ...filters, minRating: rating })}
                                                className={`px-3 py-3 rounded-xl border-2 transition-all font-semibold flex items-center justify-center gap-1 ${filters.minRating === rating
                                                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                                        : 'border-gray-200 hover:border-yellow-300 text-gray-700'
                                                    }`}
                                            >
                                                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                                {rating}+
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="sticky bottom-0 bg-white border-t-2 border-gray-100 p-4 space-y-2">
                                <button
                                    onClick={() => {
                                        onApply();
                                        setIsOpen(false);
                                    }}
                                    className="w-full py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all"
                                >
                                    Apply Filters
                                </button>
                                {hasActiveFilters && (
                                    <button
                                        onClick={handleClearAll}
                                        className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
