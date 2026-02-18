'use client';

import { useState } from 'react';
import { Search, Mic, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
<<<<<<< HEAD
import { useLanguage } from '@/lib/i18n/LanguageContext';
=======
>>>>>>> origin/yogesh-final
import { useRouter } from 'next/navigation';

export default function HeroSearch() {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
<<<<<<< HEAD
    const { t } = useLanguage();
=======
>>>>>>> origin/yogesh-final
    const router = useRouter();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            // Basic search routing - adjust the path as needed for your application
            router.push(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const suggestions = [
        { label: 'Personal Loan', type: 'loan' },
        { label: 'Amazon Gift Card', type: 'gift' },
        { label: 'Mobile Recharge', type: 'recharge' },
        { label: 'Pay Electricity Bill', type: 'bill' }
    ];

    return (
        <div className="relative w-full max-w-[720px] mx-auto z-50">
            <form onSubmit={handleSearch} className="relative group">
                <motion.div
                    animate={{
                        boxShadow: isFocused
                            ? '0 10px 40px -10px rgba(146, 188, 234, 0.4)'
                            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        scale: isFocused ? 1.01 : 1
                    }}
                    transition={{ duration: 0.2 }}
                    className={`
            flex items-center w-full h-16 px-6 
            bg-white rounded-full 
            border transition-colors duration-300
            ${isFocused ? 'border-[#92BCEA]/50' : 'border-white/80'}
          `}
                >
                    {/* Search Icon */}
                    <Search
                        className={`w-6 h-6 mr-4 transition-colors ${isFocused ? 'text-[#92BCEA]' : 'text-gray-400'}`}
                        strokeWidth={2}
                    />

                    {/* Input */}
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        placeholder="Search loans, gift cards, recharge, shopping..."
                        className="flex-1 h-full bg-transparent outline-none text-lg text-gray-700 placeholder:text-gray-400 font-medium"
                    />

                    {/* Right Actions */}
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                        <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-[#171A21] hover:bg-gray-50 rounded-full transition-all"
                            aria-label="Voice Search"
                        >
                            <Mic size={22} />
                        </button>

                        <button
                            type="submit"
                            className="
                flex items-center justify-center w-10 h-10 
                bg-[#3B82F6] text-white rounded-full 
                shadow-lg shadow-blue-500/30
                hover:bg-[#2563EB] hover:scale-105 active:scale-95
                transition-all duration-200
              "
                            aria-label="Search"
                        >
                            <ArrowRight size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </motion.div>
            </form>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
                {isFocused && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: 10, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-6 right-6 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                        <div className="py-2">
                            <div className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Popular Searches
                            </div>
                            {suggestions.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setQuery(item.label);
                                        router.push(`/search?q=${encodeURIComponent(item.label)}`);
                                    }}
                                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-blue-50/50 text-left transition-colors group"
                                >
                                    <Search size={16} className="text-gray-400 group-hover:text-blue-500" />
                                    <span className="text-gray-700 group-hover:text-blue-600">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
