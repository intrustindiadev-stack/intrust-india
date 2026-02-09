'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SearchBar({ className = '' }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const inputRef = useRef(null);
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
            // Implement search logic here
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        inputRef.current?.focus();
    };

    return (
        <div className={`relative z-50 ${className}`}>
            <motion.div
                initial={false}
                animate={searchFocused ? { scale: 1.02 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative group"
            >
                {/* Ambient Glow Effect */}
                <motion.div
                    animate={{
                        opacity: searchFocused ? 0.4 : 0,
                        scale: searchFocused ? 1.05 : 0.95,
                    }}
                    transition={{ duration: 0.4 }}
                    className="absolute -inset-1 bg-gradient-to-r from-[#92BCEA] via-[#AFB3F7] to-[#5E7CE2] rounded-full blur-xl -z-10"
                />

                <form onSubmit={handleSearch} className="relative">
                    <div
                        className={`
                            relative flex items-center
                            w-full
                            bg-white/70 backdrop-blur-2xl
                            border transition-all duration-300
                            rounded-full
                            shadow-[0_8px_30px_rgb(0,0,0,0.04)]
                            hover:shadow-[0_15px_30px_rgb(0,0,0,0.08)]
                            ${searchFocused
                                ? 'border-[#92BCEA] shadow-[0_0_0_4px_rgba(146,188,234,0.1)] bg-white/95'
                                : 'border-white/50 hover:border-white/80'
                            }
                            pl-5 pr-2 py-2 md:pl-8 md:py-3
                        `}
                    >
                        {/* Leading Search Icon */}
                        <Search
                            size={22}
                            strokeWidth={2}
                            className={`flex-shrink-0 transition-colors duration-300 mr-3 ${searchFocused ? 'text-[#92BCEA]' : 'text-slate-400'
                                }`}
                        />

                        {/* Input Field */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                            placeholder={t('hero.searchPlaceholder')}
                            className="
                                flex-1 w-full
                                bg-transparent
                                border-none outline-none ring-0
                                p-0
                                text-slate-800 placeholder:text-slate-400
                                text-base md:text-lg font-medium
                                overflow-hidden text-ellipsis whitespace-nowrap
                            "
                        />

                        {/* Actions Container */}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {/* Clear Button - Show when query exists */}
                            <AnimatePresence>
                                {searchQuery && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        type="button"
                                        onClick={clearSearch}
                                        className="p-1.5 rounded-full hover:bg-slate-100/80 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X size={16} strokeWidth={2.5} />
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* Search Submit Button */}
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="
                                    flex items-center justify-center
                                    w-10 h-10 md:w-12 md:h-12
                                    rounded-full
                                    bg-gradient-to-tr from-[#92BCEA] to-[#5E7CE2]
                                    text-white
                                    shadow-md shadow-blue-500/20
                                    hover:shadow-lg hover:shadow-blue-500/30
                                    transition-all
                                "
                            >
                                <ArrowRight size={20} strokeWidth={2.5} />
                            </motion.button>
                        </div>
                    </div>
                </form>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {searchFocused && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="
                                absolute top-full left-0 right-0 mt-4
                                p-2
                                bg-white/90 backdrop-blur-xl
                                border border-white/50
                                rounded-3xl
                                shadow-2xl shadow-blue-900/5
                                overflow-hidden
                            "
                        >
                            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Popular Searches
                            </div>
                            <div className="flex flex-col gap-1">
                                {suggestions.map((suggestion, index) => (
                                    <motion.button
                                        key={suggestion}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="
                                            flex items-center gap-3
                                            w-full px-4 py-3
                                            rounded-2xl
                                            text-left text-slate-700
                                            hover:bg-blue-50 hover:text-blue-600
                                            transition-colors group
                                        "
                                        onClick={() => setSearchQuery(suggestion)}
                                    >
                                        <Search size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                        <span className="font-medium">{suggestion}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
