'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const startPage = Math.max(2, page - 1);
        const endPage = Math.min(totalPages - 1, page + 1);

        // Always show page 1
        pages.push(
            <button
                key={1}
                onClick={() => onPageChange(1)}
                className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                    page === 1
                        ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white'
                        : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA]'
                }`}
            >
                1
            </button>
        );

        if (startPage > 2) {
            pages.push(<span key="dots-1" className="px-1 text-[var(--text-secondary)]">...</span>);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                        page === i
                            ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white'
                            : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA]'
                    }`}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalPages - 1) {
            pages.push(<span key="dots-2" className="px-1 text-[var(--text-secondary)]">...</span>);
        }

        // Always show last page
        if (totalPages > 1) {
            pages.push(
                <button
                    key={totalPages}
                    onClick={() => onPageChange(totalPages)}
                    className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                        page === totalPages
                            ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white'
                            : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA]'
                    }`}
                >
                    {totalPages}
                </button>
            );
        }

        return pages;
    };

    const handlePrev = () => {
        if (page > 1) {
            onPageChange(page - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleNext = () => {
        if (page < totalPages) {
            onPageChange(page + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex items-center justify-center gap-1 flex-wrap">
            <button
                onClick={handlePrev}
                disabled={page === 1}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA] disabled:opacity-40 disabled:hover:border-[var(--border-color)] transition-all"
            >
                <ChevronLeft size={18} />
            </button>

            {renderPageNumbers()}

            <button
                onClick={handleNext}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#92BCEA] disabled:opacity-40 disabled:hover:border-[var(--border-color)] transition-all"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}
