'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';
import SearchDropdown from '@/components/search/SearchDropdown';

export default function SearchBar({ className = '' }) {
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);

    const debouncedQuery = useDebounce(searchQuery, 300);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const wrapperRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, []);

    useEffect(() => {
        if (debouncedQuery.trim().length === 0) {
            setResults([]);
            setLoading(false);
            setDropdownOpen(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setDropdownOpen(true);

        fetch('/api/search?q=' + encodeURIComponent(debouncedQuery) + '&type=all&limit=10', {
            signal: controller.signal
        })
            .then(res => {
                if (!res.ok) throw new Error('Search failed');
                return res.json();
            })
            .then(data => {
                setResults(data.results ?? []);
                setDropdownOpen(true);
            })
            .catch(err => {
                if (err.name !== 'AbortError') {
                    setError('Search failed');
                    setResults([]);
                }
            })
            .finally(() => {
                setLoading(false);
            });

        return () => controller.abort();
    }, [debouncedQuery]);

    useEffect(() => {
        setHighlightIndex(-1);
    }, [results]);

    const handleFocus = () => {
        setIsFocused(true);
        if (searchQuery.trim().length > 0) {
            setDropdownOpen(true);
        }
    };

    const handleBlur = (e) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.relatedTarget)) {
            setDropdownOpen(false);
            setIsFocused(false);
        }
    };

    const handleKeyDown = (e) => {
        if (!dropdownOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && results[highlightIndex]) {
                router.push(results[highlightIndex].url);
            } else if (searchQuery.trim()) {
                router.push('/search?q=' + encodeURIComponent(searchQuery.trim()));
            }
            setDropdownOpen(false);
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            setDropdownOpen(false);
            inputRef.current?.blur();
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push('/search?q=' + encodeURIComponent(searchQuery.trim()));
            setDropdownOpen(false);
            inputRef.current?.blur();
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setResults([]);
        setDropdownOpen(false);
        setHighlightIndex(-1);
        inputRef.current?.focus();
    };

    return (
        <div
            className={`relative z-50 ${className}`}
            ref={wrapperRef}
            onBlur={handleBlur}
        >
            <motion.div
                initial={false}
                animate={isFocused ? { scale: 1.02 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative group"
            >
                {/* Ambient Glow Effect */}
                <motion.div
                    animate={{
                        opacity: isFocused ? 0.4 : 0,
                        scale: isFocused ? 1.05 : 0.95,
                    }}
                    transition={{ duration: 0.4 }}
                    className="absolute -inset-1 bg-gradient-to-r from-[#92BCEA] via-[#AFB3F7] to-[#5E7CE2] rounded-full blur-xl -z-10"
                />

                <form onSubmit={onSubmit} className="relative">
                    <div
                        className={`
                            relative flex items-center
                            w-full
                            bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl
                            border transition-all duration-300
                            rounded-full
                            shadow-[0_8px_30px_rgb(0,0,0,0.04)]
                            hover:shadow-[0_15px_30px_rgb(0,0,0,0.08)]
                            ${isFocused
                                ? 'border-[#92BCEA] shadow-[0_0_0_4px_rgba(146,188,234,0.1)] bg-white/95 dark:bg-gray-800/95'
                                : 'border-white/50 dark:border-gray-700/50 hover:border-white/80 dark:hover:border-gray-600/80'
                            }
                            pl-5 pr-2 py-2 md:pl-8 md:py-3
                        `}
                    >
                        {/* Leading Search Icon */}
                        <Search
                            size={22}
                            strokeWidth={2}
                            className={`flex-shrink-0 transition-colors duration-300 mr-3 ${isFocused ? 'text-[#92BCEA]' : 'text-slate-400'
                                }`}
                        />

                        {/* Input Field */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!dropdownOpen && e.target.value.trim().length > 0) {
                                    setDropdownOpen(true);
                                }
                            }}
                            onFocus={handleFocus}
                            onKeyDown={handleKeyDown}
                            placeholder="Search for services, offers, and more..."
                            className="
                                flex-1 w-full
                                bg-transparent
                                border-none outline-none ring-0
                                p-0
                                text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500
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

                {dropdownOpen && (
                    <SearchDropdown
                        query={searchQuery}
                        results={results}
                        loading={loading}
                        error={error}
                        highlightIndex={highlightIndex}
                        onHighlight={setHighlightIndex}
                        onSelect={(result) => { router.push(result.url); setDropdownOpen(false); inputRef.current?.blur(); }}
                        onSeeAll={() => { router.push('/search?q=' + encodeURIComponent(searchQuery)); setDropdownOpen(false); inputRef.current?.blur(); }}
                    />
                )}
            </motion.div>
        </div>
    );
}
