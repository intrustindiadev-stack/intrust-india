'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PackageX } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

const OutOfStockBanner = ({ count, onRemoveAll }) => {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                className="p-4 rounded-2xl flex items-start gap-3 bg-red-500 text-white shadow-lg overflow-hidden"
            >
                <div className="p-2 bg-white/20 rounded-xl mt-0.5">
                    <PackageX size={18} strokeWidth={3} />
                </div>
                
                <div className="flex-1">
                    <h3 className="text-sm font-black uppercase tracking-tight">Items Unavailable</h3>
                    <p className="text-[11px] font-bold opacity-90 leading-relaxed mt-0.5">
                        {count > 0 ? `${count} item${count !== 1 ? 's' : ''} in your cart are no longer available. ` : 'Some items in your cart are no longer available. '}
                        Please remove them to continue.
                    </p>
                </div>

                {onRemoveAll && (
                    <button
                        onClick={onRemoveAll}
                        className="ml-auto shrink-0 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-white/40 hover:bg-white/10 transition-colors"
                    >
                        Remove all unavailable
                    </button>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default OutOfStockBanner;
