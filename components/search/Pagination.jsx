'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared Pagination component.
 *
 * Props:
 *   page          – current page (1-indexed)
 *   totalPages    – total number of pages
 *   onPageChange  – (newPage: number) => void
 *   totalCount    – (optional) total record count; enables "Showing X–Y of N" summary
 *   pageSize      – (optional) records per page; required alongside totalCount for summary
 *   className     – (optional) extra classes for the outer wrapper div
 */
export default function Pagination({ page, totalPages, onPageChange, totalCount, pageSize, className = '' }) {
    if (totalPages <= 1) return null;

    // Scroll to top and notify parent of page change
    const changePage = (newPage) => {
        onPageChange(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderPageNumbers = () => {
        const pages = [];
        const startPage = Math.max(2, page - 1);
        const endPage = Math.min(totalPages - 1, page + 1);

        // Always show page 1
        pages.push(
            <button
                key={1}
                onClick={() => changePage(1)}
                aria-label="Go to page 1"
                aria-current={page === 1 ? 'page' : undefined}
                className={`w-11 h-11 rounded-full text-sm font-bold transition-all flex items-center justify-center ${
                    page === 1
                        ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-md'
                        : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA]'
                }`}
            >
                1
            </button>
        );

        if (startPage > 2) {
            pages.push(<span key="dots-1" className="px-1 text-[var(--text-secondary)] self-center">…</span>);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => changePage(i)}
                    aria-label={`Go to page ${i}`}
                    aria-current={page === i ? 'page' : undefined}
                    className={`w-11 h-11 rounded-full text-sm font-bold transition-all flex items-center justify-center ${
                        page === i
                            ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-md'
                            : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA]'
                    }`}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalPages - 1) {
            pages.push(<span key="dots-2" className="px-1 text-[var(--text-secondary)] self-center">…</span>);
        }

        // Always show last page
        if (totalPages > 1) {
            pages.push(
                <button
                    key={totalPages}
                    onClick={() => changePage(totalPages)}
                    aria-label={`Go to last page (${totalPages})`}
                    aria-current={page === totalPages ? 'page' : undefined}
                    className={`w-11 h-11 rounded-full text-sm font-bold transition-all flex items-center justify-center ${
                        page === totalPages
                            ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-md'
                            : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA]'
                    }`}
                >
                    {totalPages}
                </button>
            );
        }

        return pages;
    };

    // Optional result summary: "Showing 21–40 of 135 results"
    const showSummary = totalCount != null && pageSize != null && totalCount > 0;
    const rangeStart = (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, totalCount);

    return (
        <nav aria-label="Pagination" className={`flex flex-col items-center gap-3 ${className}`}>
            {showSummary && (
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Showing{' '}
                    <span className="font-bold text-[var(--text-primary)]">{rangeStart}</span>
                    {' '}–{' '}
                    <span className="font-bold text-[var(--text-primary)]">{rangeEnd}</span>
                    {' '}of{' '}
                    <span className="font-bold text-[var(--text-primary)]">{totalCount}</span>
                    {' '}results
                </p>
            )}

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <button
                    onClick={() => changePage(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                    className="w-11 h-11 rounded-full flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA] disabled:opacity-40 disabled:hover:border-[var(--border-color)] transition-all"
                >
                    <ChevronLeft size={18} />
                </button>

                {renderPageNumbers()}

                <button
                    onClick={() => changePage(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Next page"
                    className="w-11 h-11 rounded-full flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA] disabled:opacity-40 disabled:hover:border-[var(--border-color)] transition-all"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </nav>
    );
}
