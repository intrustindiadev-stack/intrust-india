'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * CustomerBreadcrumbs component
 * Provides accessible, responsive navigation breadcrumbs with high-contrast light & dark theme styling.
 * 
 * @param {Array<{ label: string, href?: string }>} items - List of breadcrumb items
 * @param {string} className - Optional container styling
 */
export default function CustomerBreadcrumbs({ items = [], className = '' }) {
    if (!items || items.length === 0) return null;

    return (
        <motion.nav 
            aria-label="Breadcrumb"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex items-center flex-wrap gap-1.5 text-xs font-semibold mb-6 ${className}`}
        >
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low/90 dark:bg-surface-container-low/70 border border-outline-variant/30 dark:border-white/10 shadow-xs backdrop-blur-sm max-w-full overflow-hidden">
                {/* Home Anchor */}
                <Link
                    href="/dashboard"
                    title="Dashboard"
                    className="flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors p-0.5 rounded-md focus-visible:ring-2 focus-visible:ring-primary outline-none shrink-0"
                >
                    <Home size={14} className="stroke-[2.2]" />
                    <span className="sr-only">Home</span>
                </Link>

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <React.Fragment key={index}>
                            <ChevronRight size={12} className="text-outline shrink-0 opacity-80" />
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className="text-on-surface-variant hover:text-primary transition-colors truncate max-w-[130px] sm:max-w-[180px] focus-visible:ring-2 focus-visible:ring-primary rounded px-0.5 outline-none font-semibold"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span 
                                    className="text-primary dark:text-blue-400 font-bold truncate max-w-[160px] sm:max-w-[280px]"
                                    aria-current={isLast ? 'page' : undefined}
                                >
                                    {item.label}
                                </span>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </motion.nav>
    );
}
