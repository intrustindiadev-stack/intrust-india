'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] select-none"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {/* Light mode active -> Show Moon icon to indicate switching to Dark */}
            <motion.div
                initial={false}
                animate={{
                    rotate: isDark ? 90 : 0,
                    opacity: isDark ? 0 : 1,
                    scale: isDark ? 0.5 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
                <span className="material-icons-round text-xl leading-none text-slate-600 dark:text-slate-300">
                    dark_mode
                </span>
            </motion.div>

            {/* Dark mode active -> Show Sun icon to indicate switching to Light */}
            <motion.div
                initial={false}
                animate={{
                    rotate: isDark ? 0 : -90,
                    opacity: isDark ? 1 : 0,
                    scale: isDark ? 1 : 0.5,
                }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
                <span className="material-icons-round text-xl leading-none text-[#D4AF37]">
                    light_mode
                </span>
            </motion.div>
        </button>
    );
}

