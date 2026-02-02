'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SearchBar({ className = '' }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const { t } = useLanguage();

    const suggestions = [
        t('suggestions.loans'),
        t('suggestions.giftCards'),
        t('suggestions.recharge'),
        t('suggestions.solar'),
    ];

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            console.log('Searching for:', searchQuery);
            // TODO: Implement actual search functionality
            // For now, just log the search query
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Main Search Container */}
            <motion.div
                animate={searchFocused ? {
                    scale: 1.01,
                } : {
                    scale: 1,
                }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
            >
                {/* Animated Glow Effect on Focus */}
                <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-[#92BCEA] via-[#AFB3F7] to-[#92BCEA] rounded-2xl blur-lg opacity-0"
                    animate={searchFocused ? {
                        opacity: 0.3,
                    } : {
                        opacity: 0,
                    }}
                    transition={{ duration: 0.3 }}
                />

                {/* Search Form */}
                <form onSubmit={handleSearch}>
                    <div
                        className={`
              relative flex items-center 
              bg-white rounded-2xl 
              shadow-lg hover:shadow-xl
              border-2 transition-all duration-300
              ${searchFocused
                                ? 'border-[#92BCEA] shadow-2xl'
                                : 'border-gray-200 hover:border-gray-300'
                            }
              px-4 md:px-6 py-4 md:py-5
            `}
                    >
                        {/* Search Icon */}
                        <motion.div
                            animate={searchFocused ? {
                                scale: 1.1,
                            } : {
                                scale: 1,
                            }}
                            transition={{ duration: 0.2 }}
                            className="flex-shrink-0"
                        >
                            <Search
                                size={20}
                                className={`transition-colors duration-300 ${searchFocused ? 'text-[#92BCEA]' : 'text-[#617073]'
                                    }`}
                                strokeWidth={2.5}
                            />
                        </motion.div>

                        {/* Input Field */}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            placeholder={t('hero.searchPlaceholder')}
                            className="
                flex-1 mx-3 md:mx-4 
                text-base md:text-lg 
                bg-transparent text-[#171A21] 
                placeholder:text-[#617073]/60
                focus:outline-none
                font-medium
              "
                        />

                        {/* Search Button */}
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="
                flex-shrink-0 
                bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] 
                text-white 
                p-2.5 rounded-xl
                shadow-md hover:shadow-lg
                transition-all duration-300
                flex items-center justify-center
              "
                            aria-label="Search"
                        >
                            <ArrowRight size={18} strokeWidth={2.5} />
                        </motion.button>
                    </div>
                </form>
            </motion.div>

            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
                {searchFocused && searchQuery && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="
              absolute top-full mt-2 w-full 
              bg-white rounded-2xl 
              shadow-2xl border border-gray-100 
              p-3 z-50
              max-h-64 overflow-y-auto
            "
                    >
                        {/* Quick suggestions */}
                        <div className="space-y-1">
                            {suggestions.map((suggestion, index) => (
                                <motion.button
                                    key={suggestion}
                                    type="button"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => setSearchQuery(suggestion)}
                                    className="
                    w-full flex items-center gap-3 
                    px-4 py-3 
                    hover:bg-gradient-to-r hover:from-[#92BCEA]/10 hover:to-[#AFB3F7]/10 
                    rounded-xl transition-all
                    group
                  "
                                >
                                    <Search size={16} className="text-[#617073] group-hover:text-[#92BCEA] transition-colors" strokeWidth={2.5} />
                                    <span className="text-sm font-medium text-[#171A21]">{suggestion}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
