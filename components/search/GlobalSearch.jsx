'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SearchDropdown, { CATEGORY_ORDER } from './SearchDropdown';

export function getOrderedResults(results) {
    const grouped = {};
    (results || []).forEach(r => {
        const cat = r.category || 'products';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(r);
    });
    const list = [];
    CATEGORY_ORDER.forEach(cat => {
        if (grouped[cat]) list.push(...grouped[cat]);
    });
    Object.keys(grouped).forEach(cat => {
        if (!CATEGORY_ORDER.includes(cat)) list.push(...grouped[cat]);
    });
    return list;
}

export default function GlobalSearch({ className = '' }) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    const orderedResults = useMemo(() => getOrderedResults(results), [results]);

    // Simple local debounce
    const [debouncedQuery, setDebouncedQuery] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchResults = useCallback(async (searchQuery) => {
        const cleanQuery = searchQuery.trim();
        if (!cleanQuery) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}&limit=6`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            setResults(data.results || []);
            setIsOpen(true);
            setHighlightIndex(-1);
        } catch (err) {
            console.error('GlobalSearch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchResults(debouncedQuery);
    }, [debouncedQuery, fetchResults]);

    const handleSelect = useCallback((result) => {
        if (!result) return;
        setIsOpen(false);
        setQuery('');
        setHighlightIndex(-1);
        router.push(result.url);
    }, [router]);

    const handleSeeAll = useCallback(() => {
        setIsOpen(false);
        setHighlightIndex(-1);
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    }, [query, router]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && orderedResults[highlightIndex]) {
                handleSelect(orderedResults[highlightIndex]);
            } else if (query.trim()) {
                handleSeeAll();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen && orderedResults.length > 0) {
                setIsOpen(true);
            }
            setHighlightIndex(prev => (prev < orderedResults.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => (prev > -1 ? prev - 1 : -1));
        } else if (e.key === 'Escape' || e.key === 'Tab') {
            setIsOpen(false);
            setHighlightIndex(-1);
        }
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setHighlightIndex(-1);
        inputRef.current?.focus();
    };

    return (
        <div ref={containerRef} className={`relative w-full max-w-md ${className}`}>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.trim().length > 0) {
                            setIsOpen(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (query.trim().length > 0) setIsOpen(true);
                    }}
                    placeholder="Search products, brands and more..."
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-full py-2 pl-10 pr-10 text-sm outline-none transition-all dark:text-white placeholder:text-slate-400"
                />
                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Clear search"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {isOpen && (query.trim().length > 0 || loading) && (
                <SearchDropdown
                    query={query}
                    results={results}
                    orderedResults={orderedResults}
                    loading={loading}
                    error={error}
                    highlightIndex={highlightIndex}
                    onHighlight={setHighlightIndex}
                    onSelect={handleSelect}
                    onSeeAll={handleSeeAll}
                />
            )}
        </div>
    );
}

