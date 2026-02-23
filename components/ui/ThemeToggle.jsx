'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 dark:bg-white/5 dark:border-white/10 flex items-center justify-center hover:bg-[#D4AF37]/10 group transition-all duration-300"
            aria-label="Toggle Theme"
        >
            <motion.div
                initial={false}
                animate={{
                    rotate: theme === 'dark' ? 0 : 180,
                    opacity: theme === 'dark' ? 1 : 0,
                    scale: theme === 'dark' ? 1 : 0.5
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
                <span className="material-icons-round text-slate-400 group-hover:text-[#D4AF37] transition-colors leading-none">dark_mode</span>
            </motion.div>

            <motion.div
                initial={false}
                animate={{
                    rotate: theme === 'light' ? 0 : -180,
                    opacity: theme === 'light' ? 1 : 0,
                    scale: theme === 'light' ? 1 : 0.5
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
                <span className="material-icons-round text-slate-400 group-hover:text-[#D4AF37] transition-colors leading-none">light_mode</span>
            </motion.div>
        </button>
    );
}
