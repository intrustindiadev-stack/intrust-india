import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Loader2, ArrowRight } from 'lucide-react';
import SearchResultRow from './SearchResultRow';

const CATEGORY_LABELS = {
    products: 'Products',
    services: 'Services',
    giftcards: 'Gift Cards',
    offers: 'Offers',
    nfc: 'NFC',
    solar: 'Solar Solutions'
};

const CATEGORY_ORDER = ['products', 'services', 'giftcards', 'offers', 'nfc', 'solar'];

export default function SearchDropdown({
    query,
    results,
    loading,
    error,
    highlightIndex,
    onHighlight,
    onSelect,
    onSeeAll
}) {
    // Group results by category
    const groupedResults = {};
    results.forEach(r => {
        if (!groupedResults[r.category]) {
            groupedResults[r.category] = [];
        }
        groupedResults[r.category].push(r);
    });

    let rowIndexCounter = 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-3 z-[60] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-3xl shadow-2xl shadow-blue-900/5 overflow-hidden max-h-[60vh] overflow-y-auto"
            >
                {loading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 size={16} className="animate-spin text-[#92BCEA]" />
                        <span className="text-sm text-slate-400 ml-2">Searching...</span>
                    </div>
                )}

                {!loading && results.length === 0 && query.length > 0 && (
                    <div className="py-4">
                        <p className="text-sm text-slate-500 dark:text-gray-400 text-center py-4">
                            No results found for "<strong>{query}</strong>"
                        </p>
                        <div className="flex justify-center gap-2 pb-2">
                            <Link href="/shop" className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors">
                                Shop
                            </Link>
                            <Link href="/gift-cards" className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors">
                                Gift Cards
                            </Link>
                            <Link href="/services" className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors">
                                Services
                            </Link>
                        </div>
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="py-2">
                        {CATEGORY_ORDER.map(cat => {
                            const catResults = groupedResults[cat];
                            if (!catResults || catResults.length === 0) return null;

                            const groupRender = (
                                <div key={cat} className="mb-1">
                                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500">
                                        {CATEGORY_LABELS[cat] || cat}
                                    </p>
                                    <div className="flex flex-col gap-0.5 px-2">
                                        {catResults.map(result => {
                                            const currentIndex = rowIndexCounter++;
                                            return (
                                                <SearchResultRow
                                                    key={result.id || result.url}
                                                    result={result}
                                                    isHighlighted={currentIndex === highlightIndex}
                                                    onSelect={onSelect}
                                                    onMouseEnter={() => onHighlight(currentIndex)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                            return groupRender;
                        })}
                    </div>
                )}

                {!loading && query.length > 0 && (
                    <button
                        onMouseDown={(e) => { e.preventDefault(); onSeeAll(); }}
                        className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-[#92BCEA] hover:text-[#5E7CE2] border-t border-[var(--border-color)] transition-colors"
                    >
                        See all results for "{query}" <ArrowRight size={14} />
                    </button>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
