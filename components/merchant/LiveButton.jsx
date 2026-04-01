'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function LiveButton() {
    const [tooltip, setTooltip] = useState(false);

    return (
        <div className="relative">
            <motion.div
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setTooltip(true)}
                onHoverEnd={() => setTooltip(false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full border border-emerald-100 dark:border-emerald-800/30 shadow-sm transition-all hover:scale-105 cursor-default select-none"
            >
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    Live
                </span>
            </motion.div>

            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 whitespace-nowrap bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg shadow-xl pointer-events-none"
                    >
                        Dashboard is live & syncing
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
