'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ totalCount, pageSize, currentPage, onPageChange }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const totalPages = Math.ceil(totalCount / pageSize);

    if (totalPages <= 1) return null;

    const createPageUrl = (pageNumber) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    const handleClick = (e, pageNum) => {
        if (onPageChange) {
            e.preventDefault();
            onPageChange(pageNum);
        }
    };

    return (
        <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c0e16]/80 backdrop-blur-md px-4 py-3 sm:px-6 rounded-2xl shadow-xs mt-8">
            {/* Mobile View: Compact ←  2 / 8  → */}
            <div className="flex flex-1 items-center justify-between sm:hidden">
                <Link
                    href={currentPage > 1 ? createPageUrl(currentPage - 1) : '#'}
                    onClick={(e) => handleClick(e, currentPage - 1)}
                    aria-label="Go to previous page"
                    className={`relative inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151822] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all ${
                        currentPage <= 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95'
                    }`}
                >
                    <ChevronLeft size={16} />
                    <span>Prev</span>
                </Link>

                <div className="text-xs font-black text-slate-800 dark:text-slate-200 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5">
                    {currentPage} / {totalPages}
                </div>

                <Link
                    href={currentPage < totalPages ? createPageUrl(currentPage + 1) : '#'}
                    onClick={(e) => handleClick(e, currentPage + 1)}
                    aria-label="Go to next page"
                    className={`relative inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151822] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all ${
                        currentPage >= totalPages ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95'
                    }`}
                >
                    <span>Next</span>
                    <ChevronRight size={16} />
                </Link>
            </div>

            {/* Desktop View: ← Previous   1  2  3  4   Next → */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Showing <span className="font-black text-slate-900 dark:text-white">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                        <span className="font-black text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                        <span className="font-black text-slate-900 dark:text-white">{totalCount}</span> products
                    </p>
                </div>
                <div>
                    <div className="inline-flex items-center gap-1" role="navigation" aria-label="Desktop pagination">
                        <Link
                            href={currentPage > 1 ? createPageUrl(currentPage - 1) : '#'}
                            onClick={(e) => handleClick(e, currentPage - 1)}
                            aria-label="Previous page"
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151822] text-slate-700 dark:text-slate-300 transition-all ${
                                currentPage <= 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-50 dark:hover:bg-white/5 hover:border-sky-500 active:scale-95'
                            }`}
                        >
                            <ChevronLeft size={14} />
                            <span>Previous</span>
                        </Link>
                        
                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                const isCurrent = page === currentPage;
                                return (
                                    <Link
                                        key={page}
                                        href={createPageUrl(page)}
                                        onClick={(e) => handleClick(e, page)}
                                        aria-current={isCurrent ? 'page' : undefined}
                                        className={`inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition-all ${
                                            isCurrent
                                                ? 'bg-sky-500 text-white font-black shadow-xs shadow-sky-500/30 pointer-events-none'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95'
                                        }`}
                                    >
                                        {page}
                                    </Link>
                                );
                            }
                            
                            // Ellipsis
                            if (page === currentPage - 2 || page === currentPage + 2) {
                                return (
                                    <span
                                        key={page}
                                        className="inline-flex items-center justify-center w-6 h-8 text-xs font-bold text-slate-400 dark:text-slate-600"
                                    >
                                        …
                                    </span>
                                );
                            }
                            
                            return null;
                        })}

                        <Link
                            href={currentPage < totalPages ? createPageUrl(currentPage + 1) : '#'}
                            onClick={(e) => handleClick(e, currentPage + 1)}
                            aria-label="Next page"
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151822] text-slate-700 dark:text-slate-300 transition-all ${
                                currentPage >= totalPages ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-50 dark:hover:bg-white/5 hover:border-sky-500 active:scale-95'
                            }`}
                        >
                            <span>Next</span>
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

