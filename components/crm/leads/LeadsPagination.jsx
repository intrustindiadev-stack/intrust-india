'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function LeadsPagination({ 
    currentPage, 
    totalPages, 
    totalItems, 
    pageSize, 
    onPageChange 
}) {
    if (totalItems === 0) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
            <p className="text-sm text-gray-500 font-medium text-center sm:text-left">
                Showing <span className="font-bold text-gray-900">{startItem}</span> to <span className="font-bold text-gray-900">{endItem}</span> of <span className="font-bold text-gray-900">{totalItems}</span> results
            </p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-700 px-3">
                        {currentPage} <span className="text-gray-400 font-medium mx-1">/</span> {totalPages}
                    </span>
                </div>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
