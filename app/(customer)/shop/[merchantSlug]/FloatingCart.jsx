'use client';

import { ShoppingCart, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingCart({ count, total, savings, items, customer, onClear, primaryColor = '#3b82f6', secondaryColor = '#4f46e5' }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Don't render until there's at least 1 item
    if (count === 0) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-[92px] md:bottom-0 left-0 w-full z-40 px-4 md:px-0"
            >
                <div 
                    className="text-white px-4 py-3 md:px-6 md:py-4 flex items-center justify-between rounded-2xl md:rounded-t-3xl md:rounded-b-none transition-all duration-300"
                    style={{ 
                        background: isDark ? `linear-gradient(135deg, ${primaryColor}E6, ${secondaryColor}E6)` : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        boxShadow: `0 12px 40px ${primaryColor}50`,
                        backdropFilter: 'blur(16px)'
                    }}
                >
                    {/* Cart Info */}
                    <div className="flex items-center gap-3">
                        <motion.div 
                            key={count} 
                            initial={{ scale: 0.8, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 10, stiffness: 300 }}
                            className="p-2.5 rounded-xl relative bg-white/10 border border-white/20 backdrop-blur-md"
                        >
                            <ShoppingCart size={22} className="text-white drop-shadow-md" />
                            <motion.span 
                                key={count}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 500, delay: 0.1 }}
                                className="absolute -top-2 -right-2 w-[18px] h-[18px] rounded-full bg-white text-[10px] font-black flex items-center justify-center shadow-lg" 
                                style={{ color: primaryColor }}
                            >
                                {count}
                            </motion.span>
                        </motion.div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black tracking-widest uppercase opacity-80" style={{ color: 'white' }}>
                                {count} item{count !== 1 ? 's' : ''} added
                            </span>
                            <div className="flex items-center gap-2">
                                <motion.span 
                                    key={total}
                                    initial={{ y: 5, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-xl font-black tracking-tight leading-none text-white drop-shadow-sm mt-0.5"
                                >
                                    ₹{((total || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </motion.span>
                                {savings > 0 && (
                                    <span className="bg-emerald-500/90 border border-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm">
                                        Save ₹{(savings / 100).toLocaleString('en-IN')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Checkout CTA */}
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push('/shop/cart')}
                        className="bg-white px-5 py-3 rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-xl"
                        style={{ color: primaryColor }}
                    >
                        Review
                        <motion.div
                            animate={{ x: [0, 4, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        >
                            <ChevronRight size={16} strokeWidth={3} />
                        </motion.div>
                    </motion.button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
