'use client';

import { useState } from 'react';
import { Search, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function ShopHubClient({ categories }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative z-10">
            {/* Premium Search Bar */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.4 }}
                className="relative group mb-8"
            >
                <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl blur-xl group-focus-within:bg-blue-500/15 transition-all duration-300 pointer-events-none" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 group-focus-within:text-blue-500 transition-colors z-10" size={20} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products, brands and categories..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#12151c] border border-slate-200 dark:border-white/[0.06] shadow-sm focus:shadow-md focus:shadow-blue-500/5 focus:border-blue-500/50 dark:focus:border-blue-500/30 outline-none font-bold text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-white/20 transition-all text-slate-900 dark:text-white relative z-0"
                />
            </motion.div>

            {/* Shop by Category Header */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-blue-500" />
                        Explore Categories
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-white/30 mt-1">Discover what you need today</p>
                </div>
                <button className="text-[11px] md:text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors">
                    See All <ChevronRight size={14} />
                </button>
            </div>

            {/* Category Grid */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 block sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5"
            >
                {filtered.length === 0 ? (
                    <div className="col-span-full py-12 text-center">
                        <p className="text-slate-500 dark:text-white/40 font-bold mb-2">No categories found matching "{searchQuery}"</p>
                    </div>
                ) : (
                    filtered.map((cat) => {
                        // Fallback gentle colors if none exist
                        const color1 = cat.color_primary || '#cbd5e1';
                        const color2 = cat.color_secondary || '#f1f5f9';

                        return (
                            <motion.div key={cat.id} variants={itemVariants}>
                                <Link
                                    href={`/shop/${cat.name.toLowerCase()}`}
                                    className="group flex flex-col h-full bg-white dark:bg-[#12151c] border border-slate-100 dark:border-white/[0.04] rounded-[1.25rem] md:rounded-3xl p-3 md:p-4 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    {/* Top Glow & Highlights */}
                                    <div className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(90deg, transparent, ${color1}, transparent)` }} />
                                    
                                    {/* Subtle Radial Glow */}
                                    <div 
                                        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-[0.15] dark:group-hover:opacity-[0.1] blur-2xl transition-opacity duration-500 pointer-events-none"
                                        style={{ backgroundColor: color1 }}
                                    />

                                    {/* Category Image Wrapper */}
                                    <div className="relative w-full aspect-square rounded-2xl mb-4 overflow-hidden flex items-center justify-center p-3">
                                        <div 
                                            className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08] transition-opacity duration-300"
                                            style={{
                                                background: `linear-gradient(135deg, ${color1}, ${color2})`,
                                            }}
                                        />
                                        
                                        {cat.image_url ? (
                                            <img
                                                src={cat.image_url}
                                                alt={cat.name}
                                                className="w-full h-full object-contain relative z-10 mix-blend-multiply dark:mix-blend-normal transform group-hover:scale-[1.15] group-hover:rotate-2 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center relative z-10 opacity-50 dark:opacity-30">
                                                <span className="text-4xl sm:text-5xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                                                    {cat.name === 'Electronics' ? '📱' :
                                                     cat.name === 'Groceries' ? '🥬' :
                                                     cat.name === 'Fashion' ? '👗' :
                                                     cat.name === 'Beauty' ? '💄' :
                                                     cat.name === 'Home' ? '🏠' :
                                                     cat.name === 'Health' ? '💊' :
                                                     cat.name === 'Sports' ? '⚽' :
                                                     cat.name === 'Toys' ? '🧸' : '📦'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Category Text & Action */}
                                    <div className="mt-auto flex items-end justify-between">
                                        <div>
                                            <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white/90 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                                {cat.name}
                                            </h3>
                                            <p className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-white/30 mt-1 uppercase tracking-wider">
                                                {cat.item_count || 'Explore'}
                                            </p>
                                        </div>
                                        
                                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/[0.04] flex items-center justify-center text-slate-400 dark:text-white/30 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shrink-0 transform group-hover:-translate-x-1">
                                            <ChevronRight size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })
                )}
            </motion.div>
        </div>
    );
}
